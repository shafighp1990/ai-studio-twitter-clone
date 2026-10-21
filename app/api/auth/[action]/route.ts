import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import {
  all,
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
import {
  assurance,
  base32,
  encryptSecret,
  factors,
  logout,
  newSession,
  requireSession,
  session,
  verifyFactor,
} from "@/lib/cloudflare/auth";
export const dynamic = "force-dynamic";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;
    if (action === "assurance")
      return json({ data: await assurance(), error: null });
    if (action === "factors")
      return json({ data: await factors(), error: null });
    if (action === "session") {
      const s = await session();
      return json({
        data: { user: s ? { id: s.user_id } : null },
        error: null,
      });
    }
    throw new HttpError("Not found", 404);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(
  req: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    sameOrigin(req);
    const { action } = await params;
    const b = await body(req);
    const ip = req.headers.get("cf-connecting-ip") ?? "local";
    await limit("auth:" + ip, 60, 300);
    if (action === "login" || action === "register") {
      const email = String(b.email ?? "")
          .trim()
          .toLowerCase(),
        password = String(b.password ?? "");
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 254 ||
        password.length < 8 ||
        new TextEncoder().encode(password).length > 72
      )
        throw new HttpError("Invalid credentials");
      await limit("login:" + email, 15, 300);
      if (action === "login") {
        const u = await one<{
          id: string;
          password_hash: string;
          disabled: number;
          auth_version: number;
        }>(
          "SELECT id,password_hash,disabled,auth_version FROM users WHERE email=?",
          email,
        );
        const valid = await bcrypt.compare(
          password,
          u?.password_hash ??
            "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
        );
        if (!u || !valid || u.disabled)
          throw new HttpError("Invalid credentials", 401);
        await logout();
        await newSession(u.id, 1, u.auth_version);
        return json({ data: { session: true }, error: null });
      }
      const username = String(b.options?.data?.username ?? ""),
        name = String(b.options?.data?.name ?? "").trim();
      if (
        !/^[a-z0-9_]{3,30}$/.test(username) ||
        !name ||
        name.length > 50 ||
        [
          "admin",
          "login",
          "register",
          "meet",
          "meetings",
          "api",
          "auth",
          "explore",
          "notifications",
          "bookmarks",
          "profile",
          "settings",
          "post",
        ].includes(username)
      )
        throw new HttpError("Invalid profile");
      if (
        (await one("SELECT id FROM users WHERE email=?", email)) ||
        (await one("SELECT id FROM profiles WHERE username=?", username))
      )
        throw new HttpError("Account already exists", 409);
      const id = crypto.randomUUID(),
        hash = await bcrypt.hash(password, 12);
      const d = await db();
      await d.batch([
        d
          .prepare("INSERT INTO users(id,email,password_hash) VALUES(?,?,?)")
          .bind(id, email, hash),
        d
          .prepare("INSERT INTO profiles(id,username,name) VALUES(?,?,?)")
          .bind(id, username, name),
      ]);
      await logout();
      await newSession(id);
      return json({ data: { session: true }, error: null });
    }
    if (action === "logout") {
      await logout();
      return json({ data: {}, error: null });
    }
    if (action === "refresh")
      return json({ data: await assurance(), error: null });
    const s = await requireSession(true);
    if (action === "change-password") {
      const a = await assurance();
      if (a.nextLevel === "aal2" && a.currentLevel !== "aal2")
        throw new HttpError("Verify your authenticator first", 403);
      await limit("password-change:" + s.user_id, 8, 300);
      const password = String(b.newPassword ?? ""),
        current = String(b.currentPassword ?? "");
      if (
        password.length < 12 ||
        new TextEncoder().encode(password).length > 72 ||
        password === current
      )
        throw new HttpError("Use a different password, 12–72 bytes long");
      const u = await one<{ password_hash: string }>(
        "SELECT password_hash FROM users WHERE id=?",
        s.user_id,
      );
      if (!u || !(await bcrypt.compare(current, u.password_hash)))
        throw new HttpError("Current password is incorrect", 403);
      const hash = await bcrypt.hash(password, 12),
        d = await db();
      const result = await d.batch([
        d
          .prepare(
            "UPDATE users SET password_hash=?,must_change_password=0,auth_version=auth_version+1 WHERE id=? AND auth_version=? AND disabled=0",
          )
          .bind(hash, s.user_id, s.auth_version),
        d.prepare("DELETE FROM sessions WHERE user_id=?").bind(s.user_id),
        d.prepare("DELETE FROM participants WHERE user_id=?").bind(s.user_id),
      ]);
      if (result[0].meta.changes !== 1)
        throw new HttpError("Sign in again", 401);
      await newSession(s.user_id, s.aal, s.auth_version + 1);
      return json({
        data: { redirect: s.is_admin ? "/admin" : "/" },
        error: null,
      });
    }
    if (action === "enroll") {
      await requireSession();
      const current = await all(
        "SELECT id FROM mfa_factors WHERE user_id=?",
        s.user_id,
      );
      if (current.length >= 3) throw new HttpError("Too many factors");
      const id = crypto.randomUUID(),
        secret = base32(crypto.getRandomValues(new Uint8Array(20)));
      const encrypted = await encryptSecret(secret);
      await run(
        "INSERT INTO mfa_factors(id,user_id,secret) VALUES(?,?,?)",
        id,
        s.user_id,
        encrypted,
      );
      const u = await one<{ email: string }>(
        "SELECT email FROM users WHERE id=?",
        s.user_id,
      );
      const uri = `otpauth://totp/Arrisches:${encodeURIComponent(u?.email ?? s.user_id)}?secret=${secret}&issuer=Arrisches&digits=6&period=30`;
      return json({
        data: {
          id,
          friendly_name: "Authenticator",
          totp: { secret, qr_code: await QRCode.toDataURL(uri) },
        },
        error: null,
      });
    }
    if (action === "verify") {
      await limit("totp:" + s.user_id, 10, 300);
      await verifyFactor(s, String(b.factorId), String(b.code));
      return json({ data: {}, error: null });
    }
    if (action === "unenroll") {
      const f = await one<{ verified: number }>(
        "SELECT verified FROM mfa_factors WHERE id=? AND user_id=?",
        String(b.factorId),
        s.user_id,
      );
      if (!f) throw new HttpError("Not found", 404);
      if (
        f.verified &&
        (s.aal < 2 ||
          !s.mfa_verified_at ||
          s.mfa_verified_at < Date.now() - 120000)
      )
        throw new HttpError("Fresh verification required", 403);
      await run(
        "DELETE FROM mfa_factors WHERE id=? AND user_id=?",
        String(b.factorId),
        s.user_id,
      );
      return json({ data: {}, error: null });
    }
    throw new HttpError("Not found", 404);
  } catch (e) {
    return failure(e);
  }
}
