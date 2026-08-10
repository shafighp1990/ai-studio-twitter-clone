import type { FeedPost, Profile } from "@/lib/types";
import PostCard from "./PostCard";

export default function Timeline({
  posts,
  viewer,
  emptyTitle = "Welcome to your timeline",
  emptyText = "When people post, their updates will show up here.",
}: {
  posts: FeedPost[];
  viewer: Profile | null;
  emptyTitle?: string;
  emptyText?: string;
}) {
  if (posts.length === 0) {
    return (
      <div className="mx-auto max-w-[400px] px-8 py-16">
        <h2 className="text-[31px] font-extrabold leading-9">{emptyTitle}</h2>
        <p className="mt-2 text-[15px] leading-5 text-[#71767b]">{emptyText}</p>
      </div>
    );
  }

  return posts.map((post) => <PostCard key={post.id} post={post} viewer={viewer} />);
}
