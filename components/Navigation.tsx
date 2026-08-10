"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import Avatar from "./Avatar";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "./I18nProvider";
import {
  AIStudioLogo,
  BellIcon,
  BookmarkIcon,
  ComposeIcon,
  HomeIcon,
  SearchIcon,
  UserIcon,
} from "./icons";

const navigation = [
  { href: "/", labelKey: "navHome", icon: HomeIcon },
  { href: "/explore", labelKey: "navExplore", icon: SearchIcon },
  { href: "/notifications", labelKey: "navNotifications", icon: BellIcon },
  { href: "/bookmarks", labelKey: "navBookmarks", icon: BookmarkIcon },
] as const;

export default function Navigation({ viewer }: { viewer: Profile | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

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
            className="mb-1 flex h-[52px] w-[52px] items-center justify-center rounded-lg text-[#72a7c7] transition hover:bg-[#72a7c7]/10 xl:ms-2"
            aria-label={t("brandHome")}
          >
            <AIStudioLogo size={38} />
          </Link>

          <nav aria-label={t("primaryNavigation")}>
            {navigation.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={t(item.labelKey)}
                  aria-current={active ? "page" : undefined}
                  className="group flex w-fit items-center gap-5 rounded-lg px-3 py-3 text-xl transition hover:bg-white/[0.06]"
                >
                  <Icon size={27} strokeWidth={active ? 2.6 : 2} />
                  <span className={`hidden xl:inline ${active ? "font-bold" : "font-normal"}`}>
                    {t(item.labelKey)}
                  </span>
                </Link>
              );
            })}

            <Link
              href={profileHref}
              aria-label={t("navProfile")}
              aria-current={pathname === profileHref ? "page" : undefined}
              className="flex w-fit items-center gap-5 rounded-lg px-3 py-3 text-xl transition hover:bg-white/[0.06]"
            >
              <UserIcon size={27} strokeWidth={pathname === profileHref ? 2.6 : 2} />
              <span className={`hidden xl:inline ${pathname === profileHref ? "font-bold" : ""}`}>
                {t("navProfile")}
              </span>
            </Link>
          </nav>

          <Link
            href={viewer ? "/#composer" : "/login"}
            aria-label={t("navPost")}
            className="mt-4 flex h-[52px] w-[52px] items-center justify-center rounded-lg bg-[#72a7c7] font-bold text-[#0b0d0e] transition hover:bg-[#86b8d4] xl:w-[225px]"
          >
            <ComposeIcon size={24} className="xl:hidden" />
            <span className="hidden text-[17px] xl:inline">{t("navPost")}</span>
          </Link>
        </div>

        <div className="space-y-2 pb-3">
          <div className="hidden px-2 xl:block">
            <LanguageSwitcher compact />
          </div>

          {viewer ? (
            <>
              <Link
                href={profileHref}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-start transition hover:bg-white/[0.06]"
              >
                <Avatar profile={viewer} size={40} link={false} />
                <span className="hidden min-w-0 flex-1 xl:block">
                  <span dir="auto" className="block truncate text-[15px] font-bold">
                    {viewer.name}
                  </span>
                  <span dir="ltr" className="block truncate text-[15px] text-[#8a959c]">
                    @{viewer.username}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                aria-label={t("signOut")}
                className="flex h-10 w-full items-center justify-center rounded-lg border border-[#3a4045] px-3 text-sm font-semibold text-[#d9e0e4] transition hover:border-[#71808a] hover:bg-white/[0.04] xl:w-[225px]"
              >
                <span className="hidden xl:inline">{t("signOut")}</span>
                <span aria-hidden="true" className="text-lg xl:hidden">
                  ↪
                </span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              aria-label={t("signIn")}
              className="flex h-[48px] items-center justify-center rounded-lg border border-[#536471] font-bold transition hover:bg-white/[0.06] xl:w-[225px]"
            >
              <UserIcon className="xl:hidden" />
              <span className="hidden xl:inline">{t("signIn")}</span>
            </Link>
          )}
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex h-[56px] items-center justify-around border-t border-[#293036] bg-[#0b0d0e]/95 px-2 sm:hidden"
        aria-label={t("mobileNavigation")}
      >
        {navigation.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={t(item.labelKey)}
              aria-current={active ? "page" : undefined}
              className="rounded-lg p-2.5"
            >
              <Icon size={25} strokeWidth={active ? 2.6 : 2} />
            </Link>
          );
        })}
        <Link
          href={profileHref}
          className="rounded-lg p-2.5"
          aria-label={t("navProfile")}
          aria-current={pathname === profileHref ? "page" : undefined}
        >
          <UserIcon size={25} strokeWidth={pathname === profileHref ? 2.6 : 2} />
        </Link>
      </nav>
    </>
  );
}
