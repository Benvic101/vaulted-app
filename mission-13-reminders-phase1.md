# Mission 13 — Reminders System, Phase 1: Client Email Reminders

## Why split into phases

This is a bigger feature than the recent bug-fix missions — it needs a new
table, a scheduled job, and an email integration that isn't wired up yet.
Splitting it the way we split the theme toggle keeps each phase reviewable
and lets Ben approve the schema before anything else is built on top of it.

- **Phase 1 (this mission):** client-facing reminders only — email, no
  login required on the client side.
- **Phase 2 (later mission):** artist-facing in-app bell notifications,
  browser push after that.

## Scope (Phase 1)

- Clients get an automatic email reminder **3 days before** and
  **1 day before** a booking.
- Delivery via **Resend** (planned integration, not yet wired up — this
  mission is also what wires it up).
- No client login exists, so this is one-way email only — no in-app
  notification center for clients.
- Needs a `notifications` (or `reminders`) table to track what's been sent,
  so the scheduled job doesn't send duplicates.
- Needs a scheduled job to run daily and check which bookings fall exactly
  3 or 1 day out. Leaning **Vercel Cron** since the app is already on
  Vercel — flag if there's a better fit given the current stack.

## Proposed approach (for Ben to approve before implementation)

1. **Resend setup** — confirm Ben has a Resend account/API key ready (this
   is external to the codebase; flag exactly what's needed from Ben before
   writing code that depends on it).
2. **Schema** — propose the `notifications`/`reminders` table structure
   (booking reference, reminder type/offset, sent timestamp, status) as a
   migration for Ben to review and run himself in Supabase SQL — no
   auto-applying schema changes.
3. **Email template** — simple, on-brand (reuse Vaulted's existing visual
   language — gold/dark, Playfair Display heading) with booking details
   (date, time, studio/artist name) and nothing sensitive beyond what the
   client already knows.
4. **Cron job** — daily job that queries bookings 3 and 1 day out, checks
   the notifications table to avoid duplicate sends, sends via Resend,
   logs the result.
5. **Failure handling** — if Resend fails to send, log the failure clearly
   (don't fail silently — this is exactly the kind of thing Mission 10 was
   about) so Ben can see and manually follow up if needed.

## Out of scope (Phase 1)
- Artist-facing in-app bell notifications — Phase 2.
- Browser push notifications — after Phase 2.
- Any reminder-timing customization by the artist (fixed at 3 days + 1 day
  for now) — future enhancement if Ben wants it later.
- Reminders for anything other than bookings (e.g. no aftercare reminders
  yet — that's a separate planned feature).

## Testing plan
- Create a test booking exactly 3 days out, run the cron logic manually
  (or trigger it early), confirm the email sends once and is logged.
- Confirm a second manual trigger the same day does NOT send a duplicate.
- Create a booking 1 day out, confirm the second reminder fires
  independently of the 3-day one already having (or not having) fired.
- Simulate a Resend failure (bad API key, temporarily) and confirm it logs
  clearly rather than failing silently.

## Ben's role
- Provide/confirm Resend account and API key.
- Review and run the notifications/reminders table migration in Supabase.
- Approve the email template content/design before it goes live.
- Spot-check: a real test booking receives both reminder emails at the
  right offsets, with no duplicates.
