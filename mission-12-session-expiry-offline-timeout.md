# Mission 12 — Session Expiry & Offline Fetch Timeout

## Why these two together

Both are "the app doesn't know what to do when something goes wrong for an
external reason" bugs — one is auth going stale, the other is the network
going away. Different triggers, same shape of fix: detect the failure mode,
show the user something honest, give them a clear way out (re-login /
retry) instead of a broken or stuck screen.

## Scope

### 1. Session expiry
- **Bug:** When a Supabase auth session expires (token expiry, or user
  logged out in another tab), the app doesn't handle it gracefully. Exact
  current behavior needs confirming first — likely either silent failures
  on every subsequent request (indistinguishable from the errors Mission 10
  just fixed) or a broken/blank screen.
- **Fix:** Detect an expired/invalid session (Supabase's client emits an
  auth state change event for this — `onAuthStateChange` with a
  `SIGNED_OUT` or token-refresh-failed event) and redirect to login with a
  clear message ("Your session expired, please log in again") rather than
  leaving the user on a dead page or silently failing requests.

### 2. Offline fetch timeout
- **Bug:** Found during Mission 10 spot-check — with the network fully
  offline (not just throttled), list pages get stuck on "Loading..."
  indefinitely. The fetch request never resolves or rejects, so there's
  nothing to catch and nowhere for the existing ListError handling
  (Mission 10) to kick in.
- **Fix:** Add a timeout to data-fetching calls (e.g. wrap the Supabase
  call in a `Promise.race` against a timeout, or use `AbortController`) so
  a request that hangs too long fails explicitly and surfaces through the
  same ListError pattern Mission 10 already built — no new error UI needed,
  just make sure hung requests actually reach it.

## Proposed approach (for Ben to approve before implementation)

1. Confirm current session-expiry behavior by testing it directly (expire
   a session manually — e.g. wait it out, or revoke it from Supabase's
   dashboard — and see what actually happens today).
2. Add a single top-level auth-state listener (likely in App.jsx or
   wherever the Supabase client is initialized) that catches expiry/sign-out
   and redirects to login with a message — one shared fix rather than
   handling it per-page.
3. Add a reasonable timeout (e.g. 15 seconds) to the shared fetch pattern
   used by list pages, reusing Mission 10's ListError component for the
   resulting error state.
4. No schema changes expected for either fix.

## Out of scope
- Remaining known bugs (KPI math, missing `.order()` calls, CheckBox
  re-render, past-booking edit, unused imports) — separate mission.
- Auto-refresh-before-expiry (silently extending the session in the
  background) — out of scope unless Ben asks for it; this mission is about
  handling expiry gracefully, not preventing it.

## Testing plan
- Manually expire/revoke a session (Supabase dashboard, or wait out token
  expiry) and confirm the app redirects to login with a clear message
  instead of breaking or silently failing.
- Go offline (DevTools Network tab → Offline) and confirm list pages now
  show the error banner with retry after the timeout, instead of hanging
  on "Loading..." forever.
- Confirm normal (non-expired, online) usage is unaffected — no false
  timeouts or false logouts on slow-but-working connections.

## Ben's role
- Approve this approach before implementation.
- No SQL expected — flag immediately if that changes.
- Spot-check: expire a session and confirm the redirect/message; go fully
  offline and confirm the timeout error now appears instead of an infinite
  loading state.
