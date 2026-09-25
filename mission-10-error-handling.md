# Mission 10 — Delete Order & Silent Failures

## Why these two together

Both bugs are the same root problem wearing two hats: **the app doesn't tell
anyone when something fails.** Portfolio's delete-order bug is what happens
when a *specific* failure (DB delete after storage delete) goes unhandled.
The silent-fetch-failures bug is the *general* case across the app. Fixing
error surfacing once, well, and reusing it for the Portfolio fix is more
robust than patching Portfolio in isolation and redoing the work later.

## Scope

### 1. Portfolio delete order
- **Bug:** Delete currently removes the storage image before the DB row. If
  the DB delete fails after the storage delete succeeds, the piece stays in
  the list with a broken/missing image and no indication anything went wrong.
- **Fix:** Reverse the order — delete the DB row first, then the storage
  object. If the DB delete fails, stop and surface the error; nothing in
  storage is touched. If the DB delete succeeds but the storage delete fails,
  surface a distinct warning (orphaned file in storage, non-critical, can be
  cleaned up later) rather than blocking the UI.
- **Confirmation dialog:** while touching this file, also fix the existing
  known gap — the delete confirmation currently just says "Delete this
  piece?" with no identifying detail. Match the pattern already used in
  Bookings/Clients/Payments (name the specific item).

### 2. Silent fetch failures
- **Bug:** Failed fetches across the app (Bookings, Clients, Payments,
  Consent Forms, Portfolio, Dashboard) currently render as empty states —
  "No bookings yet" looks identical whether there are genuinely zero
  bookings or the request errored out. No error is shown to the user, and
  nothing is logged anywhere Ben would see it.
- **Fix:** Every list-fetching page needs to distinguish three states:
  loading / empty (zero real results) / error (request failed). On error,
  show a visible inline error message (not just console.log) with a retry
  action where reasonable. Audit every data-fetching call across the app
  (not just the four core CRUD pages) and apply this consistently.

## Proposed approach (for Ben to approve before implementation)

1. Audit every fetch call in the codebase and list every spot currently
   swallowing errors (this becomes the actual page-by-page checklist).
2. Design one small reusable pattern for loading/empty/error state (e.g. a
   shared hook or a consistent local state shape) rather than one-off
   solutions per page — keep it simple, no new dependencies.
3. Apply the pattern across all pages found in step 1.
4. Fix Portfolio's delete order specifically, using the new error-surfacing
   pattern for both the DB-delete-failed and storage-delete-failed cases.
5. Fix Portfolio's delete confirmation to name the item.
6. No schema or RLS changes expected for either fix — flag immediately if
   anything here turns out to need one, since Ben runs all Supabase SQL
   himself.

## Out of scope
- Any other bugs from the known-issues list (session expiry, KPI math,
  missing `.order()` calls, CheckBox re-render, past-booking edit, signing
  link retrieval) — separate missions.
- Retry/offline handling beyond a manual retry button.
- Any visual/theme work — Phase 2 CSS variables are already done; reuse
  existing theme tokens for any new error-state styling, don't introduce
  new hardcoded colors.

## Testing plan
- Force a DB delete failure (e.g. temporarily revoke a permission or use a
  bad ID) to confirm storage is left untouched and the error surfaces.
- Force a storage delete failure after a successful DB delete to confirm
  the distinct warning path works.
- Throttle/kill network on each core list page to confirm error state
  renders instead of a false empty state, and that retry works.
- Confirm genuinely empty lists (e.g. a brand-new account) still show the
  correct empty state, not an error.
- Run the existing lint/build checks; confirm no new errors beyond the
  known pre-existing baseline.

## Ben's role
- Approve this approach before implementation starts.
- No SQL expected for this mission — flag immediately if that changes.
- Spot-check Portfolio delete (both failure paths) and at least two other
  pages' error states manually before merging.
