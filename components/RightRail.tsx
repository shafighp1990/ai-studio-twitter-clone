"use client";

import Link from "next/link";
import type { Profile, ProfileSummary } from "@/lib/types";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import LanguageSwitcher from "./LanguageSwitcher";
import VerifiedBadge from "./VerifiedBadge";
import { useI18n } from "./I18nProvider";
import { SearchIcon } from "./icons";

const topics = [
  { key: "topicWeb" },
  { key: "topicDesign" },
  { key: "topicNext" },
  { key: "topicSupabase" },
] as const;

export default function RightRail({
  viewer,
  suggestions,
}: {
  viewer: Profile | null;
  suggestions: ProfileSummary[];
}) {
  const { t } = useI18n();

  return (
    <aside className="sticky top-0 hidden h-screen w-[350px] shrink-0 overflow-y-auto px-7 pb-16 lg:block">
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-[#0b0d0e] py-2">
        <form action="/explore" className="relative min-w-0 flex-1">
          <SearchIcon
            size={19}
            className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[#8a959c]"
          />
          <input
            name="q"
            type="search"
            aria-label={t("search")}
            placeholder={t("search")}
            className="h-[42px] w-full rounded-lg border border-transparent bg-[#171c20] pe-3 ps-11 text-[15px] outline-none placeholder:text-[#8a959c] focus:border-[#72a7c7] focus:bg-[#0b0d0e]"
          />
        </form>
        <LanguageSwitcher compact />
      </div>

      {!viewer && (
        <section className="mt-3 rounded-lg border border-[#293036] p-4">
          <h2 className="text-lg font-bold">{t("sideGuestTitle")}</h2>
          <p className="mt-2 text-[14px] leading-5 text-[#8a959c]">{t("sideGuestText")}</p>
          <Link
            href="/register"
            className="mt-4 block rounded-md bg-[#e7ebed] py-2 text-center text-[15px] font-bold text-[#0b0d0e] transition hover:bg-white"
          >
            {t("createAccount")}
          </Link>
        </section>
      )}

      <section className="mt-4 rounded-lg border border-[#293036] bg-[#15191c] p-4">
        <h2 className="text-lg font-bold">{t("projectInfoTitle")}</h2>
        <p className="mt-2 text-[14px] leading-5 text-[#a5afb5]">{t("projectInfoBody")}</p>
        <p dir="ltr" className="mt-3 text-start text-[13px] text-[#8a959c]">
          {t("projectStack")}
        </p>
        <a
          href="https://github.com/shafighp1990/ai-studio-twitter-clone"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex text-[14px] font-semibold text-[#72a7c7] hover:underline"
        >
          {t("sourceCode")}
        </a>
      </section>

      <section className="mt-4 overflow-hidden rounded-lg border border-[#293036] bg-[#15191c]">
        <h2 className="px-4 py-3 text-lg font-bold">{t("topics")}</h2>
        <div className="border-t border-[#293036]">
          {topics.map((topic) => (
            <Link
              key={topic.key}
              href={`/explore?q=${encodeURIComponent(t(topic.key))}`}
              className="block px-4 py-3 text-[15px] transition hover:bg-white/[0.04]"
            >
              {t(topic.key)}
            </Link>
          ))}
        </div>
      </section>

      {suggestions.length > 0 && (
        <section className="mt-4 overflow-hidden rounded-lg border border-[#293036] bg-[#15191c]">
          <h2 className="px-4 py-3 text-lg font-bold">{t("whoFollow")}</h2>
          <div className="border-t border-[#293036]">
            {suggestions.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center gap-2 px-4 py-3 transition hover:bg-white/[0.04]"
              >
                <Avatar profile={profile} size={40} />
                <Link href={`/${profile.username}`} className="min-w-0 flex-1 leading-5">
                  <span className="flex items-center gap-1 text-[15px] font-bold hover:underline">
                    <span dir="auto" className="truncate">
                      {profile.name}
                    </span>
                    {profile.verified && <VerifiedBadge />}
                  </span>
                  <span dir="ltr" className="block truncate text-[15px] text-[#8a959c]">
                    @{profile.username}
                  </span>
                </Link>
                <FollowButton
                  viewerId={viewer?.id}
                  profileId={profile.id}
                  initiallyFollowing={profile.followedByViewer}
                  compact
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="px-1 py-5 text-[13px] text-[#8a959c]">
        <span>{t("footerProject")}</span>
        <span className="mx-2" aria-hidden="true">
          ·
        </span>
        <span>© 2026 AI Studio</span>
      </footer>
    </aside>
  );
}
