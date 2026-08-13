import "server-only";

import { createClient } from "@/lib/supabase/server";

export type MfaGateState = {
  signedIn: boolean;
  currentLevel: string | null;
  nextLevel: string | null;
  requiresChallenge: boolean;
};

export async function getMfaGateState(): Promise<MfaGateState> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    return {
      signedIn: false,
      currentLevel: null,
      nextLevel: null,
      requiresChallenge: false,
    };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) throw sessionError ?? new Error("Missing session token");

  // Passing the validated JWT makes Supabase fetch the authoritative factor
  // list instead of trusting the user object stored in the browser cookie.
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel(accessToken);
  if (error) throw error;

  return {
    signedIn: true,
    currentLevel: data.currentLevel,
    nextLevel: data.nextLevel,
    requiresChallenge:
      data.currentLevel !== "aal2" && data.nextLevel === "aal2",
  };
}
