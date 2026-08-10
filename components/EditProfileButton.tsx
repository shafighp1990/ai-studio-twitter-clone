"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import Avatar from "./Avatar";
import { CloseIcon, ImageIcon } from "./icons";

export default function EditProfileButton({ profile }: { profile: Profile }) {
  const router = useRouter();
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
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

  function selectImage(file: File | undefined, kind: "avatar" | "banner") {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setError("Choose an image smaller than 5 MB.");
      return;
    }
    const preview = URL.createObjectURL(file);
    if (kind === "avatar") {
      setAvatarFile(file);
      setAvatarPreview(preview);
    } else {
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
    return supabase.storage.from("social-media").getPublicUrl(path).data.publicUrl;
  }

  function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const [avatarUrl, bannerUrl] = await Promise.all([
          avatarFile ? uploadImage(avatarFile, "avatars") : profile.avatar_url,
          bannerFile ? uploadImage(bannerFile, "banners") : profile.banner_url,
        ]);
        const supabase = createClient();
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
        setOpen(false);
        router.refresh();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Could not update profile.");
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-[#536471] px-4 py-1.5 text-[15px] font-bold transition hover:bg-white/10">
        Edit profile
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[#5b7083]/40 p-0 sm:items-center sm:p-5">
          <form onSubmit={saveProfile} className="h-full w-full overflow-y-auto bg-black sm:h-auto sm:max-h-[90vh] sm:max-w-[600px] sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex h-[53px] items-center justify-between bg-black/90 px-4 backdrop-blur">
              <div className="flex items-center gap-6">
                <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close">
                  <CloseIcon size={21} />
                </button>
                <h2 className="text-xl font-bold">Edit profile</h2>
              </div>
              <button type="submit" disabled={isPending || !name.trim()} className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black disabled:opacity-50">
                {isPending ? "Saving…" : "Save"}
              </button>
            </div>

            <div className="relative h-[200px] bg-[#333639]">
              {bannerPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bannerPreview} alt="Banner preview" className="h-full w-full object-cover" />
              )}
              <button type="button" onClick={() => bannerInput.current?.click()} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 hover:bg-black/80" aria-label="Change banner">
                <ImageIcon size={22} />
              </button>
              <input ref={bannerInput} type="file" accept="image/*" className="hidden" onChange={(event) => selectImage(event.target.files?.[0], "banner")} />
            </div>

            <div className="relative -mt-[52px] ml-4 h-[112px] w-[112px] rounded-full border-4 border-black bg-[#333639]">
              <Avatar profile={{ ...profile, avatar_url: avatarPreview }} size={104} link={false} />
              <button type="button" onClick={() => avatarInput.current?.click()} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 hover:bg-black/80" aria-label="Change avatar">
                <ImageIcon size={20} />
              </button>
              <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={(event) => selectImage(event.target.files?.[0], "avatar")} />
            </div>

            <div className="space-y-5 px-4 pb-7">
              <label className="block rounded border border-[#536471] px-3 py-2 focus-within:border-[#1d9bf0] focus-within:ring-1 focus-within:ring-[#1d9bf0]">
                <span className="block text-[13px] text-[#71767b]">Name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} className="w-full bg-transparent text-[17px] outline-none" />
              </label>
              <label className="block rounded border border-[#536471] px-3 py-2 focus-within:border-[#1d9bf0] focus-within:ring-1 focus-within:ring-[#1d9bf0]">
                <span className="block text-[13px] text-[#71767b]">Bio</span>
                <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} rows={3} className="w-full resize-none bg-transparent text-[17px] outline-none" />
              </label>
              <label className="block rounded border border-[#536471] px-3 py-2 focus-within:border-[#1d9bf0] focus-within:ring-1 focus-within:ring-[#1d9bf0]">
                <span className="block text-[13px] text-[#71767b]">Location</span>
                <input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={50} className="w-full bg-transparent text-[17px] outline-none" />
              </label>
              <label className="block rounded border border-[#536471] px-3 py-2 focus-within:border-[#1d9bf0] focus-within:ring-1 focus-within:ring-[#1d9bf0]">
                <span className="block text-[13px] text-[#71767b]">Website</span>
                <input value={website} onChange={(event) => setWebsite(event.target.value)} maxLength={100} className="w-full bg-transparent text-[17px] outline-none" />
              </label>
              {error && <p className="text-sm text-[#f4212e]">{error}</p>}
            </div>
          </form>
        </div>
      )}
    </>
  );
}
