import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PostComposer from "@/components/PostComposer";
import Timeline from "@/components/Timeline";
import { getPosts, getViewer } from "@/lib/data";
import { getServerI18n } from "@/lib/i18n/server";

export default async function HomePage() {
  const { t } = await getServerI18n();
  const [viewer, posts] = await Promise.all([getViewer(), getPosts()]);

  return (
    <>
      <PageHeader title={t("homeTitle")} />

      {viewer ? (
        <div className="border-b border-[var(--border)]">
          <PostComposer viewer={viewer} />
        </div>
      ) : (
        <section className="border-b border-[var(--border)] px-6 py-6">
          <h2 className="text-xl font-semibold">{t("homeGuestTitle")}</h2>
          <p className="mt-2 max-w-xl text-[15px] leading-6 text-[var(--muted)]">{t("homeGuestText")}</p>
          <div className="mt-4 flex gap-3">
            <Link href="/login" className="rounded-sm bg-[var(--foreground)] px-5 py-2 text-[15px] font-semibold text-[var(--background)]">{t("signIn")}</Link>
            <Link href="/register" className="rounded-sm border border-[var(--border)] px-5 py-2 text-[15px] font-semibold">{t("createAccount")}</Link>
          </div>
        </section>
      )}

      <Timeline
        posts={posts}
        viewer={viewer}
        emptyTitle={t("timelineEmptyTitle")}
        emptyText={t("timelineEmptyText")}
      />
    </>
  );
}
