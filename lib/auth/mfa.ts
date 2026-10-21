import "server-only";
import { assurance, session } from "@/lib/cloudflare/auth";
export async function getMfaGateState() {
  const s = await session(true);
  const a = await assurance();
  return {
    signedIn: !!s,
    requiresPasswordChange: !!s?.must_change_password,
    ...a,
    requiresChallenge:
      !!s && a.currentLevel !== "aal2" && a.nextLevel === "aal2",
  };
}
