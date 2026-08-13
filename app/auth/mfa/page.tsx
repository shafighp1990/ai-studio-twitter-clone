import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MfaChallengeScreen from "@/components/MfaChallengeScreen";
import { getMfaGateState } from "@/lib/auth/mfa";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("mfaChallengeTitle") };
}

export default async function MfaPage() {
  const state = await getMfaGateState();

  if (!state.signedIn) redirect("/login");
  if (!state.requiresChallenge) redirect("/");

  return <MfaChallengeScreen />;
}
