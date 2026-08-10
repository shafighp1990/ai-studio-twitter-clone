import { notFound } from "next/navigation";
import FollowList from "@/components/FollowList";
import PageHeader from "@/components/PageHeader";
import { getFollowProfiles, getProfile, getViewer } from "@/lib/data";

export default async function FollowingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) notFound();
  const [viewer, following] = await Promise.all([getViewer(), getFollowProfiles(profile.id, "following")]);
  return (
    <>
      <PageHeader title={profile.name} subtitle={`@${profile.username}`} backHref={`/${profile.username}`} />
      <div className="grid h-[53px] grid-cols-2 border-b border-[#2f3336] text-center text-[15px]">
        <span className="relative py-4 font-bold">Following<span className="absolute inset-x-0 bottom-0 mx-auto h-1 w-16 rounded-full bg-[#1d9bf0]" /></span>
        <span className="py-4 text-[#71767b]">Followers</span>
      </div>
      <FollowList profiles={following} viewer={viewer} kind="following" />
    </>
  );
}
