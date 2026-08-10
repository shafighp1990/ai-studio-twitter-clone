"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { MessageKey } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "./I18nProvider";

function authErrorKey(message: string): MessageKey {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "authInvalidCredentials";
  }

  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("user already")
  ) {
    return "authAccountExists";
  }

  return "authGenericError";
}

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [messageKey, setMessageKey] = useState<MessageKey | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);
    setMessageKey(null);

    if (mode === "register" && !/^[a-z0-9_]{3,30}$/.test(username)) {
      setErrorKey("authUsernameInvalid");
      return;
    }

    if (password.length < 8) {
      setErrorKey("authPasswordMin");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();

      if (mode === "login") {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (loginError) {
          setErrorKey(authErrorKey(loginError.message));
          return;
        }

        router.push("/");
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name: name.trim(),
            username: username.trim().toLowerCase(),
          },
        },
      });

      if (signUpError) {
        setErrorKey(authErrorKey(signUpError.message));
        return;
      }

      if (data.session) {
        router.push("/");
        router.refresh();
      } else {
        setMessageKey("authAccountCreated");
      }
    });
  }

  const fieldClass =
    "h-[56px] w-full rounded-md border border-[#3a4045] bg-[#111518] px-3 text-[17px] outline-none placeholder:text-[#77838a] focus:border-[#72a7c7] focus:ring-1 focus:ring-[#72a7c7]";

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      {mode === "register" && (
        <>
          <label className="block">
            <span className="sr-only">{t("name")}</span>
            <input
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={50}
              placeholder={t("name")}
              autoComplete="name"
              dir="auto"
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="sr-only">{t("username")}</span>
            <input
              name="username"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
              }
              required
              minLength={3}
              maxLength={30}
              placeholder={t("username")}
              autoComplete="username"
              className={fieldClass}
            />
          </label>
        </>
      )}

      <label className="block">
        <span className="sr-only">{t("email")}</span>
        <input
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder={t("email")}
          autoComplete="email"
          className={fieldClass}
        />
      </label>

      <label className="block">
        <span className="sr-only">{t("password")}</span>
        <input
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          placeholder={t("password")}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className={fieldClass}
        />
      </label>

      {errorKey && (
        <p role="alert" className="border-s-2 border-[#e26d78] py-2 ps-3 text-sm text-[#ff9ba4]">
          {t(errorKey)}
        </p>
      )}
      {messageKey && (
        <p role="status" className="border-s-2 border-[#68aa8d] py-2 ps-3 text-sm text-[#86c7a9]">
          {t(messageKey)}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="h-[50px] w-full rounded-md bg-[#e7ebed] text-[17px] font-bold text-[#0b0d0e] transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
      >
        {isPending
          ? t("authPleaseWait")
          : mode === "login"
            ? t("signIn")
            : t("createAccount")}
      </button>

      <p className="pt-1 text-[15px] text-[#8a959c]">
        {mode === "login" ? t("authNoAccount") : t("authHaveAccount")} {" "}
        <Link
          href={mode === "login" ? "/register" : "/login"}
          className="font-semibold text-[#72a7c7] hover:underline"
        >
          {mode === "login" ? t("signUp") : t("signIn")}
        </Link>
      </p>
    </form>
  );
}
