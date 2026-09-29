# Mission 14 — Artist Notifications, Phase 2: In-App Bell

## Context

Phase 1 (Mission 13) is live: clients get 3-day and 1-day email reminders via
Resend, tracked in the `reminders` table by a daily Vercel Cron function.
That table is about *client emails sent*. Phase 2 is a different domain —
what the **artist** sees inside the app — so it gets its own `notifications`
table rather than reusing `reminders`.

Artists have logins, so this side is in-app only: a notification bell with an
unread badge and a list. No email to artists, no browser push (later phase).

## Scope

- A bell icon in the app header/nav shell showing an unread count badge.
- Clicking it opens a panel/list of notifications, newest first, each with a
  title, short body, relative time, and a link to the relevant page
  (booking, consent form, client).
- Mark a single notification as read (on click) and "Mark all as read".
- Unread vs read visual states, using existing theme tokens (light and dark
  must both work — no hardcoded colors).
- Loading / empty / error states following the Mission 10 pattern
  (`ListError`, 15s `withTimeout`), so failures are never silent.

## Which events create notifications (Ben to confirm before build)

Proposed starting set — small on purpose:

1. **Client signed a consent form** — created by a DB trigger when a form
   flips from `sent` to `signed` (the signing path is a SECURITY DEFINER RPC,
   so a trigger there is the reliable place).
2. **Booking coming up** — created by the cron function: a notification for
   bookings happening tomorrow (and/or today). Extending the existing
   `api/cron-reminders.js` run is likely simpler than a second cron job.
3. **A client reminder email failed to send** — surfaces the `status='failed'`
   rows Phase 1 already records, so Ben doesn't have to look in Supabase.

Deliberately NOT in the first cut (candidates for later): unpaid deposits,
unsigned consent forms overdue, new-booking alerts. Ben can add or remove
from the list above before implementation.

## Proposed approach (for Ben to approve before implementation)

1. **Schema** — propose a `notifications` table as a migration file for Ben
   to review and run himself in Supabase (no auto-applying). Suggested
   columns: id, artist_id, type, title, body, link target (entity type + id),
   read_at (null = unread), created_at.
   - RLS: artists can SELECT and UPDATE (mark read) only their own rows; no
     client-side INSERT. Rows are created only by triggers / the service-role
     cron function.
   - Duplicate guard for cron-generated rows (e.g. unique on
     artist_id + type + booking_id) so a cron re-run can't create repeats —
     same database-level guarantee approach as `reminders`.
2. **Creation** — DB trigger for signed consent forms; cron extension for
   upcoming bookings and failed reminder emails.
3. **Frontend** — `NotificationBell` component in the nav shell, plus the
   panel/list. Reuse existing icon-button pattern and theme tokens.
4. **Freshness** — start simple: fetch on load and when the tab regains
   focus (optionally a light interval). Flag whether Supabase Realtime is
   worth adding now or should wait; don't add it without checking with Ben.
5. **Mobile** — the app has a responsive shell (Mission 7); the bell and
   panel must work on phone widths (panel as full-width sheet or similar),
   not just desktop.
6. Flag immediately if anything needs a schema or RLS change beyond the
   above, since Ben runs all Supabase SQL himself.

## Out of scope

- Browser push notifications (later phase).
- Any notification channel for clients beyond the existing emails.
- Per-artist notification settings/preferences (which types to receive).
- Email or SMS to artists.
- Notification retention/auto-cleanup (note it as a future concern if the
  table could grow large).

## Testing plan

- Have a test client sign a consent form via the real `/sign/:token` link;
  confirm exactly one notification appears for the right artist.
- Trigger the cron manually (curl with the CRON_SECRET, single-quoted header)
  with a booking tomorrow; confirm one notification, then run again and
  confirm no duplicate.
- Simulate a failed reminder (bad key temporarily) and confirm the
  failed-email notification appears.
- Mark one read, mark all read, reload the page — unread count stays correct.
- Log in as a second artist and confirm they cannot see the first artist's
  notifications (RLS check).
- Check both themes and a phone-width viewport; run lint/build and confirm no
  new error classes.

## Ben's role

- Confirm the event list above (add/remove types).
- Review and run the notifications migration in Supabase.
- Set any new environment variables in Vercel if the cron changes need them
  (none expected — the cron already has its keys).
- Spot-check the tests above, especially the two-artist RLS check.
