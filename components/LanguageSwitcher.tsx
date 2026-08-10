"use client";

import { useRouter } from "next/navigation";
import { localeCookie, locales, type Locale } from "@/lib/i18n";
import { useI18n } from "./I18nProvider";

const labelKeys = {
  de: "languageDe",
  fa: "languageFa",
  uk: "languageUk",
  ar: "languageAr",
} as const;

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { locale, t } = useI18n();

  function changeLocale(nextLocale: Locale) {
    document.cookie = `${localeCookie}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        onChange={(event) => changeLocale(event.target.value as Locale)}
        aria-label={t("language")}
        className={`appearance-none border border-[#3a4045] bg-[#0b0d0e] font-medium text-[#d9e0e4] outline-none transition hover:border-[#71808a] focus:border-[#72a7c7] ${
          compact ? "h-9 rounded px-2 pe-7 text-xs" : "h-10 rounded px-3 pe-8 text-sm"
        }`}
      >
        {locales.map((item) => (
          <option key={item} value={item}>
            {t(labelKeys[item])}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute end-2 text-[10px] text-[#89949b]">▾</span>
    </label>
  );
}
