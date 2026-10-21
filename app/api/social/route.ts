import { requireSession } from "@/lib/cloudflare/auth";
import {
  body,
  db,
  failure,
  HttpError,
  json,
  limit,
  one,
  run,
  sameOrigin,
} from "@/lib/cloudflare/db";
import { parseExternalPostUrl } from "@/lib/external-posts";
function text(v: unknown, max: number) {
  if (typeof v !== "string" || v.length > max)
    throw new HttpError("Invalid value");
  return v.trim();
}
function media(v: unknown, userId: string, origin: string) {
  if (v === null || v === undefined) return null;
  const url = new URL(String(v), origin);
  if (
    url.origin !== origin ||
    !url.pathname.startsWith("/api/media/" + userId + "/")
  )
    throw new HttpError("Invalid image");
  return url.pathname;
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const s = await requireSession();
    await limit("social:" + s.user_id, 120, 60);
    const b = await body(req),
      v = b.values ?? {},
      f = b.filters ?? {},
      origin = new URL(req.url).origin;
    if (b.table === "posts" && b.op === "insert") {
      const content = text(v.content, 280);
      if (!content) throw new HttpError("Empty post");
      const image = media(v.image_url, s.user_id, origin);
      const external = v.external_url
        ? parseExternalPostUrl(String(v.external_url))
        : null;
      if (v.external_url && !external)
        throw new HttpError("Invalid source link");
      const reply = v.reply_to_id ? String(v.reply_to_id) : null;
      const parent = reply
        ? await one<{ author_id: string }>(
            "SELECT author_id FROM posts WHERE id=?",
            reply,
          )
        : null;
      if (reply && !parent) throw new HttpError("Post not found", 404);
      const id = crypto.randomUUID();
      const d = await db();
      const batch = [
        d
          .prepare(
            "INSERT INTO posts(id,author_id,content,image_url,external_platform,external_url,reply_to_id) VALUES(?,?,?,?,?,?,?)",
          )
          .bind(
            id,
            s.user_id,
            content,
            image,
            external?.platform ?? null,
            external?.url ?? null,
            reply,
          ),
      ];
      if (parent && parent.author_id !== s.user_id)
        batch.push(
          d
            .prepare(
              "INSERT INTO notifications(id,recipient_id,actor_id,post_id,type) VALUES(?,?,?,?,'reply')",
            )
            .bind(crypto.randomUUID(), parent.author_id, s.user_id, id),
        );
      await d.batch(batch);
      return json({ data: { id }, error: null });
    }
    if (b.table === "posts" && b.op === "delete") {
      const result = await run(
        "DELETE FROM posts WHERE id=? AND author_id=?",
        String(f.id),
        s.user_id,
      );
      if (!result.meta.changes) throw new HttpError("Post not found", 404);
      return json({ data: null, error: null });
    }
    if (
      ["post_likes", "bookmarks", "reposts"].includes(b.table) &&
      ["insert", "delete"].includes(b.op)
    ) {
      const id = String(b.op === "insert" ? v.post_id : f.post_id);
      const p = await one<{ author_id: string }>(
        "SELECT author_id FROM posts WHERE id=?",
        id,
      );
      if (!p) throw new HttpError("Post not found", 404);
      const table =
        b.table === "post_likes"
          ? "post_likes"
          : b.table === "reposts"
            ? "reposts"
            : "bookmarks";
      const d = await db();
      if (b.op === "delete")
        await run(
          `DELETE FROM ${table} WHERE post_id=? AND user_id=?`,
          id,
          s.user_id,
        );
      else {
        const statements = [
          d
            .prepare(
              `INSERT OR IGNORE INTO ${table}(post_id,user_id) VALUES(?,?)`,
            )
            .bind(id, s.user_id),
        ];
        if (table !== "bookmarks" && p.author_id !== s.user_id)
          statements.push(
            d
              .prepare(
                "INSERT INTO notifications(id,recipient_id,actor_id,post_id,type) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM notifications WHERE recipient_id=? AND actor_id=? AND post_id=? AND type=?)",
              )
              .bind(
                crypto.randomUUID(),
                p.author_id,
                s.user_id,
                id,
                table === "post_likes" ? "like" : "repost",
                p.author_id,
                s.user_id,
                id,
                table === "post_likes" ? "like" : "repost",
              ),
          );
        await d.batch(statements);
      }
      return json({ data: null, error: null });
    }
    if (b.table === "follows" && ["insert", "delete"].includes(b.op)) {
      const target = String(
        b.op === "insert" ? v.following_id : f.following_id,
      );
      if (target === s.user_id) throw new HttpError("Cannot follow yourself");
      if (!(await one("SELECT id FROM profiles WHERE id=?", target)))
        throw new HttpError("Profile not found", 404);
      if (b.op === "delete")
        await run(
          "DELETE FROM follows WHERE follower_id=? AND following_id=?",
          s.user_id,
          target,
        );
      else {
        const d = await db();
        await d.batch([
          d
            .prepare(
              "INSERT OR IGNORE INTO follows(follower_id,following_id) VALUES(?,?)",
            )
            .bind(s.user_id, target),
          d
            .prepare(
              "INSERT INTO notifications(id,recipient_id,actor_id,type) SELECT ?,?,?,'follow' WHERE NOT EXISTS(SELECT 1 FROM notifications WHERE recipient_id=? AND actor_id=? AND type='follow')",
            )
            .bind(crypto.randomUUID(), target, s.user_id, target, s.user_id),
        ]);
      }
      return json({ data: null, error: null });
    }
    if (b.table === "profiles" && b.op === "update") {
      if (f.id !== s.user_id) throw new HttpError("Not allowed", 403);
      const name = text(v.name, 50),
        bio = text(v.bio, 160),
        location = text(v.location, 50),
        website = text(v.website, 100);
      if (!name) throw new HttpError("Name required");
      if (website && !/^https?:\/\//i.test(website))
        throw new HttpError("Website must begin with https://");
      await run(
        "UPDATE profiles SET name=?,bio=?,location=?,website=?,avatar_url=?,banner_url=?,updated_at=? WHERE id=?",
        name,
        bio,
        location,
        website,
        media(v.avatar_url, s.user_id, origin),
        media(v.banner_url, s.user_id, origin),
        new Date().toISOString(),
        s.user_id,
      );
      return json({ data: null, error: null });
    }
    if (b.table === "notifications" && b.op === "update" && v.read === true) {
      const ids = Array.isArray(f.id)
        ? f.id.filter((x: unknown) => typeof x === "string").slice(0, 100)
        : [];
      if (ids.length)
        await run(
          `UPDATE notifications SET read=1 WHERE recipient_id=? AND id IN (${ids.map(() => "?").join(",")})`,
          s.user_id,
          ...ids,
        );
      return json({ data: null, error: null });
    }
    throw new HttpError("Unsupported operation");
  } catch (e) {
    return failure(e);
  }
}
