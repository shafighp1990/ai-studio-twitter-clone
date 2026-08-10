"use client";

import type { FeedPost, Profile } from "@/lib/types";
import { useI18n } from "./I18nProvider";
import PostCard from "./PostCard";

export default function Timeline({
  posts,
  viewer,
  emptyTitle,
  emptyText,
}: {
  posts: FeedPost[];
  viewer: Profile | null;
  emptyTitle?: string;
  emptyText?: string;
}) {
  const { t } = useI18n();

  if (posts.length === 0) {
    return (
      <div className="mx-auto max-w-[400px] px-8 py-16">
        <h2 className="text-[28px] font-semibold leading-9">{emptyTitle ?? t("timelineEmptyTitle")}</h2>
        <p className="mt-2 text-[15px] leading-6 text-[#8a959c]">{emptyText ?? t("timelineEmptyText")}</p>
      </div>
    );
  }

  return posts.map((post) => <PostCard key={post.id} post={post} viewer={viewer} />);
}
