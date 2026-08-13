"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { MessageKey } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "./I18nProvider";

type TotpFactor = {
  id: string;
  friendly_name?: string;
};

export function normalizeTotpCode(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "")
    .slice(0, 6);
}

function verificationErrorKey(code?: string): MessageKey {
  if (
    code === "mfa_verification_failed" ||
    code === "mfa_challenge_expired" ||
    code === "invalid_mfa_code"
  ) {
    return "mfaInvalidCode";
  }

  return "mfaSetupError";
}

export default function MfaChallengeForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadFactors() {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!active) return;

      if (error) {
        setErrorKey("mfaSetupError");
      } else {
        setFactors(data.totp);
        setFactorId(data.totp[0]?.id ?? "");
        if (data.totp.length === 0) setErrorKey("mfaNoVerifiedFactor");
      }
      setIsLoading(false);
    }

    void loadFactors();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);

    if (!factorId || !/^\d{6}$/.test(code)) {
      setErrorKey(factorId ? "mfaInvalidCode" : "mfaNoVerifiedFactor");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });

    if (error) {
      setErrorKey(verificationErrorKey(error.code));
      setIsSubmitting(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/login");
    router.refresh();
  }

  if (isLoading) {
    return <p role="status" className="mt-8 text-sm text-[#a5afb5]">{t("mfaLoading")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      {factors.length > 1 && (
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[#d9e0e4]">{t("mfaFactorLabel")}</span>
          <select
            value={factorId}
            onChange={(event) => setFactorId(event.target.value)}
            className="h-12 w-full rounded-md border border-[#3a4045] bg-[#111518] px-3 outline-none focus:border-[#72a7c7]"
          >
            {factors.map((factor, index) => (
              <option key={factor.id} value={factor.id}>
                {factor.friendly_name || `${t("mfaTitle")} ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[#d9e0e4]">{t("mfaCodeLabel")}</span>
        <input
          name="totp-code"
          value={code}
          onChange={(event) => setCode(normalizeTotpCode(event.target.value))}
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          dir="ltr"
          autoFocus
          aria-describedby="mfa-code-hint"
          className="h-[56px] w-full rounded-md border border-[#3a4045] bg-[#111518] px-3 text-center font-mono text-2xl tracking-[0.35em] outline-none focus:border-[#72a7c7] focus:ring-1 focus:ring-[#72a7c7]"
        />
        <span id="mfa-code-hint" className="block text-sm text-[#8a959c]">{t("mfaCodeHint")}</span>
      </label>

      {errorKey && (
        <p role="alert" className="border-s-2 border-[#e26d78] py-2 ps-3 text-sm text-[#ff9ba4]">
          {t(errorKey)}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || factors.length === 0}
        className="h-[50px] w-full rounded-md bg-[#e7ebed] text-[17px] font-bold text-[#0b0d0e] transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
      >
        {isSubmitting ? t("mfaVerifying") : t("mfaContinue")}
      </button>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSubmitting}
        className="h-11 w-full rounded-md border border-[#3a4045] text-sm font-semibold text-[#d9e0e4] transition hover:bg-white/[0.05] disabled:opacity-60"
      >
        {t("signOut")}
      </button>
    </form>
  );
}
