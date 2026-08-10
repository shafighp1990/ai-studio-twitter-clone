"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useI18n } from "@/components/I18nProvider";
import { createClient } from "@/lib/supabase/client";
import type { FeedPost, Profile } from "@/lib/types";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";
import {
  BookmarkIcon,
  HeartIcon,
  MoreIcon,
  ReplyIcon,
  ShareIcon,
} from "./icons";

function formatTime(value: string, intlLocale: string) {
  const date = new Date(value);
  const difference = date.getTime() - Date.now();
  const seconds = Math.round(difference / 1000);
  const absoluteSeconds = Math.abs(seconds);
  const relative = new Intl.RelativeTimeFormat(intlLocale, {
    numeric: "auto",
    style: "narrow",
  });

  if (absoluteSeconds < 60) return relative.format(seconds, "second");
  if (absoluteSeconds < 3600) return relative.format(Math.round(difference / 60_000), "minute");
  if (absoluteSeconds < 86_400) return relative.format(Math.round(difference / 3_600_000), "hour");
  if (absoluteSeconds < 604_800) return relative.format(Math.round(difference / 86_400_000), "day");

  return new Intl.DateTimeFormat(intlLocale, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}

function storagePathFromPublicUrl(url: string | null) {
  if (!url) return null;
  try {
    const marker = "/storage/v1/object/public/social-media/";
    const pathname = new URL(url).pathname;
    const markerIndex = pathname.indexOf(marker);
    return markerIndex >= 0
      ? decodeURIComponent(pathname.slice(markerIndex + marker.length))
      : null;
  } catch {
    return null;
  }
}

export default function PostCard({
  post,
  viewer,
  detail = false,
}: {
  post: FeedPost;
  viewer: Profile | null;
  detail?: boolean;
}) {
  const { intlLocale, t } = useI18n();
  const router = useRouter();
  const [liked, setLiked] = useState(post.likedByViewer);
  const [bookmarked, setBookmarked] = useState(post.bookmarkedByViewer);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const numberFormatter = new Intl.NumberFormat(intlLocale);

  function requireViewer() {
    if (!viewer) {
      router.push("/login");
      return false;
    }
    return true;
  }

  function toggleLike() {
    if (isPending || !requireViewer() || !viewer) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((count) => count + (next ? 1 : -1));

    startTransition(async () => {
      const supabase = createClient();
      const result = next
        ? await supabase.from("post_likes").insert({ post_id: post.id, user_id: viewer.id })
        : await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", viewer.id);

      if (result.error) {
        setLiked(!next);
        setLikeCount((count) => count + (next ? -1 : 1));
      }
    });
  }

  function toggleBookmark() {
    if (isPending || !requireViewer() || !viewer) return;
    const next = !bookmarked;
    setBookmarked(next);

    startTransition(async () => {
      const supabase = createClient();
      const result = next
        ? await supabase.from("bookmarks").insert({ post_id: post.id, user_id: viewer.id })
        : await supabase.from("bookmarks").delete().eq("post_id", post.id).eq("user_id", viewer.id);

      if (result.error) setBookmarked(!next);
    });
  }

  async function sharePost() {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${t("postTitle")} · ${post.author.name}`,
          text: post.content,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Closing the native share sheet is not an application error.
    }
  }

  function deletePost() {
    if (!viewer || viewer.id !== post.author.id) return;
    setMenuOpen(false);

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (!error) {
        const mediaPath = storagePathFromPublicUrl(post.imageUrl);
        if (mediaPath) {
          await supabase.storage.from("social-media").remove([mediaPath]);
        }
        router.refresh();
      }
    });
  }

  return (
    <article className={`border-b border-[#293036] px-4 py-3 transition hover:bg-white/[0.015] ${detail ? "py-4" : ""}`} aria-busy={isPending}>
      <div className="flex gap-3">
        <Avatar profile={post.author} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 text-[15px] leading-5">
              <Link href={`/${post.author.username}`} className="inline-flex max-w-full items-center gap-1 font-bold hover:underline">
                <span className="truncate" dir="auto">{post.author.name}</span>
                {post.author.verified && <VerifiedBadge />}
              </Link>{" "}
              <span className="text-[#8a959c]" dir="ltr">@{post.author.username} · </span>
              <Link
                href={`/post/${post.id}`}
                className="text-[#8a959c] hover:underline"
                title={new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(post.createdAt))}
              >
                {formatTime(post.createdAt, intlLocale)}
              </Link>
            </div>

            {viewer?.id === post.author.id && (
              <div className="relative -me-2 -mt-2">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  disabled={isPending}
                  className="p-2 text-[#8a959c] transition hover:bg-[#72a7c7]/10 hover:text-[#72a7c7]"
                  aria-label={t("more")}
                  aria-expanded={menuOpen}
                >
                  <MoreIcon size={19} />
                </button>
                {menuOpen && (
                  <div className="absolute end-0 top-9 z-20 min-w-[210px] border border-[#293036] bg-[#15191c] py-1 shadow-xl">
                    <button
                      type="button"
                      onClick={deletePost}
                      className="w-full px-4 py-3 text-start text-[15px] font-bold text-[#f25f68] hover:bg-white/[0.06]"
                    >
                      {t("deletePost")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <Link href={`/post/${post.id}`} className="block">
            <p dir="auto" className={`whitespace-pre-wrap break-words text-start text-[#e7ebed] ${detail ? "mt-3 text-[23px] leading-7" : "mt-0.5 text-[15px] leading-5"}`}>
              {post.content}
            </p>

            {post.imageUrl && (
              <div className="mt-3 overflow-hidden border border-[#293036]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.imageUrl} alt={t("postMediaAlt")} className="max-h-[620px] w-full object-cover" />
              </div>
            )}
          </Link>

          <div className={`mt-2 flex max-w-[430px] items-center justify-between text-[#8a959c] ${detail ? "border-t border-[#293036] pt-2" : ""}`}>
            <Link href={`/post/${post.id}`} className="group flex items-center gap-1 text-[13px] transition hover:text-[#72a7c7]" aria-label={t("repliesCount", { count: numberFormatter.format(post.replyCount) })}>
              <span className="p-2 transition group-hover:bg-[#72a7c7]/10"><ReplyIcon size={18} /></span>
              {post.replyCount > 0 && <span>{numberFormatter.format(post.replyCount)}</span>}
            </Link>

            <button
              type="button"
              onClick={toggleLike}
              disabled={isPending}
              aria-pressed={liked}
              className={`group flex items-center gap-1 text-[13px] transition hover:text-[#d66a91] disabled:opacity-60 ${liked ? "text-[#d66a91]" : ""}`}
              aria-label={`${t(liked ? "unlikePost" : "likePost")} · ${t("likesCount", { count: numberFormatter.format(likeCount) })}`}
            >
              <span className="p-2 transition group-hover:bg-[#d66a91]/10"><HeartIcon size={18} fill={liked ? "currentColor" : "none"} /></span>
              {likeCount > 0 && <span>{numberFormatter.format(likeCount)}</span>}
            </button>

            <div className="flex items-center">
              <button type="button" onClick={toggleBookmark} disabled={isPending} aria-pressed={bookmarked} className={`p-2 transition hover:bg-[#72a7c7]/10 hover:text-[#72a7c7] disabled:opacity-60 ${bookmarked ? "text-[#72a7c7]" : ""}`} aria-label={bookmarked ? t("removeBookmark") : t("bookmark")}>
                <BookmarkIcon size={18} fill={bookmarked ? "currentColor" : "none"} />
              </button>
              <button type="button" onClick={sharePost} className="p-2 transition hover:bg-[#72a7c7]/10 hover:text-[#72a7c7]" aria-label={t("sharePost")}>
                <ShareIcon size={18} />
              </button>
            </div>
          </div>
          {copied && <p role="status" className="mt-1 text-end text-xs text-[#72a7c7]">{t("copied")}</p>}
        </div>
      </div>
    </article>
  );
}
