import Link from "next/link";
import type { Profile, ProfileSummary } from "@/lib/types";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import VerifiedBadge from "./VerifiedBadge";
import { SearchIcon } from "./icons";

const trends = [
  { eyebrow: "Trending in Technology", title: "Next.js", posts: "42.1K posts" },
  { eyebrow: "Technology · Trending", title: "Supabase", posts: "18.4K posts" },
  { eyebrow: "Trending", title: "#BuildInPublic", posts: "12.8K posts" },
  { eyebrow: "Design · Trending", title: "AI Studio", posts: "8,945 posts" },
];

export default function RightRail({
  viewer,
  suggestions,
}: {
  viewer: Profile | null;
  suggestions: ProfileSummary[];
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[350px] shrink-0 overflow-y-auto px-7 pb-16 lg:block">
      <div className="sticky top-0 z-10 bg-black py-1.5">
        <form action="/explore" className="relative">
          <SearchIcon size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#71767b]" />
          <input
            name="q"
            type="search"
            placeholder="Search"
            className="h-[44px] w-full rounded-full bg-[#202327] pl-12 pr-4 text-[15px] outline-none placeholder:text-[#71767b] focus:bg-black focus:ring-1 focus:ring-[#1d9bf0]"
          />
        </form>
      </div>

      {!viewer && (
        <section className="mt-3 rounded-2xl border border-[#2f3336] p-4">
          <h2 className="text-xl font-extrabold">New to AI Studio?</h2>
          <p className="mt-2 text-[13px] leading-4 text-[#71767b]">
            Sign up now to get your own personalized timeline.
          </p>
          <Link href="/register" className="mt-4 block rounded-full bg-white py-2 text-center text-[15px] font-bold text-black hover:bg-[#d7dbdc]">
            Create account
          </Link>
        </section>
      )}

      <section className="mt-4 overflow-hidden rounded-2xl bg-[#16181c]">
        <h2 className="px-4 py-3 text-xl font-extrabold">What&apos;s happening</h2>
        {trends.map((trend) => (
          <Link key={trend.title} href={`/explore?q=${encodeURIComponent(trend.title.replace("#", ""))}`} className="block px-4 py-3 transition hover:bg-white/[0.03]">
            <p className="text-[13px] text-[#71767b]">{trend.eyebrow}</p>
            <p className="mt-0.5 text-[15px] font-bold text-[#e7e9ea]">{trend.title}</p>
            <p className="mt-1 text-[13px] text-[#71767b]">{trend.posts}</p>
          </Link>
        ))}
        <Link href="/explore" className="block px-4 py-4 text-[15px] text-[#1d9bf0] transition hover:bg-white/[0.03]">
          Show more
        </Link>
      </section>

      {suggestions.length > 0 && (
        <section className="mt-4 overflow-hidden rounded-2xl bg-[#16181c]">
          <h2 className="px-4 py-3 text-xl font-extrabold">Who to follow</h2>
          {suggestions.map((profile) => (
            <div key={profile.id} className="flex items-center gap-2 px-4 py-3 transition hover:bg-white/[0.03]">
              <Avatar profile={profile} size={40} />
              <Link href={`/${profile.username}`} className="min-w-0 flex-1 leading-5">
                <span className="flex items-center gap-1 truncate text-[15px] font-bold hover:underline">
                  {profile.name}
                  {profile.verified && <VerifiedBadge />}
                </span>
                <span className="block truncate text-[15px] text-[#71767b]">@{profile.username}</span>
              </Link>
              <FollowButton
                viewerId={viewer?.id}
                profileId={profile.id}
                initiallyFollowing={profile.followedByViewer}
                compact
              />
            </div>
          ))}
        </section>
      )}

      <footer className="px-4 py-4 text-[13px] text-[#71767b]">
        <span>Terms of Service · Privacy Policy · Cookie Policy</span>
        <span className="mt-1 block">© 2026 AI Studio</span>
      </footer>
    </aside>
  );
}
