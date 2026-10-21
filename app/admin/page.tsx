import { redirect } from "next/navigation";
import { session } from "@/lib/cloudflare/auth";
import { getMfaGateState } from "@/lib/auth/mfa";
import { one } from "@/lib/cloudflare/db";
import AdminDashboard from "@/components/AdminDashboard";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "مدیریت · Arrisches Communication",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function AdminPage() {
  const gate = await getMfaGateState();
  if (!gate.signedIn) redirect("/login");
  if (gate.requiresChallenge) redirect("/auth/mfa");
  if (gate.requiresPasswordChange) redirect("/auth/change-password");
  const s = await session();
  if (!s?.is_admin) redirect("/");
  const profile = await one<{ name: string; username: string }>(
    "SELECT name,username FROM profiles WHERE id=?",
    s.user_id,
  );
  return (
    <AdminDashboard
      admin={{
        id: s.user_id,
        name: profile?.name ?? "",
        username: profile?.username ?? "",
      }}
    />
  );
}
