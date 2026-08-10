import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import PostCard from "@/components/PostCard";
import PostComposer from "@/components/PostComposer";
import Timeline from "@/components/Timeline";
import { getPostById, getPosts, getViewer } from "@/lib/data";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [viewer, post] = await Promise.all([getViewer(), getPostById(id)]);
  if (!post) notFound();
  const replies = await getPosts({ replyToId: id, includeReplies: true });

  return (
    <>
      <PageHeader title="Post" backHref="/" />
      <PostCard post={post} viewer={viewer} detail />
      {viewer && (
        <div className="border-b border-[#2f3336]">
          <PostComposer viewer={viewer} replyToId={post.id} placeholder="Post your reply" compact />
        </div>
      )}
      <Timeline posts={replies} viewer={viewer} emptyTitle="No replies yet" emptyText="Be the first person to reply." />
    </>
  );
}
