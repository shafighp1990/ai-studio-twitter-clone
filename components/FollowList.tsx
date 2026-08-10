"use client";

import type { Profile, ProfileSummary } from "@/lib/types";
import { useI18n } from "./I18nProvider";
import ProfileResult from "./ProfileResult";

export default function FollowList({ profiles, viewer, kind }: { profiles: ProfileSummary[]; viewer: Profile | null; kind: "followers" | "following" }) {
  const { t } = useI18n();

  if (profiles.length === 0) {
    return (
      <div className="mx-auto max-w-[400px] px-8 py-16">
        <h2 className="text-[28px] font-semibold">{kind === "followers" ? t("followersEmptyTitle") : t("followingEmptyTitle")}</h2>
        <p className="mt-2 text-[15px] text-[#8a959c]">{t("followListEmptyText")}</p>
      </div>
    );
  }
  return profiles.map((profile) => <ProfileResult key={profile.id} profile={profile} viewer={viewer} />);
}
