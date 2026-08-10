"use client";

import Link from "next/link";
import type { Profile, ProfileSummary } from "@/lib/types";
import Avatar from "./Avatar";
import EditProfileButton from "./EditProfileButton";
import FollowButton from "./FollowButton";
import { useI18n } from "./I18nProvider";
import VerifiedBadge from "./VerifiedBadge";
import { CalendarIcon, LinkIcon, LocationIcon } from "./icons";

function websiteHref(website: string) {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

export default function ProfileHeader({ profile, viewer }: { profile: ProfileSummary; viewer: Profile | null }) {
  const { intlLocale, t } = useI18n();
  const ownProfile = viewer?.id === profile.id;
  const joined = new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric" }).format(
    new Date(profile.created_at),
  );
  const numberFormatter = new Intl.NumberFormat(intlLocale);

  return (
    <>
      <div className="h-[200px] bg-[#2a3136]">
        {profile.banner_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.banner_url} alt={t("bannerAlt", { name: profile.name })} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="px-4 pb-4">
        <div className="flex h-[72px] items-start justify-between">
          <div className="-mt-[75px] rounded-full border-4 border-[#0b0d0e] bg-[#2a3136]">
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

        <h1 dir="auto" className="mt-2 flex items-center gap-1 text-xl font-bold">
          {profile.name} {profile.verified && <VerifiedBadge />}
        </h1>
        <p dir="ltr" className="w-fit text-[15px] text-[#8a959c]">@{profile.username}</p>

        {profile.bio && <p dir="auto" className="mt-4 whitespace-pre-wrap text-[15px] leading-6">{profile.bio}</p>}

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[15px] text-[#8a959c]">
          {profile.location && <span dir="auto" className="inline-flex items-center gap-1"><LocationIcon size={18} /> {profile.location}</span>}
          {profile.website && <a dir="ltr" href={websiteHref(profile.website)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#72a7c7] hover:underline"><LinkIcon size={18} /> {profile.website.replace(/^https?:\/\//, "")}</a>}
          <span className="inline-flex items-center gap-1"><CalendarIcon size={18} /> {t("joined", { date: joined })}</span>
        </div>

        <div className="mt-3 flex gap-5 text-[14px] text-[#8a959c]">
          <Link href={`/${profile.username}/following`} className="hover:underline"><strong className="me-1 font-bold text-[#e7ebed]">{numberFormatter.format(profile.followingCount)}</strong>{t("following")}</Link>
          <Link href={`/${profile.username}/followers`} className="hover:underline"><strong className="me-1 font-bold text-[#e7ebed]">{numberFormatter.format(profile.followerCount)}</strong>{t("followers")}</Link>
        </div>
      </div>

      <div className="border-b border-[#293036] px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#8a959c]">
        {t("profilePosts")}
      </div>
    </>
  );
}
