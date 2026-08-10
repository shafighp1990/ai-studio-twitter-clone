export type Profile = {
  id: string;
  username: string;
  name: string;
  bio: string;
  location: string;
  website: string;
  avatar_url: string | null;
  banner_url: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
};

export type FeedPost = {
  id: string;
  content: string;
  imageUrl: string | null;
  replyToId: string | null;
  createdAt: string;
  author: Profile;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  likedByViewer: boolean;
  repostedByViewer: boolean;
  bookmarkedByViewer: boolean;
};

export type NotificationItem = {
  id: string;
  type: "like" | "reply" | "repost" | "follow";
  read: boolean;
  createdAt: string;
  actor: Profile;
  post: { id: string; content: string } | null;
};

export type ProfileSummary = Profile & {
  followerCount: number;
  followingCount: number;
  followedByViewer: boolean;
};
