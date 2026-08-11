"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import type { FeedPost } from "@/lib/types";
import { LinkIcon, ShareIcon, XLogo } from "./icons";

export default function ShareMenu({ post }: { post: FeedPost }) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<"copied" | "error" | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const closeAndRestoreFocus = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;

    function closeMenu(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAndRestoreFocus();
      }
    }

    window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    });

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [closeAndRestoreFocus, open]);

  function postUrl() {
    return shareUrl || `${window.location.origin}/post/${post.id}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(postUrl());
      setShareStatus("copied");
      closeAndRestoreFocus();
      window.setTimeout(() => setShareStatus(null), 2500);
    } catch {
      setShareStatus("error");
      closeAndRestoreFocus();
      window.setTimeout(() => setShareStatus(null), 3500);
    }
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copyLink();
      return;
    }

    try {
      await navigator.share({
        title: `${t("postTitle")} · ${post.author.name}`,
        text: post.content || t("externalSharedPost"),
        url: postUrl(),
      });
      closeAndRestoreFocus();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareStatus("error");
      closeAndRestoreFocus();
      window.setTimeout(() => setShareStatus(null), 3500);
    }
  }

  const encodedShareUrl = encodeURIComponent(shareUrl);
  const shareText = encodeURIComponent(t("postBy", { name: post.author.name }));

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          const nextOpen = !open;
          if (nextOpen) {
            const url = new URL(`/post/${post.id}`, window.location.origin);
            url.searchParams.set("lang", locale);
            setShareUrl(url.toString());
            setShareStatus(null);
          }
          setOpen(nextOpen);
        }}
        className="p-2 transition hover:bg-[#72a7c7]/10 hover:text-[#72a7c7]"
        aria-label={t("sharePost")}
        aria-expanded={open}
        aria-controls={`share-menu-${post.id}`}
      >
        <ShareIcon size={18} />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={`share-menu-${post.id}`}
          role="dialog"
          aria-label={t("shareOptions")}
          className="absolute bottom-10 end-0 z-30 min-w-[230px] border border-[#364048] bg-[#15191c] py-1 text-[#e7ebed] shadow-2xl"
        >
          <button
            type="button"
            onClick={nativeShare}
            className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm font-semibold hover:bg-white/[0.06]"
          >
            <ShareIcon size={18} />
            {t("shareToApps")}
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm font-semibold hover:bg-white/[0.06]"
          >
            <LinkIcon size={18} />
            {t("copyLink")}
          </button>
          <a
            href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodedShareUrl}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={closeAndRestoreFocus}
            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-white/[0.06]"
          >
            <XLogo size={18} />
            {t("shareOnX")}
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={closeAndRestoreFocus}
            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-white/[0.06]"
          >
            <span aria-hidden="true" className="grid h-[18px] w-[18px] place-items-center bg-[#1877f2] text-xs font-bold text-white">f</span>
            {t("shareOnFacebook")}
          </a>
        </div>
      )}

      {shareStatus && (
        <p role="status" className="absolute bottom-11 end-0 z-20 whitespace-nowrap bg-[#15191c] px-2 py-1 text-xs text-[#72a7c7]">
          {t(shareStatus === "copied" ? "copied" : "shareFailed")}
        </p>
      )}
    </div>
  );
}
