import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  FeedPost,
  NotificationItem,
  Profile,
  ProfileSummary,
} from "@/lib/types";

const PROFILE_COLUMNS =
  "id, username, name, bio, location, website, avatar_url, banner_url, verified, created_at, updated_at";

const POST_SELECT = `
  id,
  content,
  image_url,
  reply_to_id,
  created_at,
  author:profiles!posts_author_id_fkey(${PROFILE_COLUMNS}),
  post_likes(user_id),
  reposts(user_id)
`;

function postSelect(includeViewerBookmarks: boolean) {
  return `${POST_SELECT}${includeViewerBookmarks ? ", bookmarks(user_id)" : ""}`;
}

type RawPost = {
  id: string;
  content: string;
  image_url: string | null;
  reply_to_id: string | null;
  created_at: string;
  author: Profile | Profile[];
  post_likes: { user_id: string }[] | null;
  reposts: { user_id: string }[] | null;
  bookmarks: { user_id: string }[] | null;
};

function firstProfile(profile: Profile | Profile[]) {
  return Array.isArray(profile) ? profile[0] : profile;
}

function toFeedPost(post: RawPost, viewerId?: string, replyCount = 0): FeedPost {
  const likes = post.post_likes ?? [];
  const reposts = post.reposts ?? [];
  const bookmarks = post.bookmarks ?? [];

  return {
    id: post.id,
    content: post.content,
    imageUrl: post.image_url,
    replyToId: post.reply_to_id,
    createdAt: post.created_at,
    author: firstProfile(post.author),
    likeCount: likes.length,
    repostCount: reposts.length,
    replyCount,
    likedByViewer: Boolean(viewerId && likes.some((like) => like.user_id === viewerId)),
    repostedByViewer: Boolean(
      viewerId && reposts.some((repost) => repost.user_id === viewerId),
    ),
    bookmarkedByViewer: Boolean(
      viewerId && bookmarks.some((bookmark) => bookmark.user_id === viewerId),
    ),
  };
}

export async function getViewer() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  return data as Profile | null;
}

export async function getPosts(options?: {
  authorId?: string;
  search?: string;
  bookmarkedBy?: string;
  replyToId?: string;
  includeReplies?: boolean;
  limit?: number;
}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const viewerId = claimsData?.claims?.sub;
  let postIds: string[] | null = null;

  if (options?.bookmarkedBy) {
    if (!viewerId || options.bookmarkedBy !== viewerId) {
      return [];
    }

    const { data: bookmarkRows } = await supabase
      .from("bookmarks")
      .select("post_id")
      .eq("user_id", options.bookmarkedBy)
      .order("created_at", { ascending: false });
    postIds = bookmarkRows?.map((bookmark) => bookmark.post_id) ?? [];

    if (postIds.length === 0) {
      return [];
    }
  }

  let query = supabase
    .from("posts")
    .select(postSelect(Boolean(viewerId)))
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.authorId) {
    query = query.eq("author_id", options.authorId);
  }

  if (options?.search?.trim()) {
    const safeSearch = options.search.trim().replace(/[%_,]/g, "");
    query = query.ilike("content", `%${safeSearch}%`);
  }

  if (options?.replyToId) {
    query = query.eq("reply_to_id", options.replyToId);
  } else if (!options?.includeReplies) {
    query = query.is("reply_to_id", null);
  }

  if (postIds) {
    query = query.in("id", postIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Unable to load posts:", error.message);
    return [];
  }

  const rawPosts = data as unknown as RawPost[];
  const postIdsForReplies = rawPosts.map((post) => post.id);
  const replyCounts = new Map<string, number>();

  if (postIdsForReplies.length > 0) {
    const { data: replyRows } = await supabase
      .from("posts")
      .select("reply_to_id")
      .in("reply_to_id", postIdsForReplies);

    for (const reply of replyRows ?? []) {
      if (reply.reply_to_id) {
        replyCounts.set(
          reply.reply_to_id,
          (replyCounts.get(reply.reply_to_id) ?? 0) + 1,
        );
      }
    }
  }

  return rawPosts.map((post) =>
    toFeedPost(post, viewerId, replyCounts.get(post.id) ?? 0),
  );
}

export async function getPostById(postId: string) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const viewerId = claimsData?.claims?.sub;
  const { data, error } = await supabase
    .from("posts")
    .select(postSelect(Boolean(viewerId)))
    .eq("id", postId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const { count: replyCount } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("reply_to_id", postId);

  return toFeedPost(data as unknown as RawPost, viewerId, replyCount ?? 0);
}

export async function getProfile(username: string) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const viewerId = claimsData?.claims?.sub;
  const { data } = await supabase
    .from("profiles")
    .select(
      `${PROFILE_COLUMNS}, followers:follows!follows_following_id_fkey(follower_id), following:follows!follows_follower_id_fkey(following_id)`,
    )
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (!data) {
    return null;
  }

  const profile = data as unknown as Profile & {
    followers: { follower_id: string }[];
    following: { following_id: string }[];
  };

  return {
    ...profile,
    followerCount: profile.followers?.length ?? 0,
    followingCount: profile.following?.length ?? 0,
    followedByViewer: Boolean(
      viewerId &&
        profile.followers?.some((follow) => follow.follower_id === viewerId),
    ),
  } satisfies ProfileSummary;
}

export async function getSuggestedProfiles(limit = 3) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const viewerId = claimsData?.claims?.sub;
  let query = supabase
    .from("profiles")
    .select(
      `${PROFILE_COLUMNS}, followers:follows!follows_following_id_fkey(follower_id), following:follows!follows_follower_id_fkey(following_id)`,
    )
    .order("created_at", { ascending: true })
    .limit(limit);

  if (viewerId) {
    query = query.neq("id", viewerId);
  }

  const { data } = await query;

  return ((data ?? []) as unknown as Array<
    Profile & {
      followers: { follower_id: string }[];
      following: { following_id: string }[];
    }
  >).map((profile) => ({
    ...profile,
    followerCount: profile.followers?.length ?? 0,
    followingCount: profile.following?.length ?? 0,
    followedByViewer: Boolean(
      viewerId &&
        profile.followers?.some((follow) => follow.follower_id === viewerId),
    ),
  }));
}

export async function searchProfiles(search: string, limit = 20) {
  const queryText = search.trim().replace(/[%_,]/g, "");

  if (!queryText) return [];

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const viewerId = claimsData?.claims?.sub;
  const { data } = await supabase
    .from("profiles")
    .select(
      `${PROFILE_COLUMNS}, followers:follows!follows_following_id_fkey(follower_id), following:follows!follows_follower_id_fkey(following_id)`,
    )
    .or(`name.ilike.%${queryText}%,username.ilike.%${queryText}%`)
    .limit(limit);

  return ((data ?? []) as unknown as Array<
    Profile & {
      followers: { follower_id: string }[];
      following: { following_id: string }[];
    }
  >).map((profile) => ({
    ...profile,
    followerCount: profile.followers?.length ?? 0,
    followingCount: profile.following?.length ?? 0,
    followedByViewer: Boolean(
      viewerId && profile.followers?.some((follow) => follow.follower_id === viewerId),
    ),
  }));
}

export async function getFollowProfiles(
  profileId: string,
  kind: "followers" | "following",
) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const viewerId = claimsData?.claims?.sub;
  let ids: string[];

  if (kind === "followers") {
    const { data: follows } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", profileId)
      .order("created_at", { ascending: false });
    ids = (follows ?? []).map((row) => row.follower_id);
  } else {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", profileId)
      .order("created_at", { ascending: false });
    ids = (follows ?? []).map((row) => row.following_id);
  }

  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("profiles")
    .select(
      `${PROFILE_COLUMNS}, followers:follows!follows_following_id_fkey(follower_id), following:follows!follows_follower_id_fkey(following_id)`,
    )
    .in("id", ids);

  return ((data ?? []) as unknown as Array<
    Profile & {
      followers: { follower_id: string }[];
      following: { following_id: string }[];
    }
  >).map((profile) => ({
    ...profile,
    followerCount: profile.followers?.length ?? 0,
    followingCount: profile.following?.length ?? 0,
    followedByViewer: Boolean(
      viewerId && profile.followers?.some((follow) => follow.follower_id === viewerId),
    ),
  }));
}

export async function getNotifications() {
  const viewer = await getViewer();

  if (!viewer) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      `id, type, read, created_at, actor:profiles!notifications_actor_id_fkey(${PROFILE_COLUMNS}), post:posts!notifications_post_id_fkey(id, content)`,
    )
    .eq("recipient_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Unable to load notifications:", error.message);
    return [];
  }

  return (data as unknown as Array<{
    id: string;
    type: NotificationItem["type"];
    read: boolean;
    created_at: string;
    actor: Profile | Profile[];
    post: { id: string; content: string } | { id: string; content: string }[] | null;
  }>).map((notification) => ({
    id: notification.id,
    type: notification.type,
    read: notification.read,
    createdAt: notification.created_at,
    actor: firstProfile(notification.actor),
    post: Array.isArray(notification.post)
      ? notification.post[0] ?? null
      : notification.post,
  }));
}
