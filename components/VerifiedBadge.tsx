"use client";

import { useI18n } from "./I18nProvider";

export default function VerifiedBadge() {
  const { t } = useI18n();

  return (
    <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-sm bg-[#72a7c7] text-[11px] font-black text-[#071015]" aria-label={t("verified")}>
      ✓
    </span>
  );
}
