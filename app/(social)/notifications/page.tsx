import NotificationsList from "@/components/NotificationsList";
import PageHeader from "@/components/PageHeader";
import { getNotifications, getViewer } from "@/lib/data";
import { getServerI18n } from "@/lib/i18n/server";

export default async function NotificationsPage() {
  const { t } = await getServerI18n();
  const viewer = await getViewer();
  const notifications = viewer ? await getNotifications() : [];

  return (
    <>
      <PageHeader title={t("notificationsTitle")} />
      {viewer ? (
        <NotificationsList items={notifications} viewerId={viewer.id} />
      ) : (
        <div className="mx-auto max-w-[400px] px-8 py-16">
          <h2 className="text-[31px] font-semibold leading-9">{t("notificationsSignInTitle")}</h2>
          <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">{t("notificationsSignInText")}</p>
        </div>
      )}
    </>
  );
}
