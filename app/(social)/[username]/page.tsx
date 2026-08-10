import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProfileHeader from "@/components/ProfileHeader";
import Timeline from "@/components/Timeline";
import { getPosts, getProfile, getViewer } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);
  return profile ? { title: `${profile.name} (@${profile.username})` } : { title: "Profile not found" };
}

export default async function UserProfilePage({ params }: PageProps<"/[username]">) {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) notFound();

  const [viewer, posts] = await Promise.all([
    getViewer(),
    getPosts({ authorId: profile.id, includeReplies: false }),
  ]);

  return (
    <>
      <PageHeader title={profile.name} subtitle={`${posts.length} posts`} backHref="/" />
      <ProfileHeader profile={profile} viewer={viewer} />
      <Timeline posts={posts} viewer={viewer} emptyTitle="No posts yet" emptyText={`When @${profile.username} posts, they will show up here.`} />
    </>
  );
}
