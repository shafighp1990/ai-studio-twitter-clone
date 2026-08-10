import type { Metadata } from "next";
import AuthScreen from "@/components/AuthScreen";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage() {
  return <AuthScreen mode="register" />;
}
