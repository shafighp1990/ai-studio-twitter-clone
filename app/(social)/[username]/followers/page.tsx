import { notFound } from "next/navigation";
import FollowList from "@/components/FollowList";
import PageHeader from "@/components/PageHeader";
import { getFollowProfiles, getProfile, getViewer } from "@/lib/data";

export default async function FollowersPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) notFound();
  const [viewer, followers] = await Promise.all([getViewer(), getFollowProfiles(profile.id, "followers")]);
  return (
    <>
      <PageHeader title={profile.name} subtitle={`@${profile.username}`} backHref={`/${profile.username}`} />
      <div className="grid h-[53px] grid-cols-2 border-b border-[#2f3336] text-center text-[15px]">
        <span className="py-4 text-[#71767b]">Following</span>
        <span className="relative py-4 font-bold">Followers<span className="absolute inset-x-0 bottom-0 mx-auto h-1 w-16 rounded-full bg-[#1d9bf0]" /></span>
      </div>
      <FollowList profiles={followers} viewer={viewer} kind="followers" />
    </>
  );
}
