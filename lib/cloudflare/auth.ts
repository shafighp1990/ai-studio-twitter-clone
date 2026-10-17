import "server-only";
import { cookies } from "next/headers";
import { all, db, digest, env, HttpError, one, run, token } from "./db";
export type Session = {
  id: string;
  user_id: string;
  aal: number;
  expires_at: number;
  mfa_verified_at: number | null;
};
export const SESSION_COOKIE = "arr_session";
export async function session(allowPending = false): Promise<Session | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const s = await one<Session>(
    "SELECT * FROM sessions WHERE id=? AND expires_at>?",
    await digest(raw),
    Date.now(),
  );
  if (!s) return null;
  if (
    !allowPending &&
    s.aal < 2 &&
    (await one(
      "SELECT id FROM mfa_factors WHERE user_id=? AND verified=1",
      s.user_id,
    ))
  )
    return null;
  return s;
}
export async function requireSession(allowPending = false) {
  const s = await session(allowPending);
  if (!s) throw new HttpError("Sign in required", 401);
  return s;
}
export async function newSession(userId: string, aal = 1) {
  const raw = token();
  const id = await digest(raw);
  await run(
    "INSERT INTO sessions(id,user_id,aal,expires_at,mfa_verified_at) VALUES(?,?,?,?,?)",
    id,
    userId,
    aal,
    Date.now() + 30 * 86400000,
    aal === 2 ? Date.now() : null,
  );
  (await cookies()).set(SESSION_COOKIE, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86400,
  });
  return id;
}
export async function logout() {
  const s = await session(true);
  if (s) await run("DELETE FROM sessions WHERE id=?", s.id);
  (await cookies()).delete(SESSION_COOKIE);
}
export async function assurance() {
  const s = await session(true);
  const has = s
    ? await one(
        "SELECT id FROM mfa_factors WHERE user_id=? AND verified=1",
        s.user_id,
      )
    : null;
  return {
    currentLevel: s ? (s.aal === 2 ? "aal2" : "aal1") : null,
    nextLevel: s ? (has ? "aal2" : "aal1") : null,
  };
}
export type Factor = {
  id: string;
  user_id: string;
  secret: string;
  verified: number;
  last_step: number;
  friendly_name: string;
};
export async function factors() {
  const s = await requireSession(true);
  const rows = await all<Factor>(
    "SELECT * FROM mfa_factors WHERE user_id=?",
    s.user_id,
  );
  const safe = rows.map((r) => ({
    id: r.id,
    friendly_name: r.friendly_name,
    factor_type: "totp",
    status: r.verified ? "verified" : "unverified",
  }));
  return { all: safe, totp: safe.filter((r) => r.status === "verified") };
}
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32(bytes: Uint8Array) {
  let bits = 0,
    v = 0,
    out = "";
  for (const b of bytes) {
    v = (v << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(v >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) out += alphabet[(v << (5 - bits)) & 31];
  return out;
}
function unbase32(value: string) {
  let bits = 0,
    v = 0;
  const out = [];
  for (const c of value.replace(/=+$/, "")) {
    const n = alphabet.indexOf(c);
    if (n < 0) throw new Error("Invalid TOTP secret");
    v = (v << 5) | n;
    bits += 5;
    if (bits >= 8) {
      out.push((v >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}
async function cipherKey() {
  const e = (await env()) as CloudflareEnv & { AUTH_ENCRYPTION_KEY: string };
  if (!e.AUTH_ENCRYPTION_KEY) throw new Error("Auth encryption key missing");
  return crypto.subtle.importKey(
    "raw",
    Buffer.from(e.AUTH_ENCRYPTION_KEY, "base64"),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptSecret(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await cipherKey(),
    new TextEncoder().encode(value),
  );
  return (
    Buffer.from(iv).toString("base64") +
    "." +
    Buffer.from(encrypted).toString("base64")
  );
}
async function decryptSecret(value: string) {
  const [iv, data] = value.split(".");
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: Buffer.from(iv, "base64") },
      await cipherKey(),
      Buffer.from(data, "base64"),
    ),
  );
}
export async function verifyFactor(s: Session, id: string, code: string) {
  if (!/^\d{6}$/.test(code))
    throw new HttpError("Invalid code", 400, "invalid_mfa_code");
  const f = await one<Factor>(
    "SELECT * FROM mfa_factors WHERE id=? AND user_id=?",
    id,
    s.user_id,
  );
  if (!f) throw new HttpError("Factor not found", 404);
  const secret = await decryptSecret(f.secret);
  const key = await crypto.subtle.importKey(
    "raw",
    unbase32(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const now = Math.floor(Date.now() / 30000);
  for (const step of [now, now - 1, now + 1]) {
    if (step <= f.last_step) continue;
    const msg = new Uint8Array(8);
    new DataView(msg.buffer).setBigUint64(0, BigInt(step));
    const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
    const offset = bytes[19] & 15;
    const n =
      (((bytes[offset] & 127) << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3]) %
      1000000;
    if (String(n).padStart(6, "0") === code) {
      const updated = await run(
        "UPDATE mfa_factors SET verified=1,last_step=? WHERE id=? AND last_step<?",
        step,
        id,
        step,
      );
      if (updated.meta.changes !== 1) break;
      await (
        await db()
      ).batch([
        (await db())
          .prepare("DELETE FROM sessions WHERE user_id=? AND id<>?")
          .bind(s.user_id, s.id),
        (await db()).prepare("DELETE FROM sessions WHERE id=?").bind(s.id),
      ]);
      await newSession(s.user_id, 2);
      return;
    }
  }
  throw new HttpError("Invalid code", 400, "invalid_mfa_code");
}
