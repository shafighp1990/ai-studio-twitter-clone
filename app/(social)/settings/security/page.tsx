import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MfaSettings from "@/components/MfaSettings";
import PageHeader from "@/components/PageHeader";
import { getViewer } from "@/lib/data";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("securitySettings") };
}

export default async function SecuritySettingsPage() {
  const [viewer, { t }] = await Promise.all([getViewer(), getServerI18n()]);
  if (!viewer) redirect("/login");

  return (
    <>
      <PageHeader title={t("securitySettings")} backHref={`/${viewer.username}`} />
      <MfaSettings />
    </>
  );
}
