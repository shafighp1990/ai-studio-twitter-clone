import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-[#e7e9ea]">
      <div>
        <p className="text-[15px] text-[#71767b]">Hmm…this page doesn&apos;t exist. Try searching for something else.</p>
        <Link href="/explore" className="mt-5 inline-block rounded-full bg-[#1d9bf0] px-5 py-2.5 text-[15px] font-bold text-white">Search</Link>
      </div>
    </main>
  );
}
