import "server-only";
import { assurance, session } from "@/lib/cloudflare/auth";
export async function getMfaGateState() {
  const s = await session(true);
  const a = await assurance();
  return {
    signedIn: !!s,
    ...a,
    requiresChallenge:
      !!s && a.currentLevel !== "aal2" && a.nextLevel === "aal2",
  };
}
