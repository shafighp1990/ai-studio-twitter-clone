"use client";

import Link from "next/link";
import { useI18n } from "./I18nProvider";
import LanguageSwitcher from "./LanguageSwitcher";
import { BackIcon } from "./icons";

export default function PageHeader({
  title,
  subtitle,
  backHref,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
}) {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-30 flex min-h-[58px] items-center gap-4 border-b border-[#293036] bg-[#0b0d0e]/95 px-4">
      {backHref && (
        <Link href={backHref} className="-ms-2 rounded p-2 transition hover:bg-white/[0.07]" aria-label={t("back")}>
          <BackIcon size={22} className="rtl-flip" />
        </Link>
      )}
      <div className="min-w-0 py-1">
        <h1 className="truncate text-xl font-bold">{title}</h1>
        {subtitle && <p className="text-[13px] text-[#8a959c]">{subtitle}</p>}
      </div>
      <div className="ms-auto shrink-0">
        <LanguageSwitcher compact />
      </div>
    </header>
  );
}
