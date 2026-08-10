import { notFound } from "next/navigation";
import Link from "next/link";
import FollowList from "@/components/FollowList";
import PageHeader from "@/components/PageHeader";
import { getFollowProfiles, getProfile, getViewer } from "@/lib/data";
import { getServerI18n } from "@/lib/i18n/server";

export default async function FollowingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { t } = await getServerI18n();
  const profile = await getProfile(username);
  if (!profile) notFound();
  const [viewer, following] = await Promise.all([getViewer(), getFollowProfiles(profile.id, "following")]);
  return (
    <>
      <PageHeader title={profile.name} subtitle={`@${profile.username}`} backHref={`/${profile.username}`} />
      <nav className="grid min-h-[53px] grid-cols-2 border-b border-[var(--border)] text-center text-[15px]">
        <Link href={`/${profile.username}/following`} aria-current="page" className="relative py-4 font-semibold">
          {t("following")}
          <span className="absolute inset-x-0 bottom-0 mx-auto h-0.5 w-16 bg-[var(--blue)]" />
        </Link>
        <Link href={`/${profile.username}/followers`} className="py-4 text-[var(--muted)] transition hover:bg-[var(--surface)]">{t("followers")}</Link>
      </nav>
      <FollowList profiles={following} viewer={viewer} kind="following" />
    </>
  );
}
