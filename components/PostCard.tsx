"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FeedPost, Profile } from "@/lib/types";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";
import {
  BookmarkIcon,
  HeartIcon,
  MoreIcon,
  ReplyIcon,
  RepostIcon,
  ShareIcon,
} from "./icons";

function formatTime(value: string) {
  const date = new Date(value);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${Math.max(seconds, 1)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  const router = useRouter();
  const [liked, setLiked] = useState(post.likedByViewer);
  const [reposted, setReposted] = useState(post.repostedByViewer);
  const [bookmarked, setBookmarked] = useState(post.bookmarkedByViewer);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [repostCount, setRepostCount] = useState(post.repostCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function requireViewer() {
    if (!viewer) {
      router.push("/login");
      return false;
    }
    return true;
  }

  function toggleLike() {
    if (!requireViewer() || !viewer) return;
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

  function toggleRepost() {
    if (!requireViewer() || !viewer) return;
    const next = !reposted;
    setReposted(next);
    setRepostCount((count) => count + (next ? 1 : -1));

    startTransition(async () => {
      const supabase = createClient();
      const result = next
        ? await supabase.from("reposts").insert({ post_id: post.id, user_id: viewer.id })
        : await supabase.from("reposts").delete().eq("post_id", post.id).eq("user_id", viewer.id);

      if (result.error) {
        setReposted(!next);
        setRepostCount((count) => count + (next ? -1 : 1));
      }
    });
  }

  function toggleBookmark() {
    if (!requireViewer() || !viewer) return;
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
    if (navigator.share) {
      await navigator.share({ title: `Post by ${post.author.name}`, text: post.content, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  function deletePost() {
    if (!viewer || viewer.id !== post.author.id) return;
    setMenuOpen(false);

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (!error) router.refresh();
    });
  }

  return (
    <article className={`border-b border-[#2f3336] px-4 py-3 transition hover:bg-white/[0.015] ${detail ? "py-4" : ""}`} aria-busy={isPending}>
      <div className="flex gap-3">
        <Avatar profile={post.author} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 text-[15px] leading-5">
              <Link href={`/${post.author.username}`} className="inline-flex max-w-full items-center gap-1 font-bold hover:underline">
                <span className="truncate">{post.author.name}</span>
                {post.author.verified && <VerifiedBadge />}
              </Link>{" "}
              <span className="text-[#71767b]">@{post.author.username} · </span>
              <Link href={`/post/${post.id}`} className="text-[#71767b] hover:underline" title={new Date(post.createdAt).toLocaleString()}>
                {formatTime(post.createdAt)}
              </Link>
            </div>

            <div className="relative -mr-2 -mt-2">
              <button type="button" onClick={() => setMenuOpen((open) => !open)} className="rounded-full p-2 text-[#71767b] transition hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0]" aria-label="More">
                <MoreIcon size={19} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-9 z-20 min-w-[210px] overflow-hidden rounded-xl bg-black py-1 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                  {viewer?.id === post.author.id ? (
                    <button type="button" onClick={deletePost} className="w-full px-4 py-3 text-left text-[15px] font-bold text-[#f4212e] hover:bg-white/10">
                      Delete post
                    </button>
                  ) : (
                    <button type="button" onClick={() => setMenuOpen(false)} className="w-full px-4 py-3 text-left text-[15px] font-bold hover:bg-white/10">
                      Not interested in this post
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <Link href={`/post/${post.id}`} className="block">
            <p className={`whitespace-pre-wrap break-words text-[#e7e9ea] ${detail ? "mt-3 text-[23px] leading-7" : "mt-0.5 text-[15px] leading-5"}`}>
              {post.content}
            </p>

            {post.imageUrl && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-[#2f3336]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.imageUrl} alt="Post media" className="max-h-[620px] w-full object-cover" />
              </div>
            )}
          </Link>

          <div className={`mt-2 flex max-w-[430px] items-center justify-between text-[#71767b] ${detail ? "border-t border-[#2f3336] pt-2" : ""}`}>
            <Link href={`/post/${post.id}`} className="group flex items-center gap-1 text-[13px] transition hover:text-[#1d9bf0]" aria-label={`${post.replyCount} replies`}>
              <span className="rounded-full p-2 transition group-hover:bg-[#1d9bf0]/10"><ReplyIcon size={18} /></span>
              {post.replyCount > 0 && <span>{post.replyCount}</span>}
            </Link>

            <button type="button" onClick={toggleRepost} className={`group flex items-center gap-1 text-[13px] transition hover:text-[#00ba7c] ${reposted ? "text-[#00ba7c]" : ""}`} aria-label={`${repostCount} reposts`}>
              <span className="rounded-full p-2 transition group-hover:bg-[#00ba7c]/10"><RepostIcon size={18} /></span>
              {repostCount > 0 && <span>{repostCount}</span>}
            </button>

            <button type="button" onClick={toggleLike} className={`group flex items-center gap-1 text-[13px] transition hover:text-[#f91880] ${liked ? "text-[#f91880]" : ""}`} aria-label={`${likeCount} likes`}>
              <span className="rounded-full p-2 transition group-hover:bg-[#f91880]/10"><HeartIcon size={18} fill={liked ? "currentColor" : "none"} /></span>
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            <div className="flex items-center">
              <button type="button" onClick={toggleBookmark} className={`rounded-full p-2 transition hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0] ${bookmarked ? "text-[#1d9bf0]" : ""}`} aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}>
                <BookmarkIcon size={18} fill={bookmarked ? "currentColor" : "none"} />
              </button>
              <button type="button" onClick={sharePost} className="rounded-full p-2 transition hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0]" aria-label="Share post">
                <ShareIcon size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
