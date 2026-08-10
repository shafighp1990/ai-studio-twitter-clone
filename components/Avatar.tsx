import Link from "next/link";
import type { Profile } from "@/lib/types";

export default function Avatar({
  profile,
  size = 40,
  link = true,
}: {
  profile: Pick<Profile, "username" | "name" | "avatar_url">;
  size?: number;
  link?: boolean;
}) {
  const avatar = profile.avatar_url ? (
    // User-controlled Supabase Storage URLs are intentionally rendered directly.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={profile.avatar_url}
      alt={`${profile.name}'s avatar`}
      width={size}
      height={size}
      className="h-full w-full object-cover"
    />
  ) : (
    <span className="text-base font-bold text-white">
      {profile.name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );

  const content = (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#333639]"
      style={{ width: size, height: size }}
    >
      {avatar}
    </span>
  );

  return link ? <Link href={`/${profile.username}`}>{content}</Link> : content;
}
