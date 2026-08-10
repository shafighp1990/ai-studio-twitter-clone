import type { Metadata } from "next";
import AuthScreen from "@/components/AuthScreen";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("authLoginTitle") };
}

export default function LoginPage() {
  return <AuthScreen mode="login" />;
}
