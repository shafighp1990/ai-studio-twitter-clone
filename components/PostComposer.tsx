"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";
import {
  externalPlatformLabel,
  parseExternalPostUrl,
} from "@/lib/external-posts";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import Avatar from "./Avatar";
import { CloseIcon, ImageIcon, LinkIcon } from "./icons";

export default function PostComposer({
  viewer,
  replyToId,
  placeholder,
  compact = false,
}: {
  viewer: Profile;
  replyToId?: string;
  placeholder?: string;
  compact?: boolean;
}) {
  const { intlLocale, t } = useI18n();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const externalUrlInputRef = useRef<HTMLInputElement>(null);
  const externalSourceTriggerRef = useRef<HTMLButtonElement>(null);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [externalFieldOpen, setExternalFieldOpen] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const remaining = 280 - content.length;
  const externalReference = parseExternalPostUrl(externalUrl);
  const hasExternalUrl = externalUrl.trim().length > 0;
  const hasPostBody = content.trim().length > 0 || Boolean(externalReference);
  const canPost = hasPostBody
    && remaining >= 0
    && (!hasExternalUrl || Boolean(externalReference))
    && !isPending;

  function handleImage(file?: File) {
    setError("");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t("imageFileOnly"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(t("imageTooLarge"));
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function removeImage() {
    if (preview) URL.revokeObjectURL(preview);
    setImage(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeExternalSource(restoreFocus = false) {
    setExternalUrl("");
    setExternalFieldOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => externalSourceTriggerRef.current?.focus());
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!canPost) return;

    startTransition(async () => {
      const supabase = createClient();
      let imageUrl: string | null = null;
      let uploadedPath: string | null = null;

      if (image) {
        const extension = image.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `${viewer.id}/posts/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("social-media")
          .upload(filePath, image, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          setError(t("requestFailed"));
          return;
        }

        uploadedPath = filePath;
        imageUrl = supabase.storage.from("social-media").getPublicUrl(filePath)
          .data.publicUrl;
      }

      const { error: postError } = await supabase.from("posts").insert({
        author_id: viewer.id,
        content: content.trim(),
        image_url: imageUrl,
        external_platform: externalReference?.platform ?? null,
        external_url: externalReference?.url ?? null,
        reply_to_id: replyToId ?? null,
      });

      if (postError) {
        if (uploadedPath) {
          await supabase.storage.from("social-media").remove([uploadedPath]);
        }
        setError(t("requestFailed"));
        return;
      }

      setContent("");
      removeImage();
      removeExternalSource();
      router.refresh();
    });
  }

  return (
    <form
      id={replyToId ? undefined : "composer"}
      onSubmit={handleSubmit}
      className={`flex gap-3 ${compact ? "p-4" : "px-4 py-3"}`}
    >
      <Avatar profile={viewer} size={40} />
      <div className="min-w-0 flex-1">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={placeholder ?? (externalReference
            ? t("externalCommentPlaceholder")
            : replyToId
              ? t("replyPlaceholder")
              : t("composerPlaceholder"))}
          rows={compact ? 2 : 3}
          maxLength={280}
          dir="auto"
          className="w-full resize-none bg-transparent pt-2 text-start text-xl leading-6 text-[#e7ebed] outline-none placeholder:text-[#8a959c]"
          aria-label={replyToId ? t("replyPlaceholder") : t("postText")}
        />

        {preview && (
          <div className="relative mt-2 overflow-hidden border border-[#293036]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={t("selectedImageAlt")} className="max-h-[420px] w-full object-cover" />
            <button
              type="button"
              onClick={removeImage}
              className="absolute end-2 top-2 bg-[#0b0d0e]/85 p-2 text-white hover:bg-[#0b0d0e]"
              aria-label={t("removeImage")}
            >
              <CloseIcon size={20} />
            </button>
          </div>
        )}

        {externalFieldOpen && (
          <div id={`external-source-${replyToId ?? "post"}`} className="mt-2 border border-[#364048] bg-[#101315] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <label htmlFor={`external-url-${replyToId ?? "post"}`} className="block text-sm font-semibold text-[#d8dee2]">
                  {t("externalUrlLabel")}
                </label>
                <input
                  ref={externalUrlInputRef}
                  id={`external-url-${replyToId ?? "post"}`}
                  name="externalUrl"
                  type="url"
                  inputMode="url"
                  dir="ltr"
                  value={externalUrl}
                  onChange={(event) => setExternalUrl(event.target.value)}
                  placeholder={t("externalUrlPlaceholder")}
                  aria-describedby={`external-help-${replyToId ?? "post"}${hasExternalUrl && !externalReference ? ` external-error-${replyToId ?? "post"}` : ""}`}
                  aria-errormessage={hasExternalUrl && !externalReference ? `external-error-${replyToId ?? "post"}` : undefined}
                  aria-invalid={hasExternalUrl && !externalReference}
                  className="mt-2 w-full border border-[#52616b] bg-[#0b0d0e] px-3 py-2 text-start text-sm text-[#e7ebed] outline-none placeholder:text-[#6f7b82] focus:border-[#72a7c7]"
                />
                <p id={`external-help-${replyToId ?? "post"}`} className="mt-2 text-xs leading-5 text-[#8a959c]">
                  {t("externalUrlHelp")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeExternalSource(true)}
                className="p-1 text-[#8a959c] hover:text-[#e7ebed]"
                aria-label={t("externalRemoveSource")}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            {hasExternalUrl && !externalReference && (
              <p id={`external-error-${replyToId ?? "post"}`} role="alert" className="mt-2 text-sm text-[#f25f68]">
                {t("externalUrlInvalid")}
              </p>
            )}

            {externalReference && (
              <p role="status" className="mt-2 break-all text-sm text-[#72a7c7]" dir="auto">
                {t("externalSourceReady", {
                  platform: externalPlatformLabel(externalReference.platform),
                })}
              </p>
            )}
          </div>
        )}

        {error && <p role="alert" className="mt-2 text-sm text-[#f25f68]">{error}</p>}

        <div className="mt-2 flex items-center justify-between border-t border-[#293036] pt-2">
          <div className="flex items-center text-[#72a7c7]">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(event) => handleImage(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 transition hover:bg-[#72a7c7]/10"
              aria-label={t("addImage")}
            >
              <ImageIcon size={20} />
            </button>
            <button
              ref={externalSourceTriggerRef}
              type="button"
              onClick={() => {
                if (externalFieldOpen) removeExternalSource(true);
                else {
                  setExternalFieldOpen(true);
                  window.requestAnimationFrame(() => externalUrlInputRef.current?.focus());
                }
              }}
              className={`p-2 transition hover:bg-[#72a7c7]/10 ${externalFieldOpen ? "bg-[#72a7c7]/10" : ""}`}
              aria-label={t("externalQuoteAction")}
              aria-expanded={externalFieldOpen}
              aria-controls={`external-source-${replyToId ?? "post"}`}
            >
              <LinkIcon size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {content.length > 0 && (
              <span className={`text-sm ${remaining < 0 ? "text-[#f25f68]" : remaining < 20 ? "text-[#d6a84a]" : "text-[#8a959c]"}`}>
                {new Intl.NumberFormat(intlLocale).format(remaining)}
              </span>
            )}
            <button
              type="submit"
              disabled={!canPost}
              className="bg-[#72a7c7] px-4 py-2 text-[15px] font-bold text-[#0b0d0e] transition hover:bg-[#86b8d4] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending
                ? replyToId
                  ? t("replying")
                  : t("posting")
                : replyToId
                  ? t("reply")
                  : t("navPost")}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
