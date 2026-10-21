"use client";
import { useState } from "react";
import Link from "next/link";
import { submitPasswordChange } from "@/lib/auth/password-change";
export default function ChangePasswordForm({
  required,
}: {
  required: boolean;
}) {
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [repeat, setRepeat] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    // Read the actual fields so password-manager autofill is submitted too.
    const values = new FormData(e.currentTarget);
    const currentValue = String(values.get("currentPassword") ?? "");
    const nextValue = String(values.get("newPassword") ?? "");
    const repeatedValue = String(values.get("repeatPassword") ?? "");
    if (nextValue !== repeatedValue) {
      setError("تکرار رمز یکسان نیست.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const redirect = await submitPasswordChange(currentValue, nextValue);
      setCurrent("");
      setPassword("");
      setRepeat("");
      window.location.replace(redirect);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تغییر رمز انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main dir="rtl" lang="fa" className="mx-auto max-w-lg px-5 py-16">
      <Link href="/" className="text-sm text-[#83b4d3]">
        Arrisches Communication
      </Link>
      <h1 className="my-5 text-3xl font-bold">تغییر رمز ورود</h1>
      <p className="mb-7 text-sm leading-7 text-[#a5afb5]">
        {required
          ? "رمز موقت است. برای ادامه، یک رمز شخصی تازه انتخاب کن."
          : "پس از تغییر رمز، ورودهای قبلی حساب بسته می‌شوند."}
      </p>
      <form onSubmit={submit} className="space-y-5">
        {[
          {
            name: "currentPassword",
            label: required ? "رمز موقت" : "رمز فعلی",
            value: current,
            set: setCurrent,
            auto: "current-password",
          },
          {
            name: "newPassword",
            label: "رمز تازه (حداقل ۱۲ کاراکتر)",
            value: password,
            set: setPassword,
            auto: "new-password",
          },
          {
            name: "repeatPassword",
            label: "تکرار رمز تازه",
            value: repeat,
            set: setRepeat,
            auto: "new-password",
          },
        ].map((f, i) => (
          <label key={i} className="block text-sm">
            {f.label}
            <input
              id={f.name}
              name={f.name}
              dir="ltr"
              type="password"
              autoComplete={f.auto}
              required
              minLength={i ? 12 : 8}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              className="mt-2 block w-full rounded-xl border border-[#36454f] bg-[#121c23] p-3"
            />
          </label>
        ))}
        {error && (
          <p role="alert" className="text-red-300">
            {error}
          </p>
        )}
        <button disabled={busy} className="meeting-button primary w-full">
          {busy ? "در حال ذخیره…" : "ذخیرهٔ رمز و ادامه"}
        </button>
      </form>
    </main>
  );
}
