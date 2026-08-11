import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import PostComposer from "@/components/PostComposer";
import Timeline from "@/components/Timeline";
import { getPosts, getViewer } from "@/lib/data";
import { getServerI18n } from "@/lib/i18n/server";

export default async function HomePage() {
  const viewer = await getViewer();

  if (!viewer) redirect("/login");

  const [{ t }, posts] = await Promise.all([getServerI18n(), getPosts()]);

  return (
    <>
      <PageHeader title={t("homeTitle")} />

      <div className="border-b border-[var(--border)]">
        <PostComposer viewer={viewer} />
      </div>

      <Timeline
        posts={posts}
        viewer={viewer}
        emptyTitle={t("timelineEmptyTitle")}
        emptyText={t("timelineEmptyText")}
      />
    </>
  );
}
