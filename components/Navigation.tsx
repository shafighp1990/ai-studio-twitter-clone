"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import Avatar from "./Avatar";
import {
  AIStudioLogo,
  BellIcon,
  BookmarkIcon,
  ComposeIcon,
  HomeIcon,
  MailIcon,
  MoreIcon,
  SearchIcon,
  UserIcon,
} from "./icons";

const navigation = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/explore", label: "Explore", icon: SearchIcon },
  { href: "/notifications", label: "Notifications", icon: BellIcon },
  { href: "/messages", label: "Messages", icon: MailIcon },
  { href: "/bookmarks", label: "Bookmarks", icon: BookmarkIcon },
];

export default function Navigation({ viewer }: { viewer: Profile | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const profileHref = viewer ? `/${viewer.username}` : "/login";

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[88px] shrink-0 flex-col justify-between px-3 py-2 sm:flex xl:w-[275px] xl:px-2">
        <div>
          <Link
            href="/"
            className="mb-1 flex h-[52px] w-[52px] items-center justify-center rounded-full text-[#1d9bf0] transition hover:bg-[#1d9bf0]/10 xl:ml-2"
            aria-label="AI Studio home"
          >
            <AIStudioLogo size={39} />
          </Link>

          <nav aria-label="Primary navigation">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex w-fit items-center gap-5 rounded-full px-3 py-3 text-xl transition hover:bg-[#eff3f4]/10"
                >
                  <Icon size={27} strokeWidth={active ? 2.6 : 2} />
                  <span className={`hidden xl:inline ${active ? "font-bold" : "font-normal"}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}

            <Link
              href={profileHref}
              className="flex w-fit items-center gap-5 rounded-full px-3 py-3 text-xl transition hover:bg-[#eff3f4]/10"
            >
              <UserIcon size={27} strokeWidth={pathname === profileHref ? 2.6 : 2} />
              <span className="hidden xl:inline">Profile</span>
            </Link>
          </nav>

          <Link
            href={viewer ? "/#composer" : "/login"}
            className="mt-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#1d9bf0] font-bold text-white transition hover:bg-[#1a8cd8] xl:w-[225px]"
          >
            <ComposeIcon size={24} className="xl:hidden" />
            <span className="hidden text-[17px] xl:inline">Post</span>
          </Link>
        </div>

        <div className="pb-3">
          {viewer ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-full p-2 text-left transition hover:bg-[#eff3f4]/10"
            >
              <Avatar profile={viewer} size={40} link={false} />
              <span className="hidden min-w-0 flex-1 xl:block">
                <span className="block truncate text-[15px] font-bold">{viewer.name}</span>
                <span className="block truncate text-[15px] text-[#71767b]">@{viewer.username}</span>
              </span>
              <MoreIcon size={19} className="hidden xl:block" />
            </button>
          ) : (
            <Link
              href="/login"
              className="flex h-[48px] items-center justify-center rounded-full border border-[#536471] font-bold transition hover:bg-white/10 xl:w-[225px]"
            >
              <UserIcon className="xl:hidden" />
              <span className="hidden xl:inline">Sign in</span>
            </Link>
          )}
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[56px] items-center justify-around border-t border-[#2f3336] bg-black/95 px-2 backdrop-blur sm:hidden" aria-label="Mobile navigation">
        {navigation.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="rounded-full p-2.5" aria-label={item.label}>
              <Icon size={25} />
            </Link>
          );
        })}
        <Link href={profileHref} className="rounded-full p-2.5" aria-label="Profile">
          <UserIcon size={25} />
        </Link>
      </nav>
    </>
  );
}
