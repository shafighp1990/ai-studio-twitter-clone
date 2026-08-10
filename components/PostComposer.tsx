"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import Avatar from "./Avatar";
import { CalendarIcon, CloseIcon, ImageIcon, SmileIcon } from "./icons";

export default function PostComposer({
  viewer,
  replyToId,
  placeholder = "What is happening?!",
  compact = false,
}: {
  viewer: Profile;
  replyToId?: string;
  placeholder?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const remaining = 280 - content.length;
  const canPost = content.trim().length > 0 && remaining >= 0 && !isPending;

  function handleImage(file?: File) {
    setError("");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("The image must be smaller than 5 MB.");
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!canPost) return;

    startTransition(async () => {
      const supabase = createClient();
      let imageUrl: string | null = null;

      if (image) {
        const extension = image.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `${viewer.id}/posts/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("social-media")
          .upload(filePath, image, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          setError(uploadError.message);
          return;
        }

        imageUrl = supabase.storage.from("social-media").getPublicUrl(filePath)
          .data.publicUrl;
      }

      const { error: postError } = await supabase.from("posts").insert({
        author_id: viewer.id,
        content: content.trim(),
        image_url: imageUrl,
        reply_to_id: replyToId ?? null,
      });

      if (postError) {
        setError(postError.message);
        return;
      }

      setContent("");
      removeImage();
      router.refresh();
    });
  }

  return (
    <form id={replyToId ? undefined : "composer"} onSubmit={handleSubmit} className={`flex gap-3 ${compact ? "p-4" : "px-4 py-3"}`}>
      <Avatar profile={viewer} size={40} />
      <div className="min-w-0 flex-1">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={placeholder}
          rows={compact ? 2 : 3}
          maxLength={320}
          className="w-full resize-none bg-transparent pt-2 text-xl leading-6 text-[#e7e9ea] outline-none placeholder:text-[#71767b]"
          aria-label={replyToId ? "Post your reply" : "Post text"}
        />

        {preview && (
          <div className="relative mt-2 overflow-hidden rounded-2xl border border-[#2f3336]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Selected upload preview" className="max-h-[420px] w-full object-cover" />
            <button type="button" onClick={removeImage} className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white hover:bg-black/90" aria-label="Remove image">
              <CloseIcon size={20} />
            </button>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-[#f4212e]">{error}</p>}

        <div className="mt-2 flex items-center justify-between border-t border-[#2f3336] pt-2">
          <div className="flex items-center text-[#1d9bf0]">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(event) => handleImage(event.target.files?.[0])}
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-full p-2 transition hover:bg-[#1d9bf0]/10" aria-label="Add image">
              <ImageIcon size={20} />
            </button>
            <button type="button" className="rounded-full p-2 opacity-50" aria-label="Add emoji" title="Emoji picker coming soon">
              <SmileIcon size={20} />
            </button>
            <button type="button" className="hidden rounded-full p-2 opacity-50 sm:block" aria-label="Schedule post" title="Scheduling coming soon">
              <CalendarIcon size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {content.length > 0 && (
              <span className={`text-sm ${remaining < 0 ? "text-[#f4212e]" : remaining < 20 ? "text-[#ffd400]" : "text-[#71767b]"}`}>
                {remaining}
              </span>
            )}
            <button type="submit" disabled={!canPost} className="rounded-full bg-[#1d9bf0] px-4 py-2 text-[15px] font-bold text-white transition hover:bg-[#1a8cd8] disabled:cursor-not-allowed disabled:opacity-50">
              {isPending ? "Posting…" : replyToId ? "Reply" : "Post"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
