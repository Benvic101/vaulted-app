# Mission 15: Free Tier. Session Handover

Written 2026-10-28. Covers everything from the Claude Code audit through the migration run.

**Status in one line:** Migration chunks 1-7 were run by Ben but are **not yet verified**. Chunk 8 (self-test) has known bugs and has **not been run**. No app code has been written.

---

## 1. Working rules (agreed in this session)

- Plan and confirm everything in chat first. Then send **one consolidated message** to Claude Code.
- Do not send Claude Code a new message while a SQL/migration step is unconfirmed or unrun in Supabase.
- Claude Code never runs migrations. Ben reviews and runs all SQL in the Supabase SQL editor.
- Verify against disk, not summaries: use `sed -n` line ranges, `grep`, `git status`, `git diff --stat`. Claude Code's terminal pastes have been truncated before.
- Inline style objects and existing theme tokens only. Lucide React needs `--legacy-peer-deps`. No payment integration (Dodo Payments later).
- Run SQL one chunk per paste. Wait for the result before the next.
- In the SQL editor, "Success. No rows returned" means a DO block passed. `raise notice` output is not shown.
- The editor warns about `drop ... if exists` and "destructive operations". That is expected. Choose "Run this query". For chunk 1 choose "Run and enable RLS" if asked.

---

## 2. Decisions locked

| # | Decision | Value |
|---|----------|-------|
| 1 | Free-plan client cap | **15**, stored in `plan_limits`, never hardcoded |
| 2 | Plan values | `free`, `solo`, `studio`, `founding` |
| 3 | Default for new signups | `free` |
| 4 | Existing accounts | All backfilled to `founding` once, at column creation. Ben flips a test account to `free` by hand |
| 5 | What counts toward the cap | All `clients` rows for the artist. Deleting a client frees a slot |
| 6 | Delete guard | **Dropped.** All three FKs are `ON DELETE SET NULL`, so deleting a client destroys nothing. Replaced by a warning in the delete dialog |
| 7 | Upgrade prompt | mailto link, address in one `UPGRADE_EMAIL` constant in `plan.js` (Ben to supply the address before deploy) |
| 8 | Usage indicator | Clients page header ("N of CAP clients", free plan only) and Settings Account section |
| 9 | UI labels | Free / Solo / Studio / Founding |
| 10 | Concurrency | `pg_advisory_xact_lock` per artist in the cap trigger (no overshoot) |
| 11 | Counting model | Simple lifetime count. Revisit "active in last N months" only if real free users hit the cap |

---

## 3. Facts established from the live database

**Cascade (query on pg_constraint):** `bookings`, `payments`, `consent_forms` each reference `clients(id)` with `ON DELETE SET NULL`.

**artist_profiles:** five original columns: `artist_id` (uuid PK, default `gen_random_uuid()`), `studio_name` (**NOT NULL**, no default), `full_name`, `phone`, `bio`. RLS policies: own-row select / insert / update. No delete policy. Before the migration, `anon` and `authenticated` both had table-wide SELECT/INSERT/UPDATE/REFERENCES on all five columns.

**clients:** `name` (NOT NULL), `email`, `phone`, `notes`, `artist_id` (**NULLABLE**, default `gen_random_uuid()`), `created_at`, `id`.

**consent_forms:** `client_name` NOT NULL, `client_email` NOT NULL, `status` NOT NULL default `'draft'`, `sign_token` uuid, `client_id` (FK, SET NULL), `artist_id`, `sent_at`, `signed_at`, `signature_data`, `signed_ip`, `edited_at`, `date`, health booleans, `age_verified`, `design_approved`, `aftercare_acknowledged`, `photo_consent`.

**consent_forms CHECK constraints:**
- `consent_forms_status_check`: status in draft / sent / signed.
- `consent_forms_sent_requires_blank_consent`: if status = 'sent', then age_verified, design_approved, aftercare_acknowledged, photo_consent are all false and signature_data is null. Signed rows are unconstrained.

**consent_form_audit columns:** `id, form_id, artist_id, actor_id, action, form_status, client_name, client_email, changed_fields (jsonb), created_at`. Unlinking a client writes one `action='edit'` row per form, with `changed_fields = {"client_id": {"from": <uuid>, "to": null}}`.

**Triggers on consent_forms (all as found):**
- `consent_forms_guard_update` (BEFORE UPDATE) calls `public.guard_consent_form_update()`, SECURITY INVOKER, no search_path.
- `consent_forms_audit_update` / `consent_forms_audit_delete` (AFTER) call `log_consent_form_change()`.
- `notify_consent_signed` (AFTER UPDATE) fires only on sent -> signed.
- There is no trigger maintaining `edited_at`.
- No triggers existed on `clients` or `artist_profiles` before this migration.

**Functions touching artist_profiles:** none (query returned no rows). Revoking `anon` cannot break the signing RPCs.

**Data:** two accounts have clients (4 and 3). Nobody is near 15.

**Pre-existing bugs found:**
1. **Client delete with any attached form fails today.** The SET NULL cascade updates `consent_forms.client_id`, and the Mission 9 guard raises on that. This migration fixes it in the guard function.
2. **Signup upsert fails.** `App.jsx:58` sends only `artist_id` and `full_name`, but `studio_name` is NOT NULL with no default. The error is only `console.error`'d (App.jsx:59-60). New signups have no profile row until they first save Settings. Not fixed in this mission. `usePlan` must treat a missing profile as free. Follow-up item.

---

## 4. Code audit (Claude Code, Phase 1)

- Exactly two inserts into `clients`: `Clients.jsx:170` and `ClientPicker.jsx:84` (used by Bookings, Payments, ConsentForms). No side-effect client creation.
- Hard deletes at `Clients.jsx:106` and `ClientDetail.jsx:81`. No soft-delete or archive column.
- No multi-artist studios yet: one artist per account (`artist_id = auth.uid()`).
- `artist_profiles` readers: `Settings.jsx:44`, `Dashboard.jsx:99`. Writers: `Settings.jsx:84` upsert (artist_id, studio_name, full_name, phone, bio) and `App.jsx:58` signup upsert. No `.delete()` on it.
- `/sign/:token` (`SignConsentForm.jsx`) uses only `consent_forms` and the `sign_consent_form` RPC. No anon read of `artist_profiles`.
- UI surfaces: Settings "Account" section, Clients header next to "Add Client", ClientPicker inline error pattern (`ClientPicker.jsx:135-139`), Dashboard already counts clients (`Dashboard.jsx:44`).

---

## 5. Migration: `migrations/0016_free_tier.sql`

Chunks (run one per paste, in order):

| Chunk | Contents |
|-------|----------|
| 1 | `plan_limits` table, seed (free 15, solo/studio/founding NULL = unlimited), RLS, revoke all, SELECT-only for authenticated |
| 2 | `plan` column on `artist_profiles` plus one-time backfill to `founding`, inside one DO block gated on the column not existing |
| 3 | `artist_profiles` grants: revoke all from anon + authenticated; authenticated gets SELECT (all) and column-level INSERT/UPDATE on (artist_id, studio_name, full_name, phone, bio), excluding `plan` |
| 4 | `artist_profiles_guard_write()`: SECURITY **INVOKER**, INSERT forces plan = free, UPDATE blocks changes to plan or artist_id, bypass for `service_role` / `postgres` |
| 5 | `guard_consent_form_update()` fix: allows the FK-cascade unlink only when `pg_trigger_depth() > 1` AND no other column changed. `CREATE OR REPLACE` only, the existing trigger is untouched |
| 6 | `enforce_client_cap()`: SECURITY DEFINER, `search_path = ''`, advisory lock, fail closed (null artist_id rejected, missing profile = free, missing plan row falls back to free cap, found row with NULL cap = unlimited) |
| 7 | Triggers: `artist_profiles_guard_write` (INSERT/UPDATE), `enforce_client_cap` (BEFORE INSERT on clients) |
| 8 | Self-test (run separately). **Do not run until fixed** |

Rollback (commented at the end) restores the original guard function body verbatim, drops the triggers/functions, the `plan` column, and `plan_limits`.

Error tags the UI should detect: `VLTED_CLIENT_CAP` (cap reached; message is built from the cap value), `VLTED_CLIENT_CAP_INVALID` (null artist_id), `VLTED_PLAN_GUARD` (never user-facing).

### Run history so far
- Chunk 1: confirmed run (screenshot "Success. No rows returned"). A state check later showed the table, 4 seed rows and the policy present.
- Chunk 2: first attempt errored with `syntax error at or near "if"`. This looked like a paste that lost the `do $$` first line. Re-run was advised.
- Ben later reported running chunks 1-7. **Not yet verified.**

### Pending: verify chunks 1-7 (run both, paste results)

```sql
select
  to_regclass('public.plan_limits') is not null as limits_table,
  (select count(*) from public.plan_limits) as limit_rows,
  exists (select 1 from pg_policies where tablename = 'plan_limits') as limits_policy,
  exists (select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'artist_profiles'
            and column_name = 'plan') as plan_col,
  exists (select 1 from pg_proc where proname = 'artist_profiles_guard_write') as guard_fn,
  exists (select 1 from pg_proc where proname = 'enforce_client_cap') as cap_fn,
  exists (select 1 from pg_trigger where tgname = 'artist_profiles_guard_write') as guard_trigger,
  exists (select 1 from pg_trigger where tgname = 'enforce_client_cap') as cap_trigger,
  (select prosrc like '%pg_trigger_depth%' from pg_proc
   where proname = 'guard_consent_form_update') as consent_fix;
```

```sql
select grantee, privilege_type, column_name
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'artist_profiles'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type, column_name;
```

**Expected:** every column in the first result is `true` (`limit_rows` = 4). In the second: no `anon` rows; `authenticated` has SELECT on six columns including `plan`, and INSERT and UPDATE on the five columns without `plan`.

Further checks:

```sql
select plan, count(*) from public.artist_profiles group by plan;   -- all 'founding'
select * from public.plan_limits order by plan;                    -- free 15, others NULL
select event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where event_object_table in ('clients', 'artist_profiles', 'consent_forms')
order by 1, 2;
```

If a chunk is missing, re-run only that chunk (all are safe to re-run). Chunk 2 must be pasted starting from the `do $$` line through the closing `$$;`. Run chunk 3 straight after chunk 2.

---

## 6. Chunk 8 (self-test): known bugs, fix brief ready

The self-test runs everything inside one DO block and ends with a deliberate exception, so nothing is saved. **Pass = a red banner reading exactly:** `SELF-TESTS PASSED - rolled back on purpose, nothing saved`. Any other message starting `TEST FAILED: <id>` is a failure.

Bugs found in the version on disk:
1. T11 uses `v_audit_signed_before` and `v_audit_unsigned_before`, which are not declared. The block won't compile.
2. T9: artist B's update sets `plan`, which B has no grant on, so it throws a raw permission error before the real check.
3. T10: A has n+4 clients against a cap of n+1, so the "slot freed" insert stays blocked. The T3 / T3a test rows must be removed first.
4. T12 inserts a client as postgres while A is at the temporary cap. It only works because T11 deleted a client earlier. Needs a comment and a setup guard.
5. T4's `artist_id` check may pass via RLS rather than the guard. The comment should not claim it proves the guard.

### Brief to send Claude Code (only after chunks 1-7 are verified)

```
Chunks 1-7 are run and verified. Do not change chunks 1-7, the rollback, or any app code. Fix chunk 8 (the self-test) only.

BUGS
1. T11 assigns v_audit_signed_before and v_audit_unsigned_before, but they aren't in DECLARE, so the whole DO block fails to compile. Declare them and drop the v_audit_before / v_audit_after aliasing for the baselines (select the signed-form baseline straight into v_audit_signed_before and the unsigned-form baseline into v_audit_unsigned_before). Then list every variable used vs declared to confirm none is missing.
2. T9: artist B's update sets plan = 'studio', but B has no UPDATE grant on plan, so it raises a raw permission error that aborts the test. Update ONLY full_name and assert FOUND is false (0 rows affected). Add a separate flag-and-raise check that B updating plan raises insufficient_privilege.
3. T10: by then artist A has n+4 clients (T1, T3, T3a solo, T3a studio) against a cap of n+1, so the "slot freed" insert stays blocked. Capture the ids of the test clients T3, T3a solo and T3a studio with RETURNING into variables and, as postgres, delete exactly those ids before T10. Never delete by name pattern. Then, as authenticated A, delete T1 and insert the T10 client; it must succeed.
4. T12 inserts 'T12 client' as postgres while A is free with the cap at n+1. This only works because T11 deleted the T10 client first. Add a comment stating that dependency, and add a guard before the insert: if A's current client count >= the temporary cap, raise TEST FAILED: T12 setup.
5. T4's artist_id check may pass via RLS rather than the guard trigger. Keep it, but change the comment so it doesn't claim to prove the guard.

KEEP
6. The block must still end with the deliberate exception 'SELF-TESTS PASSED - rolled back on purpose, nothing saved'. Every failure message starts with 'TEST FAILED: <id>'. No raise of TEST FAILED inside an exception handler.

OUTPUT: don't paste the whole file. Print the DECLARE section and each changed test (T4, T9, T10, T11, T12) from disk with sed -n line ranges, plus git status. Then stop.
```

After Claude Code replies: paste the printed sections to Claude for review, then run the self-test, then report the banner text.

---

## 7. Test plan

**Database (the self-test covers most of these inside a rolled-back transaction):**
- Free artist under cap can insert; at cap fails with `VLTED_CLIENT_CAP` and the cap number.
- Founding / solo / studio over the free cap can insert.
- Missing plan_limits row falls back to the free cap. Missing profile row counts as free. Null artist_id is rejected.
- Artist cannot change own `plan` or `artist_id`; cannot insert a profile with a paid plan; signup-style insert reads back `free`; Settings-style upsert keeps `founding`.
- `anon` blocked on `artist_profiles` and `plan_limits`; authenticated cannot write `plan_limits`.
- Artist B cannot read or change artist A's profile.
- Deleting a client frees a slot.
- Cascade unlink: forms survive with `client_id` null, exactly one `edit` audit row per form with only `client_id` in `changed_fields`, no change in notification count.
- Direct `client_id` nulling on a signed form fails with "immutable"; on an unsigned form fails with "re-targeted"; editing an unsigned form still works.
- Column privileges query matches the expected grants.

**Manual after migration (not in the self-test):**
- Live Settings save still works. Fresh signup behaviour unchanged.
- Load `/sign/:token` as anon and complete a signing.
- Raising the cap via `update plan_limits set client_cap = N where plan = 'free'` takes effect without a redeploy.

**App (after deploy):**
- Free artist sees "N of CAP clients"; updates on add/delete.
- At cap, "Add client" on the Clients page shows the friendly message.
- At cap, inline-add in `ClientPicker` (booking / payment / consent form) shows the same message and keeps the user's form data.
- Over-cap artist can still view, edit and delete existing clients.
- Switching an account to `solo` / `studio` in SQL and refreshing removes the cap.
- Delete dialog shows correct linked-record counts; linked records still exist after delete.
- Mobile and tablet, light and dark themes.

To test the at-cap case without 15 clients, temporarily set the free cap low (for example, to the account's current count), test, then set it back to 15 and confirm:

```sql
update public.plan_limits set client_cap = 15 where plan = 'free';
select * from public.plan_limits order by plan;
```

---

## 8. App-code stage (not started; gated on a verified migration)

New files:
- `src/utils/plan.js`: plan labels, `isFreePlan`, `canAddClient(plan, count, cap)`, cap-error detection (match on `VLTED_CLIENT_CAP` in `error.message`), `UPGRADE_EMAIL` constant.
- `src/hooks/usePlan.js`: fetches the artist's plan, the cap from `plan_limits`, and the client count (head-count query, refetchable). **Fails open** on fetch errors (the DB trigger still enforces). A missing profile row means free.
- `src/utils/clientLinks.js` (fetcher for linked bookings / payments / signed consent forms) plus one shared warning component used by both delete dialogs.

Modified files:
- `Clients.jsx`: pre-check on Add Client, friendly message with form data untouched, counter in the header (free plan only), mailto upgrade prompt, delete dialog warning.
- `ClientPicker.jsx`: uses `usePlan`; at cap shows the friendly message inline instead of attempting the insert; also handle a real `VLTED_CLIENT_CAP` error from the insert; parent form data never cleared.
- `Settings.jsx`: plan name and usage line in the Account section.
- `ClientDetail.jsx`: delete dialog gets the same warning (`ClientDetail.jsx:81`).

Delete warning copy must say: linked bookings, payments and signed consent forms are kept but unlinked; signed forms stay in Consent Forms (listed by client name) but no longer appear on the client's detail page.

Order of work: migration verified -> self-test passes -> one consolidated app-code brief to Claude Code -> build + lint (report against the baseline) -> deploy -> live checks.

---

## 9. Definition of done

- Migration run and verified by Ben; grants verified; self-test passes.
- Deployed to Vercel; live checks pass.
- Confirmed an artist cannot upgrade themselves.
- Handover file updated: Mission 15 confirmed working, cap and plan names recorded, follow-ups noted.

## 10. Follow-ups (out of scope for Mission 15)

- Fix the signup upsert in `App.jsx:58` (missing `studio_name`; error is silently logged).
- Self-serve upgrade via Dodo Payments.
- Notifications retention job.
- Limits on other resources, if ever needed.
- Studio / multi-artist account modelling; referral discounts; browser push.
- Mission 14 repo hygiene (migration file `v_token uuid` fix, obsolete tablet-rail CSS rule) if not already done.

## 11. Open items for Ben

- Supply the real email address for `UPGRADE_EMAIL`.
- Supabase had an "Intermittent latency in Eastern US" incident (status page, Sep 30). Dashboard queries failed with "Failed to fetch" during it. Run SQL during quieter hours and use the state-check query if a run fails ambiguously.
- Confirm chunks 1-7 landed (verification queries above), then send the chunk 8 brief.
