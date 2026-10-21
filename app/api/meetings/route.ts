import { requireSession } from "@/lib/cloudflare/auth";
import {
  all,
  body,
  digest,
  failure,
  HttpError,
  json,
  limit,
  run,
  sameOrigin,
  token,
} from "@/lib/cloudflare/db";
export async function GET() {
  try {
    const s = await requireSession();
    return json({
      rooms: await all(
        "SELECT id,title,ended,created_at,invite_expires FROM rooms WHERE host_id=? ORDER BY created_at DESC LIMIT 30",
        s.user_id,
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const s = await requireSession();
    await limit("rooms:" + s.user_id, 10, 3600);
    const b = await body(req);
    const title = String(b.title ?? "")
      .trim()
      .slice(0, 100);
    if (!title) throw new HttpError("A meeting title is required");
    const id = crypto.randomUUID(),
      invite = token();
    await run(
      "INSERT INTO rooms(id,host_id,title,invite_hash,invite_expires) VALUES(?,?,?,?,?)",
      id,
      s.user_id,
      title,
      await digest(invite),
      Date.now() + 86400000,
    );
    return json(
      {
        id,
        inviteUrl:
          new URL("/meet/" + id, req.url).origin + "/meet/" + id + "#" + invite,
      },
      201,
    );
  } catch (e) {
    return failure(e);
  }
}
