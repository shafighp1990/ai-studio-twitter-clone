import Link from "next/link";
import PostComposer from "@/components/PostComposer";
import Timeline from "@/components/Timeline";
import { getPosts, getViewer } from "@/lib/data";

export default async function HomePage() {
  const [viewer, posts] = await Promise.all([getViewer(), getPosts()]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#2f3336] bg-black/80 backdrop-blur-md">
        <h1 className="px-4 py-3 text-xl font-bold sm:hidden">Home</h1>
        <div className="grid h-[53px] grid-cols-2">
          <button type="button" className="relative font-bold transition hover:bg-white/10">
            For you
            <span className="absolute inset-x-0 bottom-0 mx-auto h-1 w-14 rounded-full bg-[#1d9bf0]" />
          </button>
          <button type="button" className="font-medium text-[#71767b] transition hover:bg-white/10">
            Following
          </button>
        </div>
      </header>

      {viewer ? (
        <div className="border-b border-[#2f3336]">
          <PostComposer viewer={viewer} />
        </div>
      ) : (
        <div className="border-b border-[#2f3336] px-6 py-5">
          <h2 className="text-xl font-bold">Join the conversation</h2>
          <p className="mt-1 text-[15px] text-[#71767b]">Sign in to post, reply, follow people, and build your timeline.</p>
          <div className="mt-4 flex gap-3">
            <Link href="/login" className="rounded-full bg-white px-5 py-2 text-[15px] font-bold text-black">Sign in</Link>
            <Link href="/register" className="rounded-full border border-[#536471] px-5 py-2 text-[15px] font-bold">Create account</Link>
          </div>
        </div>
      )}

      <Timeline posts={posts} viewer={viewer} />
    </>
  );
}
