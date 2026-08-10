"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (mode === "register" && !/^[a-z0-9_]{3,30}$/.test(username)) {
      setError("Username must be 3–30 characters using lowercase letters, numbers, or underscores.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
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
          setError(loginError.message);
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
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        router.push("/");
        router.refresh();
      } else {
        setMessage("Account created. Check your email to confirm your address, then sign in.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
      {mode === "register" && (
        <>
          <label className="block">
            <span className="sr-only">Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={50} placeholder="Name" autoComplete="name" className="h-[58px] w-full rounded border border-[#536471] bg-black px-3 text-[17px] outline-none placeholder:text-[#71767b] focus:border-[#1d9bf0] focus:ring-1 focus:ring-[#1d9bf0]" />
          </label>
          <label className="block">
            <span className="sr-only">Username</span>
            <input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} required minLength={3} maxLength={30} placeholder="Username" autoComplete="username" className="h-[58px] w-full rounded border border-[#536471] bg-black px-3 text-[17px] outline-none placeholder:text-[#71767b] focus:border-[#1d9bf0] focus:ring-1 focus:ring-[#1d9bf0]" />
          </label>
        </>
      )}

      <label className="block">
        <span className="sr-only">Email</span>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="Email" autoComplete="email" className="h-[58px] w-full rounded border border-[#536471] bg-black px-3 text-[17px] outline-none placeholder:text-[#71767b] focus:border-[#1d9bf0] focus:ring-1 focus:ring-[#1d9bf0]" />
      </label>

      <label className="block">
        <span className="sr-only">Password</span>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} placeholder="Password" autoComplete={mode === "login" ? "current-password" : "new-password"} className="h-[58px] w-full rounded border border-[#536471] bg-black px-3 text-[17px] outline-none placeholder:text-[#71767b] focus:border-[#1d9bf0] focus:ring-1 focus:ring-[#1d9bf0]" />
      </label>

      {error && <p className="rounded-xl bg-[#f4212e]/10 px-4 py-3 text-sm text-[#ff7a84]">{error}</p>}
      {message && <p className="rounded-xl bg-[#00ba7c]/10 px-4 py-3 text-sm text-[#00ba7c]">{message}</p>}

      <button type="submit" disabled={isPending} className="h-[52px] w-full rounded-full bg-white text-[17px] font-bold text-black transition hover:bg-[#d7dbdc] disabled:opacity-60">
        {isPending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>

      <p className="text-[15px] text-[#71767b]">
        {mode === "login" ? "Don't have an account? " : "Already have an account? "}
        <Link href={mode === "login" ? "/register" : "/login"} className="text-[#1d9bf0] hover:underline">
          {mode === "login" ? "Sign up" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
