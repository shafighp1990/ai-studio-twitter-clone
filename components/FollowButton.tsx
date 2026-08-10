"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      className={`group rounded-full border font-bold transition disabled:opacity-60 ${
        compact ? "px-4 py-1.5 text-sm" : "px-5 py-2 text-[15px]"
      } ${
        isFollowing
          ? "border-[#536471] bg-transparent text-[#eff3f4] hover:border-[#f4212e]/50 hover:bg-[#f4212e]/10 hover:text-[#f4212e]"
          : "border-white bg-white text-black hover:bg-[#d7dbdc]"
      }`}
    >
      <span className={isFollowing ? "group-hover:hidden" : ""}>
        {isFollowing ? "Following" : "Follow"}
      </span>
      {isFollowing && <span className="hidden group-hover:inline">Unfollow</span>}
    </button>
  );
}
