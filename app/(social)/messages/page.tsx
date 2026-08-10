import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { MailIcon } from "@/components/icons";
import { getViewer } from "@/lib/data";

export default async function MessagesPage() {
  const viewer = await getViewer();

  return (
    <>
      <PageHeader title="Messages" />
      <div className="mx-auto max-w-[420px] px-8 py-16 text-center">
        <MailIcon size={54} className="mx-auto text-[#1d9bf0]" />
        <h2 className="mt-5 text-[31px] font-extrabold leading-9">Welcome to your inbox!</h2>
        <p className="mt-2 text-[15px] leading-5 text-[#71767b]">Drop a line, share posts, and start private conversations with people on AI Studio.</p>
        <Link href={viewer ? "/explore" : "/login"} className="mt-7 inline-block rounded-full bg-[#1d9bf0] px-6 py-3 text-[15px] font-bold text-white hover:bg-[#1a8cd8]">
          {viewer ? "Find people" : "Sign in"}
        </Link>
      </div>
    </>
  );
}
