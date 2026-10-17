import "server-only";
import { all, one } from "@/lib/cloudflare/db";
import { session } from "@/lib/cloudflare/auth";
import type {
  FeedPost,
  NotificationItem,
  Profile,
  ProfileSummary,
} from "@/lib/types";
const authorJson = `json_object('id',p.id,'username',p.username,'name',p.name,'bio',p.bio,'location',p.location,'website',p.website,'avatar_url',p.avatar_url,'banner_url',p.banner_url,'verified',p.verified,'created_at',p.created_at,'updated_at',p.updated_at)`;
export async function getViewer() {
  const s = await session();
  return s
    ? one<Profile>("SELECT p.*,u.is_admin AS isAdmin FROM profiles p JOIN users u ON u.id=p.id WHERE p.id=?", s.user_id)
    : null;
}
type PostRow = {
  id: string;
  content: string;
  image_url: string | null;
  external_platform: FeedPost["externalPlatform"];
  external_url: string | null;
  reply_to_id: string | null;
  created_at: string;
  author_json: string;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  likedByViewer: number;
  repostedByViewer: number;
  bookmarkedByViewer: number;
};
async function posts(where: string, args: (string | number)[], limit = 50) {
  const s = await session();
  const id = s?.user_id ?? "";
  const rows = await all<PostRow>(
    `SELECT t.*,${authorJson} AS author_json,(SELECT COUNT(*) FROM post_likes l WHERE l.post_id=t.id) AS likeCount,(SELECT COUNT(*) FROM reposts r WHERE r.post_id=t.id) AS repostCount,(SELECT COUNT(*) FROM posts r WHERE r.reply_to_id=t.id) AS replyCount,EXISTS(SELECT 1 FROM post_likes l WHERE l.post_id=t.id AND l.user_id=?) AS likedByViewer,EXISTS(SELECT 1 FROM reposts r WHERE r.post_id=t.id AND r.user_id=?) AS repostedByViewer,EXISTS(SELECT 1 FROM bookmarks b WHERE b.post_id=t.id AND b.user_id=?) AS bookmarkedByViewer FROM posts t JOIN profiles p ON p.id=t.author_id WHERE ${where} ORDER BY t.created_at DESC LIMIT ?`,
    id,
    id,
    id,
    ...args,
    Math.min(100, Math.max(1, limit)),
  );
  return rows.map(
    (r) =>
      ({
        id: r.id,
        content: r.content,
        imageUrl: r.image_url,
        externalPlatform: r.external_platform,
        externalUrl: r.external_url,
        replyToId: r.reply_to_id,
        createdAt: r.created_at,
        author: JSON.parse(r.author_json),
        likeCount: r.likeCount,
        repostCount: r.repostCount,
        replyCount: r.replyCount,
        likedByViewer: !!r.likedByViewer,
        repostedByViewer: !!r.repostedByViewer,
        bookmarkedByViewer: !!r.bookmarkedByViewer,
      }) satisfies FeedPost,
  );
}
export async function getPosts(options?: {
  authorId?: string;
  search?: string;
  bookmarkedBy?: string;
  replyToId?: string;
  includeReplies?: boolean;
  limit?: number;
}) {
  const where = ["1=1"],
    args: string[] = [];
  if (options?.authorId) {
    where.push("t.author_id=?");
    args.push(options.authorId);
  }
  if (options?.search?.trim()) {
    where.push("instr(lower(t.content),lower(?))>0");
    args.push(options.search.trim());
  }
  if (options?.replyToId) {
    where.push("t.reply_to_id=?");
    args.push(options.replyToId);
  } else if (!options?.includeReplies) where.push("t.reply_to_id IS NULL");
  if (options?.bookmarkedBy) {
    const s = await session();
    if (s?.user_id !== options.bookmarkedBy) return [];
    where.push(
      "EXISTS(SELECT 1 FROM bookmarks b WHERE b.post_id=t.id AND b.user_id=?)",
    );
    args.push(s.user_id);
  }
  return posts(where.join(" AND "), args, options?.limit);
}
export async function getPostById(id: string) {
  return (await posts("t.id=?", [id], 1))[0] ?? null;
}
async function profiles(where: string, args: (string | number)[], limit = 50) {
  const s = await session();
  const rows = await all<ProfileSummary>(
    `SELECT p.*,(SELECT COUNT(*) FROM follows f WHERE f.following_id=p.id) AS followerCount,(SELECT COUNT(*) FROM follows f WHERE f.follower_id=p.id) AS followingCount,EXISTS(SELECT 1 FROM follows f WHERE f.following_id=p.id AND f.follower_id=?) AS followedByViewer FROM profiles p WHERE ${where} ORDER BY p.created_at LIMIT ?`,
    s?.user_id ?? "",
    ...args,
    limit,
  );
  return rows.map((r) => ({
    ...r,
    verified: !!r.verified,
    followedByViewer: !!r.followedByViewer,
  }));
}
export async function getProfile(username: string) {
  return (
    (await profiles("p.username=?", [username.toLowerCase()], 1))[0] ?? null
  );
}
export async function getSuggestedProfiles(limit = 3) {
  const s = await session();
  return profiles("p.id<>?", [s?.user_id ?? ""], limit);
}
export async function searchProfiles(search: string, limit = 20) {
  if (!search.trim()) return [];
  return profiles(
    "(instr(lower(p.name),lower(?))>0 OR instr(p.username,lower(?))>0)",
    [search.trim(), search.trim()],
    limit,
  );
}
export async function getFollowProfiles(
  id: string,
  kind: "followers" | "following",
) {
  return profiles(
    kind === "followers"
      ? "EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=p.id AND f.following_id=?)"
      : "EXISTS(SELECT 1 FROM follows f WHERE f.following_id=p.id AND f.follower_id=?)",
    [id],
    100,
  );
}
export async function getNotifications() {
  const s = await session();
  if (!s) return [];
  const rows = await all<{
    id: string;
    type: NotificationItem["type"];
    read: number;
    created_at: string;
    actor_json: string;
    post_id: string | null;
    content: string | null;
  }>(
    `SELECT n.*,${authorJson} AS actor_json,t.content FROM notifications n JOIN profiles p ON p.id=n.actor_id LEFT JOIN posts t ON t.id=n.post_id WHERE n.recipient_id=? ORDER BY n.created_at DESC LIMIT 50`,
    s.user_id,
  );
  return rows.map(
    (r) =>
      ({
        id: r.id,
        type: r.type,
        read: !!r.read,
        createdAt: r.created_at,
        actor: JSON.parse(r.actor_json),
        post: r.post_id ? { id: r.post_id, content: r.content ?? "" } : null,
      }) satisfies NotificationItem,
  );
}
