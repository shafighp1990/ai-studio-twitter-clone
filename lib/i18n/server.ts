import "server-only";

import { cookies } from "next/headers";
import {
  defaultLocale,
  isLocale,
  localeCookie,
  translate,
  type MessageKey,
} from "@/lib/i18n";

export async function getLocale() {
  const value = (await cookies()).get(localeCookie)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getServerI18n() {
  const locale = await getLocale();
  return {
    locale,
    t: (key: MessageKey, values?: Record<string, string | number>) =>
      translate(locale, key, values),
  };
}
