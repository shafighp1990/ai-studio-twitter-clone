import Navigation from "@/components/Navigation";
import RightRail from "@/components/RightRail";
import { getSuggestedProfiles, getViewer } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SocialLayout({ children }: { children: React.ReactNode }) {
  const [viewer, suggestions] = await Promise.all([
    getViewer(),
    getSuggestedProfiles(3),
  ]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1265px] justify-center bg-black">
      <Navigation viewer={viewer} />
      <main className="min-h-screen w-full max-w-[600px] border-x border-[#2f3336] pb-14 sm:pb-0">
        {children}
      </main>
      <RightRail viewer={viewer} suggestions={suggestions} />
    </div>
  );
}
