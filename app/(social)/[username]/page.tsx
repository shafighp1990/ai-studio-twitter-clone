import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProfileHeader from "@/components/ProfileHeader";
import Timeline from "@/components/Timeline";
import { getPosts, getProfile, getViewer } from "@/lib/data";
import { getServerI18n } from "@/lib/i18n/server";

type ProfilePageProps = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const { t } = await getServerI18n();
  const profile = await getProfile(username);
  return profile ? { title: `${profile.name} (@${profile.username})` } : { title: t("profileNotFound") };
}

export default async function UserProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const { t } = await getServerI18n();
  const profile = await getProfile(username);
  if (!profile) notFound();

  const [viewer, posts] = await Promise.all([
    getViewer(),
    getPosts({ authorId: profile.id, includeReplies: false }),
  ]);

  return (
    <>
      <PageHeader title={profile.name} subtitle={t("postsCount", { count: posts.length })} backHref="/" />
      <ProfileHeader profile={profile} viewer={viewer} />
      <Timeline
        posts={posts}
        viewer={viewer}
        emptyTitle={t("noPostsTitle")}
        emptyText={t("noPostsText", { username: profile.username })}
      />
    </>
  );
}
