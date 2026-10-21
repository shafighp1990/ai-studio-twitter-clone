import { notFound } from "next/navigation";
import { one } from "@/lib/cloudflare/db";
import { getViewer } from "@/lib/data";
import MeetingRoom from "@/components/MeetingRoom";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Meeting · Arrisches Communication",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const room = await one<{
    id: string;
    title: string;
    host_id: string;
    ended: number;
  }>("SELECT id,title,host_id,ended FROM rooms WHERE id=?", id);
  if (!room) notFound();
  const viewer = await getViewer();
  return (
    <MeetingRoom
      room={{ id: room.id, title: room.title, ended: !!room.ended }}
      host={viewer?.id === room.host_id}
      initialName={viewer?.name ?? ""}
    />
  );
}
