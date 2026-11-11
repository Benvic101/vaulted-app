# Mission 15 — Permanent Free Tier (plan field + client-count cap)

Do not use. See mission-15-session-handover.md

**Status:** Draft, not started. Mission 14 (notifications) is closed.
**Workflow:** Audit → propose → wait for Ben's approval → implement → test.
**Hard rules (same as every mission):**
- Do NOT write code or SQL until Ben approves the proposal (Phase 2).
- Claude Code NEVER runs migrations. Write the SQL to `migrations/0016_free_tier.sql` (next number after `0015_notifications.sql`); Ben reviews and runs it himself in the Supabase SQL editor.
- Inline style objects and the existing theme tokens only. No Tailwind, no new UI libraries.
- Lucide React needs `--legacy-peer-deps`.
- No payment integration in this mission (Stripe is deferred; Dodo Payments later, if built).

---

## Goal

Let an artist use Vaulted free forever within a limit, so distribution is not blocked by asking for a card or a subscription decision on day one. Paid plans (Solo $15/mo, Studio $40/mo flat) stay as the upgrade path.

**Scope:** a `plan` field on the artist profile, plus a cap on the number of **clients** an artist on the free plan can have. Bookings, payments, consent forms, portfolio, reminders and notifications stay unlimited for now.

---

## Locked context

- Pricing is locked: Solo $15/mo (1 artist), Studio $40/mo flat (2+ artists, no per-seat pricing, no transaction fee). The founding cohort of 20 studios gets it free before paid pricing turns on.
- Revenue is $0. The gap is distribution, not features. The free tier should make it easy to say yes to Vaulted, not add friction.
- There is no in-app payment flow yet, so "upgrade" cannot be self-serve. Plan changes are made by Ben in SQL for now.

---

## Phase 1 — Audit (read-only, report back, change nothing)

Report findings on each of these:

1. **Artist profile.** Which table holds the artist profile (it appears to be `artist_profiles`)? Show its columns, RLS policies, and grants. Is there already any plan, tier, or subscription-like field?
2. **Every path that creates a client.** Search the whole codebase for inserts into `clients`, including the Clients page, `ClientPicker` inline-add-new-client (Mission 3), and anything that creates a client as a side effect of a booking, payment or consent form. List each file and line. A cap is only real if every path is covered.
3. **How "client count" is defined.** Does `clients` have `artist_id`? Are there soft deletes or archived clients that should or should not count? Can an artist delete clients, and does deleting free up a slot?
4. **Studios / multiple artists.** Does the app model multi-artist studios at all yet, or is it one artist per account? This decides whether the plan belongs on the artist profile or on a studio entity later.
5. **Existing data.** Run (as a proposed read-only query for Ben, not executed by you) a count of clients per artist, so we know who would already be over any proposed cap.
6. **Where the plan needs to be visible in the UI.** Settings, Clients page, ClientPicker, Dashboard. What already exists that a usage indicator could plug into?

---

## Phase 2 — Proposal (present, then STOP and wait for approval)

Give Ben a short proposal covering the design below and the open decisions. Do not implement.

### Design requirements (non-negotiable)

1. **Users must not be able to change their own plan.** This is the most important requirement. If `plan` sits on a table where artists can update their own row, they could upgrade themselves from the browser. Use the same approach as `notifications`: revoke broad UPDATE, grant column-level UPDATE only on the columns artists may edit (excluding `plan`), and add a guard trigger as a backstop that rejects any change to `plan` unless the role is `service_role` or `postgres`. Prove it in the test phase.
2. **The cap is enforced in the database, not just the UI.** A `BEFORE INSERT` trigger on `clients` that counts the artist's existing clients and raises a clear, catchable error when the artist is on the free plan and at or over the cap. The UI check is a courtesy for a nice message. Consider concurrent inserts (two tabs) and say whether a small overshoot is acceptable or whether to use an advisory lock.
3. **Existing users are never punished.** Nobody loses data. An artist already over the cap keeps every existing client and can edit and delete them. They just cannot add new ones until they are under the cap or upgraded.
4. **Cap logic lives in one place.** One shared helper (for example `src/utils/plan.js`) with the plan names, the cap number and a `canAddClient(plan, clientCount)` check, so the number is not scattered through components.
5. **Friendly failure.** When the cap is hit, no silent failure and no raw Postgres error. Show a clear message using the existing `ListError` / inline error patterns and the theme tokens, and handle the trigger's error in every client-creation path found in the audit, including `ClientPicker`.
6. **Usage is visible.** Show "N of CAP clients" somewhere sensible (Clients page header and/or Settings) for free-plan artists, and hide it for paid plans.
7. **No payment flow.** The upgrade prompt is a simple message plus a contact action (for example a mailto or a "plans coming soon" note). Propose one and let Ben pick.

### Decisions for Ben (present options with a recommendation for each)

| # | Decision | Starting suggestion (change freely) |
|---|----------|-------------------------------------|
| 1 | **Cap number** for the free plan | **Decided by Ben: 15 clients.** Keep it in one place so it can be raised later without rewriting the migration. Propose how the app helper and the DB trigger read the same value so they can never disagree. |
| 2 | **Plan values** | `free`, `solo`, `studio`, plus `founding` for the free founding cohort (uncapped, full features). Confirm the names before they go into a CHECK constraint. |
| 3 | **Default plan for new signups** | `free` |
| 4 | **Plan for existing accounts** | Ben's own account and any test accounts should not get locked out. Propose which existing accounts get `founding` versus `free`. |
| 5 | **What counts toward the cap** | All clients rows for the artist, or only non-archived ones. Depends on audit item 3. **Watch out:** tattoo clients are often one-off, so a lifetime count only ever goes up. Check what deleting a client cascades to (bookings, payments, consent forms). The cap must not push artists to delete clients just to free a slot, because that could destroy signed consent forms. Propose a guard: warn on delete, block deleting clients who have signed consent forms, or count only recently active clients. |
| 6 | **Upgrade prompt** | Message only, mailto link, or a "join the waitlist" note. |
| 7 | **Where the usage indicator shows** | Clients page, Settings, or both. |

End the proposal with the exact files you would change, the migration outline, and the test plan, then stop.

---

## Phase 3 — Implementation (only after Ben approves)

1. Write `migrations/0016_free_tier.sql`. Make it idempotent where possible, in the same style as `0015`. It should contain:
   - the `plan` column with a CHECK constraint and a default, and how existing rows are backfilled
   - the grants and guard trigger that stop artists from editing `plan`
   - the client-cap trigger and its error message
   - a self-test block Ben can run separately (see Phase 4)
2. Add the shared plan helper.
3. Wire the cap into every client-creation path from the audit, with friendly error handling.
4. Add the usage indicator and the upgrade prompt.
5. Build passes and no new lint error classes. Report the lint count against the current baseline.
6. Show Ben the migration file and paste `cat` output so it can be verified against what is on disk. Do not assume an edit landed.

---

## Phase 4 — Test plan (Ben runs these)

**Database (SQL editor; simulate roles the way the Mission 14 isolation test did):**
1. As a free-plan artist under the cap, inserting a client succeeds.
2. As a free-plan artist at the cap, inserting a client fails with the cap error.
3. As a paid or `founding` artist over the free cap, inserting a client succeeds.
4. As an authenticated artist, `update artist_profiles set plan = 'studio'` on their own row FAILS (permission or guard error).
5. Artists can still update the profile fields they should be able to (name, and so on).
6. Another artist cannot read or change anyone else's plan.
7. Deleting a client frees a slot when the audit said it should.
8. Verify grants with a query on `information_schema.column_privileges` for `artist_profiles`.

**App (live site after deploy):**
1. A free artist sees "N of CAP clients" and it updates as clients are added or removed.
2. At the cap, "Add client" on the Clients page shows the friendly message.
3. At the cap, inline-add in `ClientPicker` (when creating a booking, payment or consent form) shows the same friendly message and does not lose the user's form data.
4. An artist over the cap can still edit, delete, and view all existing clients.
5. Switch the artist to `solo` or `studio` in SQL, refresh, and confirm the cap disappears.
6. Check mobile and tablet layouts, in light and dark themes.

---

## Definition of done

- Migration reviewed and run by Ben; grants verified; self-test passes.
- Deployed to Vercel and the live checks above pass.
- Confirmed that an artist cannot upgrade themselves.
- Handover file updated: Mission 15 confirmed working, the chosen cap number and plan names recorded, and any follow-ups noted (for example self-serve upgrade via Dodo Payments, and limits on other resources if ever needed).

## Out of scope (do not build here)

- Payment processing or subscription billing
- Limits on bookings, payments, consent forms, portfolio or reminders
- Studio / multi-artist account modelling
- Referral discounts
- Browser push notifications and the notification retention job
