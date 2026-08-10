import Link from "next/link";
import AuthForm from "./AuthForm";
import { AIStudioLogo } from "./icons";

export default function AuthScreen({ mode }: { mode: "login" | "register" }) {
  return (
    <main className="grid min-h-screen bg-black text-[#e7e9ea] lg:grid-cols-2">
      <section className="hidden items-center justify-center lg:flex">
        <AIStudioLogo size={300} className="text-[#1d9bf0]" />
      </section>
      <section className="flex items-center px-7 py-10 sm:px-12 lg:px-16">
        <div className="w-full max-w-[440px]">
          <Link href="/" className="inline-flex items-center gap-3 text-[#1d9bf0] lg:hidden">
            <AIStudioLogo size={48} />
            <span className="text-xl font-bold text-white">AI Studio</span>
          </Link>
          <h1 className="mt-10 text-[40px] font-extrabold leading-tight sm:text-[54px]">
            {mode === "login" ? "Happening now" : "Join today"}
          </h1>
          <h2 className="mt-7 text-[28px] font-extrabold">
            {mode === "login" ? "Sign in to AI Studio" : "Create your account"}
          </h2>
          <AuthForm mode={mode} />
        </div>
      </section>
    </main>
  );
}
