import PageHeader from "@/components/PageHeader";
import Timeline from "@/components/Timeline";
import { getPosts, getViewer } from "@/lib/data";

export default async function BookmarksPage() {
  const viewer = await getViewer();
  const posts = viewer ? await getPosts({ bookmarkedBy: viewer.id, includeReplies: true }) : [];

  return (
    <>
      <PageHeader title="Bookmarks" subtitle={viewer ? `@${viewer.username}` : undefined} />
      {viewer ? (
        <Timeline posts={posts} viewer={viewer} emptyTitle="Save posts for later" emptyText="Bookmark posts to easily find them again in the future." />
      ) : (
        <div className="mx-auto max-w-[400px] px-8 py-16">
          <h2 className="text-[31px] font-extrabold">Sign in to see bookmarks</h2>
          <p className="mt-2 text-[15px] text-[#71767b]">Your saved posts are private and available only to you.</p>
        </div>
      )}
    </>
  );
}
