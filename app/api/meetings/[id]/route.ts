import { cookies } from "next/headers";
import { session, requireSession } from "@/lib/cloudflare/auth";
import {
  all,
  body,
  db,
  digest,
  failure,
  HttpError,
  json,
  limit,
  one,
  run,
  sameOrigin,
  token,
} from "@/lib/cloudflare/db";
import {
  iceServers,
  participant,
  roomById,
  roomCookie,
} from "@/lib/cloudflare/meetings";
type Ctx = { params: Promise<{ id: string }> };
export async function GET(req: Request, { params }: Ctx) {
  try {
    const room = await roomById((await params).id);
    const url = new URL(req.url);
    if (url.searchParams.get("state") !== "1") {
      const s = await session();
      return json({
        id: room.id,
        title: room.title,
        ended: !!room.ended,
        isHost: s?.user_id === room.host_id,
      });
    }
    const p = await participant(room);
    if (p.last_seen < Date.now() - 15000)
      await run(
        "UPDATE participants SET last_seen=? WHERE id=?",
        Date.now(),
        p.id,
      );
    const after = Math.max(0, Number(url.searchParams.get("after")) || 0);
    const peers = await all(
      "SELECT id,name,user_id= ? AS isHost FROM participants WHERE room_id=? AND expires_at>? AND last_seen>?",
      room.host_id,
      room.id,
      Date.now(),
      Date.now() - 120000,
    );
    const signals = await all<{ id: number; sender: string; payload: string }>(
      "SELECT id,sender,payload FROM signals WHERE room_id=? AND recipient=? AND id>? ORDER BY id LIMIT 100",
      room.id,
      p.id,
      after,
    );
    return json({
      peers,
      signals: signals.map((s) => ({ ...s, payload: JSON.parse(s.payload) })),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request, { params }: Ctx) {
  try {
    sameOrigin(req);
    const room = await roomById((await params).id),
      b = await body(req);
    if (room.ended) throw new HttpError("Meeting ended", 410);
    const action = b.action;
    if (action === "join") {
      await limit(
        "join:" +
          room.id +
          ":" +
          (req.headers.get("cf-connecting-ip") ?? "local"),
        20,
        300,
      );
      const s = await session();
      const isHost = s?.user_id === room.host_id;
      if (
        !isHost &&
        (room.invite_expires < Date.now() ||
          typeof b.invite !== "string" ||
          (await digest(b.invite)) !== room.invite_hash)
      )
        throw new HttpError("Invitation is invalid or expired", 403);
      const name = String(b.name ?? "")
        .trim()
        .slice(0, 50);
      if (!name) throw new HttpError("Enter your name");
      const ice = await iceServers();
      const old = (await cookies()).get(roomCookie(room.id))?.value;
      let oldId: string | undefined;
      if (old) {
        const [oid, osecret] = old.split(".");
        if (
          osecret &&
          (await one(
            "SELECT id FROM participants WHERE id=? AND room_id=? AND token_hash=?",
            oid,
            room.id,
            await digest(osecret),
          ))
        )
          oldId = oid;
      }
      const id = crypto.randomUUID(),
        secret = token(),
        now = Date.now();
      const d = await db();
      const steps = [
        d
          .prepare(
            "DELETE FROM participants WHERE room_id=? AND (expires_at<? OR last_seen<?)",
          )
          .bind(room.id, now, now - 120000),
      ];
      if (oldId)
        steps.push(
          d.prepare("DELETE FROM participants WHERE id=?").bind(oldId),
        );
      steps.push(
        d
          .prepare(
            "INSERT INTO participants(id,room_id,token_hash,user_id,name,expires_at,last_seen) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM participants WHERE room_id=?)<6 AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND ended=0)",
          )
          .bind(
            id,
            room.id,
            await digest(secret),
            isHost ? s!.user_id : null,
            name,
            now + 28800000,
            now,
            room.id,
            room.id,
          ),
      );
      const results = await d.batch(steps);
      if (results.at(-1)?.meta.changes !== 1)
        throw new HttpError("Room is full (six people maximum)", 409);
      (await cookies()).set(roomCookie(room.id), id + "." + secret, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/meetings/" + room.id,
        maxAge: 28800,
      });
      return json({ participantId: id, iceServers: ice, isHost });
    }
    if (action === "rotate" || action === "end") {
      const s = await requireSession();
      if (s.user_id !== room.host_id)
        throw new HttpError("Only the host can do this", 403);
      if (action === "end") {
        await run("UPDATE rooms SET ended=1 WHERE id=?", room.id);
        await run("DELETE FROM participants WHERE room_id=?", room.id);
        return json({ ended: true });
      }
      const invite = token();
      await run(
        "UPDATE rooms SET invite_hash=?,invite_expires=? WHERE id=?",
        await digest(invite),
        Date.now() + 86400000,
        room.id,
      );
      return json({
        inviteUrl: new URL(req.url).origin + "/meet/" + room.id + "#" + invite,
      });
    }
    const p = await participant(room);
    if (action === "leave") {
      await run("DELETE FROM participants WHERE id=?", p.id);
      return json({ left: true });
    }
    if (action === "signal") {
      await limit("signal:" + p.id, 300, 60);
      if (
        typeof b.to !== "string" ||
        !(await one(
          "SELECT id FROM participants WHERE id=? AND room_id=?",
          b.to,
          room.id,
        ))
      )
        throw new HttpError("Participant unavailable", 404);
      const payload = b.payload;
      if (!payload || !["offer", "answer", "candidate"].includes(payload.type))
        throw new HttpError("Invalid signal");
      const value = JSON.stringify(payload);
      if (value.length > 50000) throw new HttpError("Signal too large", 413);
      await run(
        "INSERT INTO signals(room_id,sender,recipient,payload,created_at) VALUES(?,?,?,?,?)",
        room.id,
        p.id,
        b.to,
        value,
        Date.now(),
      );
      await run(
        "DELETE FROM signals WHERE room_id=? AND created_at<?",
        room.id,
        Date.now() - 300000,
      );
      return json({ sent: true });
    }
    throw new HttpError("Unsupported operation");
  } catch (e) {
    return failure(e);
  }
}
