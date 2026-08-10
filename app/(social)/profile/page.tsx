import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data";

export default async function ProfileRedirectPage() {
  const viewer = await getViewer();
  redirect(viewer ? `/${viewer.username}` : "/login");
}
