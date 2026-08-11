import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import PageHeader from "@/components/PageHeader";
import PostCard from "@/components/PostCard";
import PostComposer from "@/components/PostComposer";
import Timeline from "@/components/Timeline";
import { getPostById, getPosts, getViewer } from "@/lib/data";
import { isLocale, translate } from "@/lib/i18n";
import { getServerI18n } from "@/lib/i18n/server";

const getCachedPost = cache(getPostById);

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [query, serverI18n, post] = await Promise.all([
    searchParams,
    getServerI18n(),
    getCachedPost(id),
  ]);

  if (!post) return {};

  const requestedLocale = Array.isArray(query.lang) ? query.lang[0] : query.lang;
  const locale = isLocale(requestedLocale) ? requestedLocale : serverI18n.locale;
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values);
  const title = t("postBy", { name: post.author.name });
  const rawDescription = post.content.trim() || t("externalSharedPost");
  const description = rawDescription.length > 160
    ? `${rawDescription.slice(0, 157)}…`
    : rawDescription;
  const canonical = `/post/${post.id}`;
  const localizedUrl = `${canonical}?lang=${locale}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      url: localizedUrl,
      publishedTime: post.createdAt,
      authors: [`/${post.author.username}`],
      images: post.imageUrl ? [{ url: post.imageUrl }] : undefined,
    },
    twitter: {
      card: post.imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: post.imageUrl ? [post.imageUrl] : undefined,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getServerI18n();
  const [viewer, post] = await Promise.all([getViewer(), getCachedPost(id)]);
  if (!post) notFound();
  const replies = await getPosts({ replyToId: id, includeReplies: true });

  return (
    <>
      <PageHeader title={t("postTitle")} backHref="/" />
      <PostCard post={post} viewer={viewer} detail />
      {!viewer && (
        <section className="border-b border-[var(--border)] bg-[#101315] px-5 py-5">
          <h2 className="text-lg font-semibold text-[#e7ebed]">
            {t("joinConversationTitle")}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#aab4ba]">
            {t("joinConversationText")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/register"
              className="bg-[#72a7c7] px-4 py-2 text-sm font-bold text-[#0b0d0e] hover:bg-[#86b8d4]"
            >
              {t("createAccount")}
            </Link>
            <Link
              href="/login"
              className="border border-[#52616b] px-4 py-2 text-sm font-bold text-[#e7ebed] hover:border-[#72a7c7] hover:text-[#72a7c7]"
            >
              {t("signIn")}
            </Link>
          </div>
        </section>
      )}
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
