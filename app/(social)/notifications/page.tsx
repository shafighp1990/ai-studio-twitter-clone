import NotificationsList from "@/components/NotificationsList";
import PageHeader from "@/components/PageHeader";
import { getNotifications, getViewer } from "@/lib/data";

export default async function NotificationsPage() {
  const viewer = await getViewer();
  const notifications = viewer ? await getNotifications() : [];

  return (
    <>
      <PageHeader title="Notifications" />
      {viewer ? (
        <NotificationsList items={notifications} viewerId={viewer.id} />
      ) : (
        <div className="mx-auto max-w-[400px] px-8 py-16">
          <h2 className="text-[31px] font-extrabold">Stay in the loop</h2>
          <p className="mt-2 text-[15px] text-[#71767b]">Sign in to see likes, replies, reposts, and new followers.</p>
        </div>
      )}
    </>
  );
}
