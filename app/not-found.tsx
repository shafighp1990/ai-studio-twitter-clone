import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getServerI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getServerI18n();

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-center text-[var(--foreground)]">
      <div className="absolute end-6 top-6">
        <LanguageSwitcher />
      </div>
      <div>
        <p className="text-[15px] text-[var(--muted)]">{t("notFoundText")}</p>
        <Link href="/explore" className="mt-5 inline-block rounded-sm bg-[var(--blue)] px-5 py-2.5 text-[15px] font-semibold text-[#071015]">{t("notFoundAction")}</Link>
      </div>
    </main>
  );
}
