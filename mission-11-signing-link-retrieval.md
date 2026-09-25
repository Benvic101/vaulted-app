# Mission 11 — Signing Link Retrieval

## The bug

When a consent form's signing link is generated, it's shown once on a
"Link Ready" screen (with a copy button). If that screen is closed before
the link is copied — or Ben just needs it again later (client lost the
message, wants to resend, etc.) — there's currently no way to get it back.
The only option is regenerating, which is confusing (does it invalidate the
old link? create a duplicate? unclear) and not a real fix.

## Scope

- The signing link (or whatever it's built from — a token, an ID, a full
  URL) needs to be retrievable after the "Link Ready" screen closes, for
  any consent form that's been sent but not yet signed.
- Add a "Copy Link" / "View Link" action on the Consent Forms list for
  forms in that "sent, awaiting signature" state — matching the existing
  action-button pattern already used elsewhere (Bookings, Clients,
  Payments).
- Decide and confirm: does the link stay valid indefinitely until signed,
  or does it expire? (Flag your answer either way — if there's already
  expiry logic, retrieval just needs to respect it and maybe show "expired,
  regenerate" instead of a dead copy button.)
- Regenerating a link (if that flow still exists) should be clear about
  whether it invalidates the previous link or not.

## Proposed approach (for Ben to approve before implementation)

1. Confirm where the signing link/token currently lives — is it already
   stored on the consent form record in the DB, or only ever generated
   client-side and shown once? This determines whether this is a UI-only
   fix (just expose what's already stored) or needs a data change.
2. If already stored: add the retrieval action to the Consent Forms list,
   reusing the existing copy-to-clipboard pattern from the original
   "Link Ready" screen.
3. If not stored: this needs a small schema addition (a column to persist
   the token/link) — flag this immediately, since Ben runs all Supabase SQL
   himself and needs to know before implementation starts.
4. Handle the expired/invalid case cleanly if expiry logic exists.

## Out of scope
- Any other known bugs (session expiry, KPI math, missing `.order()` calls,
  CheckBox re-render, past-booking edit) — separate missions.
- Adding a fetch timeout for cases where the network is fully offline and
  requests never resolve, leaving pages stuck on "Loading..." indefinitely
  (found during Mission 10 spot-check) — flagging here as a known follow-up,
  not part of this mission's scope.

## Testing plan
- Generate a signing link, close the "Link Ready" screen without copying,
  confirm the link is retrievable from the Consent Forms list.
- Copy the retrieved link and confirm it actually opens the correct signing
  page for that client/form.
- If expiry exists, test retrieving an expired link and confirm the UI
  reflects that correctly instead of offering a dead link.
- Confirm a form that's already signed does NOT show a retrievable link
  (no reason to re-expose it once signed).

## Ben's role
- Approve this approach before implementation, especially the schema
  question in step 3 if it comes up.
- Run any SQL needed.
- Spot-check: generate a link, close the screen, retrieve it from the list,
  confirm it works.
