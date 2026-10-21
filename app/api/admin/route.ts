import bcrypt from "bcryptjs";
import {
  adminTables,
  requireAdmin,
  type AdminTable,
} from "@/lib/cloudflare/admin";
import {
  all,
  body,
  db,
  env,
  failure,
  HttpError,
  json,
  limit,
  one,
  sameOrigin,
  token,
} from "@/lib/cloudflare/db";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url),
      section = url.searchParams.get("section") ?? "overview";
    if (section === "overview")
      return json({
        counts: await one(
          "SELECT (SELECT count(*) FROM users) AS users,(SELECT count(*) FROM posts) AS posts,(SELECT count(*) FROM rooms WHERE ended=0) AS rooms,(SELECT count(*) FROM users WHERE disabled=1) AS disabled,(SELECT count(*) FROM admin_audit) AS actions",
        ),
        tables: Object.keys(adminTables),
      });
    if (section === "media") {
      const prefix = (url.searchParams.get("q") ?? "").slice(0, 256),
        cursor = url.searchParams.get("cursor") ?? undefined;
      const result = await (
        await env()
      ).MEDIA.list({ limit: 24, prefix, cursor });
      const rows = await Promise.all(
        result.objects.map(async (o) => ({
          key: o.key,
          size: o.size,
          uploaded: o.uploaded.toISOString(),
          url:
            "/api/media/" + o.key.split("/").map(encodeURIComponent).join("/"),
          username:
            (
              await one<{ username: string }>(
                "SELECT username FROM profiles WHERE id=?",
                o.key.split("/")[0],
              )
            )?.username ?? "",
          removed: !!(await one(
            "SELECT key FROM removed_media WHERE key=?",
            o.key,
          )),
        })),
      );
      return json({
        rows,
        nextCursor: result.truncated ? result.cursor : null,
      });
    }
    if (!Object.hasOwn(adminTables, section))
      throw new HttpError("Unknown section", 404);
    const table = section as AdminTable;
    const page = Math.min(
        100000,
        Math.max(0, Math.floor(Number(url.searchParams.get("page")) || 0)),
      ),
      q = (url.searchParams.get("q") ?? "").trim().slice(0, 200);
    const searches: Partial<Record<AdminTable, string>> = {
      users:
        "instr(lower(email||' '||username||' '||name||' '||id),lower(?))>0",
      posts: "instr(lower(content||' '||username||' '||id),lower(?))>0",
      rooms: "instr(lower(title||' '||username||' '||id),lower(?))>0",
      profiles: "instr(lower(name||' '||username||' '||id),lower(?))>0",
    };
    const where = q && searches[table] ? " WHERE " + searches[table] : "",
      args = q && searches[table] ? [q] : [];
    const base = " FROM (" + adminTables[table] + ")" + where;
    const count = await one<{ count: number }>(
      "SELECT count(*) AS count" + base,
      ...args,
    );
    const order = [
      "users",
      "posts",
      "profiles",
      "rooms",
      "admin_audit",
      "removed_media",
      "post_likes",
      "reposts",
      "bookmarks",
      "follows",
      "notifications",
      "signals",
    ].includes(table)
      ? " ORDER BY created_at DESC"
      : "";
    return json({
      rows: await all(
        "SELECT *" + base + order + " LIMIT 40 OFFSET ?",
        ...args,
        page * 40,
      ),
      total: count?.count ?? 0,
      page,
      pageSize: 40,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const s = await requireAdmin();
    await limit("admin:" + s.user_id, 60, 60);
    const b = await body(req),
      action = String(b.action ?? ""),
      id = String(b.id ?? "");
    const d = await db();
    const audit = (target: string, details: Record<string, unknown> = {}) =>
      d
        .prepare(
          "INSERT INTO admin_audit(id,actor_id,action,target_id,details) VALUES(?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          s.user_id,
          action,
          target,
          JSON.stringify(details),
        );
    async function removeMedia(key: string) {
      if (
        !/^[a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+$/.test(key) ||
        key.includes("..") ||
        key.length > 512
      )
        throw new HttpError("Invalid image");
      const path = "/api/media/" + key,
        absolute = new URL(path, req.url).href;
      await d.batch([
        d
          .prepare(
            "INSERT OR IGNORE INTO removed_media(key,removed_by) VALUES(?,?)",
          )
          .bind(key, s.user_id),
        d
          .prepare("UPDATE posts SET image_url=NULL WHERE image_url IN (?,?)")
          .bind(path, absolute),
        d
          .prepare(
            "UPDATE profiles SET avatar_url=NULL WHERE avatar_url IN (?,?)",
          )
          .bind(path, absolute),
        d
          .prepare(
            "UPDATE profiles SET banner_url=NULL WHERE banner_url IN (?,?)",
          )
          .bind(path, absolute),
        audit(key),
      ]);
      await (await env()).MEDIA.delete(key);
      return json({ ok: true });
    }
    if (action === "remove_image")
      return await removeMedia(String(b.key ?? ""));
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new HttpError("Invalid record");
    if (action === "delete_post") {
      const post = await one("SELECT id FROM posts WHERE id=?", id);
      if (!post) throw new HttpError("Post not found", 404);
      await d.batch([
        d.prepare("DELETE FROM posts WHERE id=?").bind(id),
        audit(id),
      ]);
      return json({ ok: true });
    }
    if (action === "end_room") {
      if (!(await one("SELECT id FROM rooms WHERE id=?", id)))
        throw new HttpError("Room not found", 404);
      await d.batch([
        d.prepare("UPDATE rooms SET ended=1 WHERE id=?").bind(id),
        d.prepare("DELETE FROM participants WHERE room_id=?").bind(id),
        audit(id),
      ]);
      return json({ ok: true });
    }
    const user = await one<{ id: string; is_admin: number }>(
      "SELECT id,is_admin FROM users WHERE id=?",
      id,
    );
    if (!user) throw new HttpError("User not found", 404);
    if (action === "remove_profile_image") {
      const field =
        b.field === "avatar_url"
          ? "avatar_url"
          : b.field === "banner_url"
            ? "banner_url"
            : null;
      if (!field) throw new HttpError("Invalid field");
      const p = await one<Record<string, string | null>>(
        `SELECT ${field} FROM profiles WHERE id=?`,
        id,
      );
      const value = p?.[field];
      if (!value) return json({ ok: true });
      const url = new URL(value, req.url);
      if (
        url.origin === new URL(req.url).origin &&
        url.pathname.startsWith("/api/media/")
      )
        return await removeMedia(
          decodeURIComponent(url.pathname.slice("/api/media/".length)),
        );
      await d.batch([
        d.prepare(`UPDATE profiles SET ${field}=NULL WHERE id=?`).bind(id),
        audit(id, { field }),
      ]);
      return json({ ok: true });
    }
    if (
      ![
        "reset_password",
        "disable_user",
        "enable_user",
        "revoke_sessions",
      ].includes(action)
    )
      throw new HttpError("Unsupported action");
    if (id === s.user_id)
      throw new HttpError(
        "Use your own security settings for this account",
        403,
      );
    if (action === "disable_user" && user.is_admin)
      throw new HttpError(
        "Administrator accounts cannot be suspended here",
        403,
      );
    let temporaryPassword: string | undefined;
    const statements: D1PreparedStatement[] = [];
    if (action === "reset_password") {
      const generatedPassword = token().slice(0, 24);
      temporaryPassword = generatedPassword;
      statements.push(
        d
          .prepare(
            "UPDATE users SET password_hash=?,must_change_password=1,auth_version=auth_version+1 WHERE id=?",
          )
          .bind(await bcrypt.hash(generatedPassword, 12), id),
      );
    } else if (action === "disable_user" || action === "enable_user")
      statements.push(
        d
          .prepare(
            "UPDATE users SET disabled=?,auth_version=auth_version+1 WHERE id=?",
          )
          .bind(action === "disable_user" ? 1 : 0, id),
      );
    else
      statements.push(
        d
          .prepare("UPDATE users SET auth_version=auth_version+1 WHERE id=?")
          .bind(id),
      );
    statements.push(
      d.prepare("DELETE FROM sessions WHERE user_id=?").bind(id),
      d
        .prepare(
          "DELETE FROM participants WHERE user_id=? OR room_id IN (SELECT id FROM rooms WHERE host_id=?)",
        )
        .bind(id, id),
      d.prepare("UPDATE rooms SET ended=1 WHERE host_id=?").bind(id),
      audit(id),
    );
    await d.batch(statements);
    return json({
      ok: true,
      ...(temporaryPassword ? { temporaryPassword } : {}),
    });
  } catch (e) {
    return failure(e);
  }
}
