import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import PostCard from "@/components/PostCard";
import PostComposer from "@/components/PostComposer";
import Timeline from "@/components/Timeline";
import { getPostById, getPosts, getViewer } from "@/lib/data";
import { getServerI18n } from "@/lib/i18n/server";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getServerI18n();
  const [viewer, post] = await Promise.all([getViewer(), getPostById(id)]);
  if (!post) notFound();
  const replies = await getPosts({ replyToId: id, includeReplies: true });

  return (
    <>
      <PageHeader title={t("postTitle")} backHref="/" />
      <PostCard post={post} viewer={viewer} detail />
      {viewer && (
        <div className="border-b border-[var(--border)]">
          <PostComposer viewer={viewer} replyToId={post.id} placeholder={t("replyPlaceholder")} compact />
        </div>
      )}
      <Timeline
        posts={replies}
        viewer={viewer}
        emptyTitle={t("noRepliesTitle")}
        emptyText={t("noRepliesText")}
      />
    </>
  );
}
