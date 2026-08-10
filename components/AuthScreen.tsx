"use client";

import Link from "next/link";
import AuthForm from "./AuthForm";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "./I18nProvider";
import { AIStudioLogo } from "./icons";

export default function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const { t } = useI18n();
  const title = mode === "login" ? t("authLoginTitle") : t("authRegisterTitle");
  const intro = mode === "login" ? t("authLoginIntro") : t("authRegisterIntro");

  return (
    <main className="relative grid min-h-screen bg-[#0b0d0e] text-[#e7ebed] lg:grid-cols-[minmax(320px,0.85fr)_minmax(520px,1.15fr)]">
      <div className="absolute end-6 top-6 z-10 sm:end-10 sm:top-8">
        <LanguageSwitcher />
      </div>

      <section className="hidden border-e border-[#293036] bg-[#111518] p-14 lg:flex lg:items-center xl:p-20">
        <div className="max-w-md">
          <Link href="/" aria-label={t("brandHome")} className="inline-flex text-[#72a7c7]">
            <AIStudioLogo size={66} />
          </Link>
          <p className="mt-12 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a959c]">
            {t("authKicker")}
          </p>
          <p className="mt-4 max-w-sm text-[28px] font-semibold leading-[1.25] text-[#d9e0e4]">
            {t("authSummary")}
          </p>
          <div className="mt-10 h-px w-20 bg-[#72a7c7]" aria-hidden="true" />
          <p dir="ltr" className="mt-4 text-start text-sm text-[#8a959c]">
            {t("projectStack")}
          </p>
        </div>
      </section>

      <section className="flex items-center px-6 py-28 sm:px-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-[460px]">
          <Link
            href="/"
            aria-label={t("brandHome")}
            className="inline-flex items-center gap-3 text-[#72a7c7] lg:hidden"
          >
            <AIStudioLogo size={44} />
            <span className="text-lg font-bold text-[#e7ebed]">AI Studio</span>
          </Link>
          <p className="mt-10 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a959c] lg:mt-0">
            AI Studio
          </p>
          <h1 className="mt-3 text-[38px] font-bold leading-tight sm:text-[46px]">{title}</h1>
          <p className="mt-3 text-[16px] leading-6 text-[#a5afb5]">{intro}</p>
          <AuthForm mode={mode} />
        </div>
      </section>
    </main>
  );
}
