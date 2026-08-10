import Link from "next/link";
import ProfileResult from "@/components/ProfileResult";
import Timeline from "@/components/Timeline";
import { SearchIcon } from "@/components/icons";
import { getPosts, getViewer, searchProfiles } from "@/lib/data";

const topics = ["Technology", "Design", "AI", "Next.js", "Supabase", "Build in public"];

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const viewer = await getViewer();
  const [posts, profiles] = q.trim()
    ? await Promise.all([getPosts({ search: q, includeReplies: true }), searchProfiles(q)])
    : [[], []];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#2f3336] bg-black/90 px-4 py-2 backdrop-blur-md">
        <form action="/explore" className="relative">
          <SearchIcon size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71767b]" />
          <input name="q" defaultValue={q} type="search" autoFocus={Boolean(q)} placeholder="Search AI Studio" className="h-[44px] w-full rounded-full bg-[#202327] pl-12 pr-4 outline-none placeholder:text-[#71767b] focus:bg-black focus:ring-1 focus:ring-[#1d9bf0]" />
        </form>
      </header>

      {q.trim() ? (
        <>
          <nav className="grid grid-cols-3 border-b border-[#2f3336] text-center text-[15px]">
            <span className="relative py-4 font-bold">Top<span className="absolute inset-x-0 bottom-0 mx-auto h-1 w-12 rounded-full bg-[#1d9bf0]" /></span>
            <span className="py-4 text-[#71767b]">Latest</span>
            <span className="py-4 text-[#71767b]">People</span>
          </nav>
          {profiles.length > 0 && (
            <section>
              <h2 className="px-4 py-3 text-xl font-extrabold">People</h2>
              {profiles.slice(0, 3).map((profile) => <ProfileResult key={profile.id} profile={profile} viewer={viewer} />)}
            </section>
          )}
          <Timeline posts={posts} viewer={viewer} emptyTitle="No results for this search" emptyText="Try searching for something else." />
        </>
      ) : (
        <section>
          <div className="relative h-[220px] overflow-hidden bg-[linear-gradient(135deg,#1d9bf0,#7856ff,#f91880)] p-5">
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute bottom-5 left-5">
              <p className="text-[13px] font-bold">LIVE</p>
              <h1 className="text-3xl font-extrabold">See what&apos;s happening now</h1>
              <p className="mt-1 text-[15px]">Discover stories, people, and conversations worth following.</p>
            </div>
          </div>
          <h2 className="px-4 py-3 text-xl font-extrabold">Explore topics</h2>
          {topics.map((topic, index) => (
            <Link key={topic} href={`/explore?q=${encodeURIComponent(topic)}`} className="block border-b border-[#2f3336] px-4 py-3 transition hover:bg-white/[0.03]">
              <p className="text-[13px] text-[#71767b]">{index + 1} · Trending</p>
              <p className="mt-0.5 text-[15px] font-bold">{topic}</p>
              <p className="mt-1 text-[13px] text-[#71767b]">{(15.7 - index * 1.8).toFixed(1)}K posts</p>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
