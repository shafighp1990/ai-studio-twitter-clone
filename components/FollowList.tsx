import type { Profile, ProfileSummary } from "@/lib/types";
import ProfileResult from "./ProfileResult";

export default function FollowList({ profiles, viewer, kind }: { profiles: ProfileSummary[]; viewer: Profile | null; kind: "followers" | "following" }) {
  if (profiles.length === 0) {
    return (
      <div className="mx-auto max-w-[400px] px-8 py-16">
        <h2 className="text-[31px] font-extrabold">{kind === "followers" ? "No followers yet" : "Not following anyone yet"}</h2>
        <p className="mt-2 text-[15px] text-[#71767b]">When this changes, people will show up here.</p>
      </div>
    );
  }
  return profiles.map((profile) => <ProfileResult key={profile.id} profile={profile} viewer={viewer} />);
}
