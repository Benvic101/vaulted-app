import { supabase } from "../supabase";

// Creator referral links (Mission 16).
//
// Flow: /?ref=CODE  ->  code saved locally  ->  sent with signUp() as
// user_metadata.referral_code (so it survives confirming email in another
// browser)  ->  after the first session, apply_referral() tags the account
// to the creator and sets plan = 'founding'.
//
// Nothing here can fail loudly: referrals must never break signup or login.

const STORAGE_KEY = "vaulted_ref";
const DONE_PREFIX = "vaulted_ref_done:";
const CODE_RE = /^[A-Z0-9_-]{3,32}$/;

export function normalizeReferralCode(value) {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
}

/** Save ?ref=CODE from the URL, if present and well-formed. */
export function captureReferralFromUrl() {
  try {
    const raw = new URLSearchParams(window.location.search).get("ref");
    const code = normalizeReferralCode(raw);
    if (code) localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // storage blocked or no window: ignore
  }
}

/** The saved referral code, or null. */
export function getStoredReferralCode() {
  try {
    return normalizeReferralCode(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function isDone(userId) {
  try {
    return localStorage.getItem(DONE_PREFIX + userId) === "1";
  } catch {
    return false;
  }
}

function markDone(userId) {
  try {
    localStorage.setItem(DONE_PREFIX + userId, "1");
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Results that will never change on a retry.
const FINAL_RESULTS = new Set([
  "applied",
  "already_applied",
  "invalid",
  "not_eligible",
  "creator_full",
  "no_code",
]);

/**
 * Call once per signed-in user whose signup carried a referral code.
 * Returns the RPC status string, or null if skipped or failed.
 */
export async function applyReferralIfNeeded(user) {
  try {
    if (!user?.id) return null;
    if (!normalizeReferralCode(user.user_metadata?.referral_code)) return null;
    if (isDone(user.id)) return null;

    const { data, error } = await supabase.rpc("apply_referral");
    if (error) {
      console.error("Applying referral failed:", error);
      return null;
    }
    if (FINAL_RESULTS.has(data)) markDone(user.id);
    return data;
  } catch (err) {
    console.error("Applying referral failed:", err);
    return null;
  }
}
