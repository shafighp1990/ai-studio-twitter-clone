"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import Avatar from "./Avatar";
import { useI18n } from "./I18nProvider";
import { CloseIcon, ImageIcon } from "./icons";

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

export default function EditProfileButton({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { t } = useI18n();
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const triggerButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [location, setLocation] = useState(profile.location);
  const [website, setWebsite] = useState(profile.website);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url);
  const [bannerPreview, setBannerPreview] = useState(profile.banner_url);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function releaseObjectPreviews() {
    if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    if (bannerPreview?.startsWith("blob:")) URL.revokeObjectURL(bannerPreview);
  }

  function resetDraft() {
    releaseObjectPreviews();
    setName(profile.name);
    setBio(profile.bio);
    setLocation(profile.location);
    setWebsite(profile.website);
    setAvatarFile(null);
    setBannerFile(null);
    setAvatarPreview(profile.avatar_url);
    setBannerPreview(profile.banner_url);
    setError("");
    if (avatarInput.current) avatarInput.current.value = "";
    if (bannerInput.current) bannerInput.current.value = "";
  }

  function openEditor() {
    resetDraft();
    setOpen(true);
  }

  function closeEditor() {
    resetDraft();
    setOpen(false);
    window.setTimeout(() => triggerButton.current?.focus(), 0);
  }

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeEditor();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="file"]), textarea:not([disabled])',
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function selectImage(file: File | undefined, kind: "avatar" | "banner") {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("imageFileOnly"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t("imageTooLarge"));
      return;
    }
    const preview = URL.createObjectURL(file);
    if (kind === "avatar") {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
      setAvatarFile(file);
      setAvatarPreview(preview);
    } else {
      if (bannerPreview?.startsWith("blob:")) URL.revokeObjectURL(bannerPreview);
      setBannerFile(file);
      setBannerPreview(preview);
    }
  }

  async function uploadImage(file: File, kind: "avatars" | "banners") {
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profile.id}/${kind}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("social-media")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) throw uploadError;
    return {
      path,
      url: supabase.storage.from("social-media").getPublicUrl(path).data.publicUrl,
    };
  }

  function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const supabase = createClient();
      const uploadedPaths: string[] = [];
      try {
        let avatarUrl = profile.avatar_url;
        let bannerUrl = profile.banner_url;

        if (avatarFile) {
          const upload = await uploadImage(avatarFile, "avatars");
          avatarUrl = upload.url;
          uploadedPaths.push(upload.path);
        }
        if (bannerFile) {
          const upload = await uploadImage(bannerFile, "banners");
          bannerUrl = upload.url;
          uploadedPaths.push(upload.path);
        }

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            name: name.trim(),
            bio: bio.trim(),
            location: location.trim(),
            website: website.trim(),
            avatar_url: avatarUrl,
            banner_url: bannerUrl,
          })
          .eq("id", profile.id);

        if (updateError) throw updateError;

        const stalePaths = [
          avatarFile ? storagePathFromPublicUrl(profile.avatar_url) : null,
          bannerFile ? storagePathFromPublicUrl(profile.banner_url) : null,
        ].filter((path): path is string => Boolean(path));
        if (stalePaths.length > 0) {
          await supabase.storage.from("social-media").remove(stalePaths);
        }

        releaseObjectPreviews();
        setAvatarFile(null);
        setBannerFile(null);
        setAvatarPreview(avatarUrl);
        setBannerPreview(bannerUrl);
        setOpen(false);
        window.setTimeout(() => triggerButton.current?.focus(), 0);
        router.refresh();
      } catch {
        if (uploadedPaths.length > 0) {
          await supabase.storage.from("social-media").remove(uploadedPaths);
        }
        setError(t("profileUpdateError"));
      }
    });
  }

  return (
    <>
      <button ref={triggerButton} type="button" onClick={openEditor} className="rounded border border-[#52616b] px-4 py-1.5 text-[15px] font-semibold transition hover:bg-white/[0.07]">
        {t("editProfile")}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 p-0 sm:items-center sm:p-5">
          <form
            onSubmit={saveProfile}
            onKeyDown={handleDialogKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className="h-full w-full overflow-y-auto bg-[#0b0d0e] sm:h-auto sm:max-h-[90vh] sm:max-w-[600px] sm:rounded"
          >
            <div className="sticky top-0 z-10 flex h-[58px] items-center justify-between border-b border-[#293036] bg-[#0b0d0e] px-4">
              <div className="flex items-center gap-6">
                <button type="button" onClick={closeEditor} autoFocus className="rounded p-2 hover:bg-white/[0.07]" aria-label={t("close")}>
                  <CloseIcon size={21} />
                </button>
                <h2 id="edit-profile-title" className="text-xl font-bold">{t("editProfile")}</h2>
              </div>
              <button type="submit" disabled={isPending || !name.trim()} className="rounded bg-[#72a7c7] px-4 py-1.5 text-sm font-bold text-[#071015] hover:bg-[#86b8d4] disabled:opacity-50">
                {isPending ? t("saving") : t("save")}
              </button>
            </div>

            <div className="relative h-[200px] bg-[#2a3136]">
              {bannerPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bannerPreview} alt={t("bannerAlt", { name })} className="h-full w-full object-cover" />
              )}
              <button type="button" onClick={() => bannerInput.current?.click()} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-black/70 p-3 hover:bg-black/90" aria-label={t("changeBanner")}>
                <ImageIcon size={22} />
              </button>
              <input ref={bannerInput} type="file" accept="image/*" className="hidden" onChange={(event) => selectImage(event.target.files?.[0], "banner")} />
            </div>

            <div className="relative -mt-[52px] ms-4 h-[112px] w-[112px] rounded-full border-4 border-[#0b0d0e] bg-[#2a3136]">
              <Avatar profile={{ ...profile, avatar_url: avatarPreview }} size={104} link={false} />
              <button type="button" onClick={() => avatarInput.current?.click()} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-black/70 p-2 hover:bg-black/90" aria-label={t("changeAvatar")}>
                <ImageIcon size={20} />
              </button>
              <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={(event) => selectImage(event.target.files?.[0], "avatar")} />
            </div>

            <div className="space-y-5 px-4 pb-7">
              <label className="block rounded border border-[#52616b] px-3 py-2 focus-within:border-[#72a7c7]">
                <span className="block text-[13px] text-[#8a959c]">{t("name")}</span>
                <input dir="auto" name="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={50} className="w-full bg-transparent text-[17px] outline-none" />
              </label>
              <label className="block rounded border border-[#52616b] px-3 py-2 focus-within:border-[#72a7c7]">
                <span className="block text-[13px] text-[#8a959c]">{t("bio")}</span>
                <textarea dir="auto" name="bio" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} rows={3} className="w-full resize-none bg-transparent text-[17px] outline-none" />
              </label>
              <label className="block rounded border border-[#52616b] px-3 py-2 focus-within:border-[#72a7c7]">
                <span className="block text-[13px] text-[#8a959c]">{t("location")}</span>
                <input dir="auto" name="location" value={location} onChange={(event) => setLocation(event.target.value)} maxLength={50} className="w-full bg-transparent text-[17px] outline-none" />
              </label>
              <label className="block rounded border border-[#52616b] px-3 py-2 focus-within:border-[#72a7c7]">
                <span className="block text-[13px] text-[#8a959c]">{t("website")}</span>
                <input dir="ltr" name="website" type="text" inputMode="url" value={website} onChange={(event) => setWebsite(event.target.value)} maxLength={100} className="w-full bg-transparent text-[17px] outline-none" />
              </label>
              {error && <p className="text-sm text-[#f4212e]">{error}</p>}
            </div>
          </form>
        </div>
      )}
    </>
  );
}
