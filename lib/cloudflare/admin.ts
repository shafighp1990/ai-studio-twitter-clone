import "server-only";
import { requireSession } from "./auth";
import { HttpError } from "./db";
export async function requireAdmin() {
  const s = await requireSession();
  if (!s.is_admin) throw new HttpError("Admin access required", 403);
  return s;
}
// Explicit projections: authentication secrets, hashes and signaling payloads never leave the server.
export const adminTables = {
  users:
    "SELECT u.id,u.email,p.username,p.name,u.is_admin,u.disabled,u.must_change_password,u.email_verified,u.created_at,p.avatar_url,p.banner_url,(SELECT count(*) FROM posts t WHERE t.author_id=u.id) AS post_count,EXISTS(SELECT 1 FROM mfa_factors m WHERE m.user_id=u.id AND m.verified=1) AS mfa_enabled FROM users u JOIN profiles p ON p.id=u.id",
  posts:
    "SELECT t.id,t.author_id,p.username,t.content,t.image_url,t.reply_to_id,t.external_url,t.created_at FROM posts t JOIN profiles p ON p.id=t.author_id",
  profiles:
    "SELECT id,username,name,bio,location,website,avatar_url,banner_url,verified,created_at,updated_at FROM profiles",
  rooms:
    "SELECT r.id,r.host_id,p.username,r.title,r.ended,r.invite_expires,r.created_at,(SELECT count(*) FROM participants a WHERE a.room_id=r.id AND a.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND a.last_seen>CAST(strftime('%s','now') AS INTEGER)*1000-120000) AS participants FROM rooms r JOIN profiles p ON p.id=r.host_id",
  post_likes: "SELECT post_id,user_id,created_at FROM post_likes",
  reposts: "SELECT post_id,user_id,created_at FROM reposts",
  bookmarks: "SELECT post_id,user_id,created_at FROM bookmarks",
  follows: "SELECT follower_id,following_id,created_at FROM follows",
  notifications:
    "SELECT id,recipient_id,actor_id,post_id,type,read,created_at FROM notifications",
  sessions: "SELECT user_id,aal,expires_at,mfa_verified_at FROM sessions",
  mfa_factors: "SELECT id,user_id,verified,friendly_name FROM mfa_factors",
  participants:
    "SELECT id,room_id,user_id,name,expires_at,last_seen FROM participants",
  signals:
    "SELECT id,room_id,sender,recipient,json_extract(payload,'$.type') AS type,created_at FROM signals",
  rate_limits: "SELECT hits,expires_at FROM rate_limits",
  removed_media: "SELECT key,removed_by,created_at FROM removed_media",
  admin_audit:
    "SELECT a.id,a.actor_id,p.username AS admin_username,a.action,a.target_id,a.details,a.created_at FROM admin_audit a LEFT JOIN profiles p ON p.id=a.actor_id",
} as const;
export type AdminTable = keyof typeof adminTables;
