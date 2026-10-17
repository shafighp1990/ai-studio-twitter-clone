import "server-only";
import { cookies } from "next/headers";
import { digest, env, HttpError, one } from "./db";
export type Room = {
  id: string;
  host_id: string;
  title: string;
  invite_hash: string;
  invite_expires: number;
  ended: number;
  created_at: string;
};
export type Participant = {
  id: string;
  room_id: string;
  token_hash: string;
  user_id: string | null;
  name: string;
  expires_at: number;
  last_seen: number;
};
export function roomCookie(id: string) {
  return "arr_room_" + id.replaceAll("-", "");
}
export async function roomById(id: string) {
  const room = await one<Room>("SELECT * FROM rooms WHERE id=?", id);
  if (!room) throw new HttpError("Room not found", 404);
  return room;
}
export async function participant(room: Room) {
  if (room.ended) throw new HttpError("Meeting ended", 410);
  const value = (await cookies()).get(roomCookie(room.id))?.value;
  const [id, secret] = value?.split(".") ?? [];
  if (!id || !secret) throw new HttpError("Join this room first", 401);
  const p = await one<Participant>(
    "SELECT * FROM participants WHERE id=? AND room_id=? AND token_hash=? AND expires_at>?",
    id,
    room.id,
    await digest(secret),
    Date.now(),
  );
  if (!p) throw new HttpError("Meeting session expired. Join again.", 401);
  return p;
}
export async function iceServers() {
  const e = (await env()) as CloudflareEnv & {
    TURN_KEY_ID?: string;
    TURN_KEY_TOKEN?: string;
  };
  if (!e.TURN_KEY_ID || !e.TURN_KEY_TOKEN)
    throw new HttpError(
      "Video calling is being configured. Please try again shortly.",
      503,
    );
  const r = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${e.TURN_KEY_ID}/credentials/generate-ice-servers`,
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + e.TURN_KEY_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl: 28800 }),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!r.ok)
    throw new HttpError(
      "Video connection service is temporarily unavailable",
      503,
    );
  const data = (await r.json()) as { iceServers: RTCIceServer[] };
  return data.iceServers;
}
