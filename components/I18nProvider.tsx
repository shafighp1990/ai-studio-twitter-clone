"use client";

import { createContext, useContext, useMemo } from "react";
import {
  getDirection,
  getIntlLocale,
  translate,
  type Locale,
  type MessageKey,
} from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  direction: "ltr" | "rtl";
  intlLocale: string;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export default function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      direction: getDirection(locale),
      intlLocale: getIntlLocale(locale),
      t: (key, values) => translate(locale, key, values),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
