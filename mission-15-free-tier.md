# Mission 15 — Permanent Free Tier (15-client cap)

Status: built on branch `mission-15-free-tier`, NOT yet applied/deployed.

## Decisions
- DB-enforced cap (trigger on `clients`), clients only, 15 max on `free`.
- Plans: free | solo | studio | founding. All existing accounts -> `founding` (uncapped).
- No trial period (deliberately skipped until paid-only features exist).
- Over-limit artists keep all data; they just can't add more.

## Apply (in order)
1. Run `supabase/migrations/2026-11-06-free-tier-plan.sql` in the Supabase SQL editor (whole script).
2. Run the VERIFY queries at the bottom of that file.
3. Merge the branch / deploy. (Frontend is safe to deploy before step 1: plan UI hides itself if `get_my_plan` is missing.)

## Test
- Existing account: no "Free plan" counter shown (founding).
- `update artist_profiles set plan='free' where artist_id='<uuid>'` -> counter shows "n / 15", add clients up to 15, 16th is blocked with the friendly message from both Clients page and ClientPicker (booking/consent forms).
- From the browser console, try updating your own `plan` -> must stay unchanged.
- New signup -> `free`.

## Upgrade someone manually (until Dodo Payments is wired)
`update public.artist_profiles set plan='solo' where artist_id='<uuid>';`
