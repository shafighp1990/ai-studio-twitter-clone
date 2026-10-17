import { redirect } from "next/navigation";
import { getMfaGateState } from "@/lib/auth/mfa";
import ChangePasswordForm from "@/components/ChangePasswordForm";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "تغییر رمز",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const state = await getMfaGateState();
  if (!state.signedIn) redirect("/login");
  if (state.requiresChallenge) redirect("/auth/mfa");
  return <ChangePasswordForm required={state.requiresPasswordChange} />;
}
