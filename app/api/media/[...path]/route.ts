import { requireSession } from "@/lib/cloudflare/auth";
import {
  body,
  env,
  failure,
  HttpError,
  json,
  limit,
  one,
  sameOrigin,
} from "@/lib/cloudflare/db";
type Ctx = { params: Promise<{ path: string[] }> };
function valid(key: string) {
  return (
    /^[a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+$/.test(key) &&
    !key.includes("..") &&
    key.length < 512
  );
}
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const key = (await params).path.join("/");
    if (await one("SELECT key FROM removed_media WHERE key=?", key))
      throw new HttpError("Not found", 404);
    if (!valid(key)) throw new HttpError("Not found", 404);
    const file = await (await env()).MEDIA.get(key);
    if (!file) throw new HttpError("Not found", 404);
    return new Response(file.body, {
      headers: {
        "Content-Type":
          file.httpMetadata?.contentType ?? "application/octet-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(req: Request, { params }: Ctx) {
  try {
    sameOrigin(req);
    const s = await requireSession();
    await limit("upload:" + s.user_id, 20, 3600);
    const key = (await params).path.join("/");
    if (!valid(key) || !key.startsWith(s.user_id + "/"))
      throw new HttpError("Invalid path", 403);
    if (await one("SELECT key FROM removed_media WHERE key=?", key))
      throw new HttpError("Upload a new file", 403);
    const type = req.headers.get("content-type") ?? "";
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type))
      throw new HttpError("Use JPEG, PNG, WebP or GIF");
    if (Number(req.headers.get("content-length") ?? 0) > 5 * 1024 * 1024)
      throw new HttpError("Image too large", 413);
    const data = await req.arrayBuffer();
    if (data.byteLength > 5 * 1024 * 1024)
      throw new HttpError("Image too large", 413);
    const bytes = new Uint8Array(data);
    const ok =
      type === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216
        : type === "image/png"
          ? bytes[0] === 137 && bytes[1] === 80
          : type === "image/gif"
            ? String.fromCharCode(...bytes.slice(0, 3)) === "GIF"
            : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
              String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    if (!ok) throw new HttpError("Invalid image");
    await (
      await env()
    ).MEDIA.put(key, data, { httpMetadata: { contentType: type } });
    return json({ data: { path: key }, error: null });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request, { params }: Ctx) {
  try {
    sameOrigin(req);
    const s = await requireSession();
    if ((await params).path.join("/") !== "delete")
      throw new HttpError("Not found", 404);
    const b = await body(req);
    if (!Array.isArray(b.paths) || b.paths.length > 10)
      throw new HttpError("Invalid paths");
    for (const key of b.paths) {
      if (
        typeof key !== "string" ||
        !valid(key) ||
        !key.startsWith(s.user_id + "/")
      )
        throw new HttpError("Invalid path", 403);
    }
    await (await env()).MEDIA.delete(b.paths);
    return json({ data: null, error: null });
  } catch (e) {
    return failure(e);
  }
}
