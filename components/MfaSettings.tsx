"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { MessageKey } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { normalizeTotpCode } from "./MfaChallengeForm";
import { useI18n } from "./I18nProvider";

type TotpFactor = {
  id: string;
  friendly_name?: string;
};

type Enrollment = TotpFactor & {
  qrCode: string;
  secret: string;
};

type Phase = "idle" | "enrolling" | "verifying" | "disabling";

function isVerificationError(code?: string) {
  return (
    code === "mfa_verification_failed" ||
    code === "mfa_challenge_expired" ||
    code === "invalid_mfa_code"
  );
}

export default function MfaSettings() {
  const router = useRouter();
  const { t } = useI18n();
  const [verifiedFactor, setVerifiedFactor] = useState<TotpFactor | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [messageKey, setMessageKey] = useState<MessageKey | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!active) return;

      if (error) setErrorKey("mfaSetupError");
      else setVerifiedFactor(data.totp[0] ?? null);
      setIsLoading(false);
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  async function startEnrollment() {
    setErrorKey(null);
    setMessageKey(null);
    setPhase("enrolling");
    const supabase = createClient();
    const factors = await supabase.auth.mfa.listFactors();

    if (factors.error) {
      setErrorKey("mfaSetupError");
      setPhase("idle");
      return;
    }

    const existingVerified = factors.data.totp[0];
    if (existingVerified) {
      setVerifiedFactor(existingVerified);
      setPhase("idle");
      return;
    }

    for (const factor of factors.data.all) {
      if (factor.factor_type === "totp" && factor.status === "unverified") {
        const cleanup = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (cleanup.error) {
          setErrorKey("mfaSetupError");
          setPhase("idle");
          return;
        }
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "AI Studio Authenticator",
      issuer: "AI Studio",
    });

    if (error) {
      setErrorKey("mfaSetupError");
      setPhase("idle");
      return;
    }

    setEnrollment({
      id: data.id,
      friendly_name: data.friendly_name,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
    setSetupCode("");
    setShowSecret(false);
    setPhase("idle");
  }

  async function verifyEnrollment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);
    setMessageKey(null);

    if (!enrollment || !/^\d{6}$/.test(setupCode)) {
      setErrorKey("mfaInvalidCode");
      return;
    }

    setPhase("verifying");
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.id,
      code: setupCode,
    });

    if (error) {
      setErrorKey(isVerificationError(error.code) ? "mfaInvalidCode" : "mfaSetupError");
      setPhase("idle");
      return;
    }

    const factors = await supabase.auth.mfa.listFactors();
    setVerifiedFactor(
      factors.data?.totp[0] ?? {
        id: enrollment.id,
        friendly_name: enrollment.friendly_name,
      },
    );
    setEnrollment(null);
    setSetupCode("");
    setShowSecret(false);
    setMessageKey("mfaEnabledSuccess");
    setPhase("idle");
    router.refresh();
  }

  async function cancelEnrollment() {
    if (!enrollment) return;

    const factorId = enrollment.id;
    setEnrollment(null);
    setSetupCode("");
    setShowSecret(false);
    setErrorKey(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) setErrorKey("mfaSetupError");
  }

  async function copySecret() {
    if (!enrollment) return;

    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setMessageKey("mfaSecretCopied");
    } catch {
      setErrorKey("requestFailed");
    }
  }

  async function disableMfa(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);
    setMessageKey(null);

    if (!verifiedFactor || !/^\d{6}$/.test(disableCode)) {
      setErrorKey(verifiedFactor ? "mfaInvalidCode" : "mfaNoVerifiedFactor");
      return;
    }

    if (!window.confirm(t("mfaDisableConfirm"))) return;

    setPhase("disabling");
    const supabase = createClient();
    const verification = await supabase.auth.mfa.challengeAndVerify({
      factorId: verifiedFactor.id,
      code: disableCode,
    });

    if (verification.error) {
      setErrorKey(
        isVerificationError(verification.error.code) ? "mfaInvalidCode" : "mfaSetupError",
      );
      setPhase("idle");
      return;
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
    if (error) {
      setErrorKey("mfaSetupError");
      setPhase("idle");
      return;
    }

    const remainingFactors = await supabase.auth.mfa.listFactors();
    if (remainingFactors.error) {
      setErrorKey("mfaSetupError");
      setPhase("idle");
      router.refresh();
      return;
    }

    const nextFactor = remainingFactors.data.totp[0] ?? null;
    await supabase.auth.refreshSession();
    setVerifiedFactor(nextFactor);
    setDisableCode("");
    setMessageKey(nextFactor ? "mfaFactorRemoved" : "mfaDisabledSuccess");
    setPhase("idle");
    router.refresh();
  }

  if (isLoading) {
    return <p role="status" className="px-4 py-8 text-sm text-[#a5afb5]">{t("mfaLoading")}</p>;
  }

  const inputClass =
    "h-[52px] w-full rounded-md border border-[#3a4045] bg-[#111518] px-3 text-center font-mono text-xl tracking-[0.3em] outline-none focus:border-[#72a7c7] focus:ring-1 focus:ring-[#72a7c7]";

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <section className="rounded-lg border border-[#293036] bg-[#111518] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{t("mfaTitle")}</h2>
            <p className="mt-2 max-w-xl text-[15px] leading-6 text-[#a5afb5]">{t("mfaDescription")}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              verifiedFactor
                ? "bg-[#68aa8d]/15 text-[#86c7a9]"
                : "bg-[#8a959c]/15 text-[#a5afb5]"
            }`}
          >
            {t(verifiedFactor ? "mfaStatusEnabled" : "mfaStatusDisabled")}
          </span>
        </div>

        {!verifiedFactor && !enrollment && (
          <button
            type="button"
            onClick={startEnrollment}
            disabled={phase !== "idle"}
            className="mt-6 min-h-11 rounded-md bg-[#e7ebed] px-5 font-bold text-[#0b0d0e] transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
          >
            {phase === "enrolling" ? t("mfaLoading") : t("mfaEnable")}
          </button>
        )}

        {enrollment && (
          <form onSubmit={verifyEnrollment} className="mt-7 space-y-5 border-t border-[#293036] pt-6">
            <div>
              <h3 className="text-lg font-bold">{t("mfaSetupTitle")}</h3>
              <p className="mt-1 text-sm leading-6 text-[#a5afb5]">{t("mfaScanQr")}</p>
            </div>
            <div className="w-fit rounded-xl bg-white p-3">
              {/* Supabase returns a data URL containing the trusted enrollment SVG. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrollment.qrCode} alt={t("mfaQrAlt")} width={224} height={224} />
            </div>

            <div className="rounded-md border border-[#293036] bg-[#0b0d0e] p-4">
              <p className="text-sm text-[#a5afb5]">{t("mfaManualEntry")}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a959c]">
                {t("mfaSecretLabel")}
              </p>
              <code
                dir="ltr"
                className="mt-2 block break-all rounded bg-[#171c20] p-3 text-start text-sm tracking-[0.14em] text-[#e7ebed]"
              >
                {showSecret ? enrollment.secret : "•••• •••• •••• ••••"}
              </code>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowSecret((value) => !value)}
                  className="rounded border border-[#3a4045] px-3 py-2 text-sm font-semibold hover:bg-white/[0.05]"
                >
                  {t(showSecret ? "mfaHideSecret" : "mfaShowSecret")}
                </button>
                <button
                  type="button"
                  onClick={copySecret}
                  className="rounded border border-[#3a4045] px-3 py-2 text-sm font-semibold hover:bg-white/[0.05]"
                >
                  {t("mfaCopySecret")}
                </button>
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-semibold">{t("mfaCodeLabel")}</span>
              <input
                name="setup-totp-code"
                value={setupCode}
                onChange={(event) => setSetupCode(normalizeTotpCode(event.target.value))}
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                dir="ltr"
                aria-describedby="setup-code-hint"
                className={inputClass}
              />
              <span id="setup-code-hint" className="block text-sm text-[#8a959c]">{t("mfaCodeHint")}</span>
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={phase !== "idle"}
                className="min-h-11 rounded-md bg-[#72a7c7] px-5 font-bold text-[#0b0d0e] transition hover:bg-[#86b8d4] disabled:cursor-wait disabled:opacity-60"
              >
                {phase === "verifying" ? t("mfaVerifying") : t("mfaVerifyEnable")}
              </button>
              <button
                type="button"
                onClick={cancelEnrollment}
                disabled={phase !== "idle"}
                className="min-h-11 rounded-md border border-[#3a4045] px-4 font-semibold hover:bg-white/[0.05] disabled:opacity-60"
              >
                {t("mfaCancel")}
              </button>
            </div>
          </form>
        )}

        {verifiedFactor && (
          <form onSubmit={disableMfa} className="mt-7 space-y-4 border-t border-[#293036] pt-6">
            <p className="text-sm leading-6 text-[#a5afb5]">{t("mfaChallengeText")}</p>
            <label className="block max-w-sm space-y-2">
              <span className="text-sm font-semibold">{t("mfaCodeLabel")}</span>
              <input
                name="disable-totp-code"
                value={disableCode}
                onChange={(event) => setDisableCode(normalizeTotpCode(event.target.value))}
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                dir="ltr"
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              disabled={phase !== "idle"}
              className="min-h-11 rounded-md border border-[#934954] px-4 font-semibold text-[#ff9ba4] transition hover:bg-[#e26d78]/10 disabled:cursor-wait disabled:opacity-60"
            >
              {phase === "disabling" ? t("mfaDisabling") : t("mfaDisable")}
            </button>
          </form>
        )}

        {errorKey && (
          <p role="alert" className="mt-5 border-s-2 border-[#e26d78] py-2 ps-3 text-sm text-[#ff9ba4]">
            {t(errorKey)}
          </p>
        )}
        {messageKey && (
          <p role="status" className="mt-5 border-s-2 border-[#68aa8d] py-2 ps-3 text-sm text-[#86c7a9]">
            {t(messageKey)}
          </p>
        )}
      </section>

      <aside className="rounded-lg border border-[#66542b] bg-[#2b2415] p-5 text-sm leading-6 text-[#e5cf91]">
        {t("mfaRecoveryWarning")}
      </aside>
    </div>
  );
}
