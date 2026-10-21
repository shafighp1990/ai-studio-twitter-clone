import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
export async function env() {
  return (await getCloudflareContext({ async: true })).env;
}
export async function db() {
  return (await env()).DB;
}
export async function one<T>(sql: string, ...args: (string | number | null)[]) {
  return (await db())
    .prepare(sql)
    .bind(...args)
    .first<T>();
}
export async function all<T>(sql: string, ...args: (string | number | null)[]) {
  return (
    await (
      await db()
    )
      .prepare(sql)
      .bind(...args)
      .all<T>()
  ).results;
}
export async function run(sql: string, ...args: (string | number | null)[]) {
  return (await db())
    .prepare(sql)
    .bind(...args)
    .run();
}
export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "request_failed",
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function failure(e: unknown) {
  if (e instanceof HttpError)
    return json({ error: { message: e.message, code: e.code } }, e.status);
  console.error(
    "Request failed",
    e instanceof Error ? e.message : "Unknown error",
  );
  return json(
    { error: { message: "Request failed", code: "request_failed" } },
    500,
  );
}
export function sameOrigin(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    throw new HttpError("Invalid origin", 403);
}
export async function body(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > 65536)
    throw new HttpError("Request too large", 413);
  const text = await req.text();
  if (text.length > 65536) throw new HttpError("Request too large", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError("Invalid JSON");
  }
}
export async function digest(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Buffer.from(bytes).toString("hex");
}
export function token() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
    "base64url",
  );
}
export async function limit(key: string, max: number, seconds: number) {
  if (Math.random() < 0.01)
    await run("DELETE FROM rate_limits WHERE expires_at<?", Date.now());
  const bucket = Math.floor(Date.now() / 1000 / seconds);
  const id = (await digest(key)) + ":" + bucket;
  const r = await one<{ hits: number }>(
    "INSERT INTO rate_limits (id,hits,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET hits=hits+1 RETURNING hits",
    id,
    Date.now() + seconds * 2000,
  );
  if ((r?.hits ?? max + 1) > max)
    throw new HttpError("Too many requests. Try again later.", 429);
}
