import { redirect } from "next/navigation";
import Navigation from "@/components/Navigation";
import RightRail from "@/components/RightRail";
import { getMfaGateState } from "@/lib/auth/mfa";
import { getSuggestedProfiles, getViewer } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SocialLayout({ children }: { children: React.ReactNode }) {
  const mfaState = await getMfaGateState();
  if (mfaState.requiresChallenge) redirect("/auth/mfa");

  const [viewer, suggestions] = await Promise.all([
    getViewer(),
    getSuggestedProfiles(3),
  ]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1265px] justify-center bg-[#0b0d0e]">
      <Navigation viewer={viewer} />
      <main className="min-h-screen w-full max-w-[600px] border-x border-[#293036] pb-14 sm:pb-0">
        {children}
      </main>
      <RightRail viewer={viewer} suggestions={suggestions} />
    </div>
  );
}
