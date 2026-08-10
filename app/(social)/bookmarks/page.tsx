import PageHeader from "@/components/PageHeader";
import Timeline from "@/components/Timeline";
import { getPosts, getViewer } from "@/lib/data";
import { getServerI18n } from "@/lib/i18n/server";

export default async function BookmarksPage() {
  const { t } = await getServerI18n();
  const viewer = await getViewer();
  const posts = viewer ? await getPosts({ bookmarkedBy: viewer.id, includeReplies: true }) : [];

  return (
    <>
      <PageHeader title={t("bookmarksTitle")} subtitle={viewer ? `@${viewer.username}` : undefined} />
      {viewer ? (
        <Timeline
          posts={posts}
          viewer={viewer}
          emptyTitle={t("bookmarksEmptyTitle")}
          emptyText={t("bookmarksEmptyText")}
        />
      ) : (
        <div className="mx-auto max-w-[400px] px-8 py-16">
          <h2 className="text-[31px] font-semibold leading-9">{t("bookmarksSignInTitle")}</h2>
          <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">{t("bookmarksSignInText")}</p>
        </div>
      )}
    </>
  );
}
