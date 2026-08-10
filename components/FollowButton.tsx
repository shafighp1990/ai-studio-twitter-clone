"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "./I18nProvider";

export default function FollowButton({
  viewerId,
  profileId,
  initiallyFollowing,
  compact = false,
}: {
  viewerId?: string;
  profileId: string;
  initiallyFollowing: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [isFollowing, setIsFollowing] = useState(initiallyFollowing);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!viewerId) {
      router.push("/login");
      return;
    }

    const nextValue = !isFollowing;
    setIsFollowing(nextValue);

    startTransition(async () => {
      const supabase = createClient();
      const result = nextValue
        ? await supabase.from("follows").insert({
            follower_id: viewerId,
            following_id: profileId,
          })
        : await supabase
            .from("follows")
            .delete()
            .eq("follower_id", viewerId)
            .eq("following_id", profileId);

      if (result.error) {
        setIsFollowing(!nextValue);
        return;
      }

      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isFollowing}
      aria-label={isFollowing ? t("unfollow") : t("follow")}
      className={`rounded border font-semibold transition disabled:opacity-60 ${
        compact ? "px-4 py-1.5 text-sm" : "px-5 py-2 text-[15px]"
      } ${
        isFollowing
          ? "border-[#8f5860] bg-transparent text-[#ff9ba4] hover:bg-[#f4212e]/10"
          : "border-[#72a7c7] bg-[#72a7c7] text-[#071015] hover:bg-[#86b8d4]"
      }`}
    >
      {isFollowing ? t("unfollow") : t("follow")}
    </button>
  );
}
