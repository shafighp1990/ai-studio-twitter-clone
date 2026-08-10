import Link from "next/link";
import type { Profile, ProfileSummary } from "@/lib/types";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import VerifiedBadge from "./VerifiedBadge";

export default function ProfileResult({ profile, viewer }: { profile: ProfileSummary; viewer: Profile | null }) {
  return (
    <div className="flex gap-3 border-b border-[#2f3336] px-4 py-3 transition hover:bg-white/[0.03]">
      <Avatar profile={profile} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/${profile.username}`} className="min-w-0">
            <span className="flex items-center gap-1 truncate text-[15px] font-bold hover:underline">{profile.name} {profile.verified && <VerifiedBadge />}</span>
            <span className="block truncate text-[15px] text-[#71767b]">@{profile.username}</span>
          </Link>
          {viewer?.id !== profile.id && <FollowButton viewerId={viewer?.id} profileId={profile.id} initiallyFollowing={profile.followedByViewer} compact />}
        </div>
        {profile.bio && <p className="mt-1 text-[15px] leading-5">{profile.bio}</p>}
      </div>
    </div>
  );
}
