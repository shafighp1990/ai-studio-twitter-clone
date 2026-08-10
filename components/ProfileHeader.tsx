import Link from "next/link";
import type { Profile, ProfileSummary } from "@/lib/types";
import Avatar from "./Avatar";
import EditProfileButton from "./EditProfileButton";
import FollowButton from "./FollowButton";
import VerifiedBadge from "./VerifiedBadge";
import { CalendarIcon, LinkIcon, LocationIcon } from "./icons";

function websiteHref(website: string) {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

export default function ProfileHeader({ profile, viewer }: { profile: ProfileSummary; viewer: Profile | null }) {
  const ownProfile = viewer?.id === profile.id;
  const joined = new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <>
      <div className="h-[200px] bg-[#333639]">
        {profile.banner_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.banner_url} alt={`${profile.name}'s banner`} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="px-4 pb-4">
        <div className="flex h-[72px] items-start justify-between">
          <div className="-mt-[75px] rounded-full border-4 border-black bg-[#333639]">
            <Avatar profile={profile} size={142} link={false} />
          </div>
          <div className="pt-3">
            {ownProfile ? (
              <EditProfileButton profile={profile} />
            ) : (
              <FollowButton viewerId={viewer?.id} profileId={profile.id} initiallyFollowing={profile.followedByViewer} />
            )}
          </div>
        </div>

        <h1 className="mt-2 flex items-center gap-1 text-xl font-extrabold">
          {profile.name} {profile.verified && <VerifiedBadge />}
        </h1>
        <p className="text-[15px] text-[#71767b]">@{profile.username}</p>

        {profile.bio && <p className="mt-4 whitespace-pre-wrap text-[15px] leading-5">{profile.bio}</p>}

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[15px] text-[#71767b]">
          {profile.location && <span className="inline-flex items-center gap-1"><LocationIcon size={18} /> {profile.location}</span>}
          {profile.website && <a href={websiteHref(profile.website)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1d9bf0] hover:underline"><LinkIcon size={18} /> {profile.website.replace(/^https?:\/\//, "")}</a>}
          <span className="inline-flex items-center gap-1"><CalendarIcon size={18} /> Joined {joined}</span>
        </div>

        <div className="mt-3 flex gap-5 text-[14px] text-[#71767b]">
          <Link href={`/${profile.username}/following`} className="hover:underline"><strong className="font-bold text-[#e7e9ea]">{profile.followingCount}</strong> Following</Link>
          <Link href={`/${profile.username}/followers`} className="hover:underline"><strong className="font-bold text-[#e7e9ea]">{profile.followerCount}</strong> Followers</Link>
        </div>
      </div>

      <nav className="grid grid-cols-4 border-b border-[#2f3336] text-center text-[15px] text-[#71767b]">
        <span className="relative py-4 font-bold text-[#e7e9ea]">Posts<span className="absolute inset-x-0 bottom-0 mx-auto h-1 w-14 rounded-full bg-[#1d9bf0]" /></span>
        <span className="py-4">Replies</span>
        <span className="py-4">Media</span>
        <span className="py-4">Likes</span>
      </nav>
    </>
  );
}
