import { supabase } from "../supabase";

export const FREE_CLIENT_LIMIT = 15;

export const LIMIT_MESSAGE =
  `You've reached the Free plan limit of ${FREE_CLIENT_LIMIT} clients. ` +
  "Upgrade to keep adding clients — your existing clients stay safe.";

/**
 * True when a Supabase error came from the database client-cap trigger
 * (migration 2026-11-06-free-tier-plan.sql).
 */
export function isClientLimitError(error) {
  return (
    !!error &&
    typeof error.message === "string" &&
    (error.message.includes("VLTED_CLIENT_CAP") ||
      error.message.includes("FREE_PLAN_CLIENT_LIMIT"))
  );
}

/**
 * Returns { plan, client_limit, client_count } or null.
 * null means "unknown" (e.g. migration not run yet, offline) — callers must
 * treat that as no limit info and simply hide plan UI. The database trigger
 * stays the real enforcement either way.
 */
export async function fetchPlanInfo() {
  try {
    const { data, error } = await supabase.rpc("get_my_plan");
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}
