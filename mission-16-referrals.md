# Mission 16: Creator Referral Links

Workflow: audit first, propose, wait for Ben's approval, then implement, then test. Do NOT write or run any SQL yourself. Ben reviews and runs all Supabase SQL.

## Goal
Give each content creator a personal link (`https://vaulted-app-six.vercel.app/?ref=CODE`). Any artist who registers through it is tagged to that creator and automatically becomes a **founding** member (uncapped plan). Ben can see how many artists each creator brought in.

## Decisions already made by Ben
- Creator reward: free Studio plan for life plus a credit per paying referral. Rewards are only TRACKED for now (Dodo payments are not integrated). Do not build payout logic.
- Referred artists get `plan = 'founding'` (uncapped), not the 15-client free plan.
- No creator dashboard. Ben checks counts in Supabase.

## Step 1: Audit (report back, change nothing)
1. How signup works today (file, flow, email confirmation on or off) and where the `artist_profiles` row is created.
2. Current plan guard: the overlapping triggers `artist_profiles_guard_write` / `guard_artist_plan` and `enforce_client_cap` / `enforce_client_limit`. Can a SECURITY DEFINER function set `plan`? Does the guard block it?
3. Where the app reads the plan (`src/utils/plan.js`).
4. Whether `/?ref=` survives the landing route, the login redirect and the email-confirmation redirect.

## Step 2: Proposed design (confirm against the audit)
- **Table `creators`**: id, code (unique, uppercase, url-safe), name, handle, platform (instagram/youtube), notes, created_at. RLS on, NO policies for anon or authenticated. Only Ben (SQL editor) and SECURITY DEFINER functions touch it.
- **Column `artist_profiles.referred_by_code`** (text, nullable, FK to creators.code, set once, never editable by the client).
- **Capture**: on app load, if `?ref=` is present, save it to localStorage (try/catch), uppercase and trimmed. Keep it through signup and email confirmation.
- **RPC `apply_referral(p_code text)`**: SECURITY DEFINER, authenticated only. Runs once after the first authenticated session. Validates the code exists, requires `referred_by_code` to be null, sets `referred_by_code` and `plan = 'founding'`, returns a status. Fails quietly and safely on bad codes, since signup must never break. After it runs, clear the localStorage value.
- **Guard compatibility**: make sure the plan guard allows this function to change `plan` while still blocking direct client writes.
- **View `creator_referral_counts`** (Ben-only): creator code, name, signups, and signups with at least one client added (activation).
- **Abuse limits**: a user can't apply a code to an account that already has one, can't apply a code after having an existing plan other than `free`, and invalid codes reveal nothing.

## Step 3: Deliverables
- Migration file `supabase/migrations/2026-11-XX-referrals.sql` (Ben runs it himself), including a test block that runs the RPC as `authenticated` and checks the anon role cannot read `creators`.
- A short seed snippet, with an example row, for adding a creator.
- Frontend changes (capture hook plus RPC call after login). If the signup screen shows a referral banner, make it small, e.g. "Invited by [name]". Do not expose the creator list.

## Step 4: Test plan
1. Open `/?ref=TESTCODE` in incognito, sign up, confirm email, log in. The profile shows `referred_by_code = TESTCODE` and `plan = 'founding'`.
2. Sign up with no code. The plan stays `free`.
3. Bad code. Signup works normally and nothing is tagged.
4. Existing account opens a ref link. Nothing changes.
5. Authenticated and anon cannot select from `creators` or update `plan` or `referred_by_code` directly.
6. The count view returns the right numbers.
7. The code survives an email-confirmation round trip on mobile.

Stop after the audit and proposal and wait for approval before building.
