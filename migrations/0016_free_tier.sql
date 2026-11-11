-- Mission 15, Phase 3: permanent free tier (plan field + client-count cap).
--
-- Run each labelled chunk below in the Supabase SQL editor, top to bottom.
-- Every chunk is safe to re-run. The SQL editor will warn about
-- "drop ... if exists" and destructive operations — expected and safe;
-- these statements only replace objects this migration owns.
-- The backfill to 'founding' runs only when the plan column is first added
-- (inside the one-time DO block, before any trigger exists) — never on a
-- re-run.
--
-- Structure:
--   CHUNK 1  plan_limits table + seed + RLS/grants
--   CHUNK 2  plan column + one-time backfill to 'founding'
--   CHUNK 3  artist_profiles grants (revoke, then column-level grant-back)
--   CHUNK 4  plan/artist_id guard function (SECURITY INVOKER)
--   CHUNK 5  Mission 9 consent-guard fix (cascade-unlink exception)
--   CHUNK 6  client cap function (SECURITY DEFINER, reads plan_limits)
--   CHUNK 7  triggers (applied last; functions exist by now)
--   CHUNK 8  self-test block — run SEPARATELY, rolls everything back
--   ROLLBACK section at the end (restores the ORIGINAL Mission 9 guard).
--
-- Never revoke from service_role: the reminders cron uses it.
-- Single source of truth for the free cap is plan_limits.client_cap
-- ('free' row). Raise/lower it with one UPDATE; no migration rewrite.

-- ============================================================================
-- CHUNK 1 — plan_limits table (the only place the cap number lives).
-- ============================================================================

create table if not exists public.plan_limits (
  plan text primary key check (plan in ('free', 'solo', 'studio', 'founding')),
  -- null = unlimited for this plan.
  client_cap int,
  constraint plan_limits_cap_positive check (client_cap is null or client_cap > 0)
);

insert into public.plan_limits (plan, client_cap) values
  ('free', 15),
  ('solo', null),
  ('studio', null),
  ('founding', null)
on conflict (plan) do nothing;

alter table public.plan_limits enable row level security;

revoke all on public.plan_limits from anon, authenticated;

-- Read-only for artists (the app needs the cap number for its UI copy).
-- Nothing secret in the table: a bare SELECT policy.
drop policy if exists "Artists can read plan limits" on public.plan_limits;
create policy "Artists can read plan limits"
  on public.plan_limits for select
  to authenticated
  using (true);

grant select on public.plan_limits to authenticated;

-- ============================================================================
-- CHUNK 2 — plan column on artist_profiles + one-time backfill.
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'artist_profiles'
      and column_name = 'plan'
  ) then
    alter table public.artist_profiles
      add column plan text not null default 'free'
      check (plan in ('free', 'solo', 'studio', 'founding'));

    -- One-time backfill: nobody already here gets capped. New signups get
    -- the column default 'free'. Ben flips test accounts to 'free' by hand.
    update public.artist_profiles set plan = 'founding';
  end if;
end;
$$;

-- ============================================================================
-- CHUNK 3 — artist_profiles grants.
--
-- Today anon and authenticated hold table-wide SELECT/INSERT/UPDATE. Revoke
-- everything from both, then grant back to authenticated only, column-level.
-- artist_id stays in the UPDATE list because PostgREST upserts SET every
-- payload column. plan is excluded from both write grants.
-- service_role is NOT touched — the reminders cron depends on it.
-- ============================================================================

revoke all on public.artist_profiles from anon, authenticated;

grant select on public.artist_profiles to authenticated; -- all columns incl. plan

grant insert (artist_id, studio_name, full_name, phone, bio)
  on public.artist_profiles to authenticated;

grant update (artist_id, studio_name, full_name, phone, bio)
  on public.artist_profiles to authenticated;

-- ============================================================================
-- CHUNK 4 — plan/artist_id guard function (SECURITY INVOKER).
--
-- SECURITY INVOKER on purpose: as DEFINER, current_user becomes the table
-- owner and the role check would pass everyone. Same role-check pattern as
-- 0015. UPDATE: plan and artist_id may not change. INSERT: plan must be
-- 'free' (closes the insert hole). Column grants are primary; this is the
-- backstop.
-- ============================================================================

create or replace function public.artist_profiles_guard_write()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('service_role', 'postgres') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.plan is distinct from 'free' then
      raise exception 'VLTED_PLAN_GUARD: new profiles always start on the free plan'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.plan is distinct from old.plan then
    raise exception 'VLTED_PLAN_GUARD: plan cannot be changed by the artist'
      using errcode = 'check_violation';
  end if;
  if new.artist_id is distinct from old.artist_id then
    raise exception 'VLTED_PLAN_GUARD: artist_id cannot be changed'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- ============================================================================
-- CHUNK 5 — Mission 9 consent-guard fix (set-null unlink via FK cascade).
--
-- Deleting a client UPDATEs consent_forms.client_id to null via the FK's
-- ON DELETE SET NULL. The existing guard raises on ANY client_id change
-- (and on any change to a signed form), so every client delete with an
-- attached form aborts today — pre-existing bug, fixed here.
--
-- The unlink is allowed ONLY when BOTH hold:
--   - pg_trigger_depth() > 1  → the update came from the FK cascade, never
--     a direct API update;
--   - no other column changed → to_jsonb(new) - 'client_id' equals
--     to_jsonb(old) - 'client_id'.
--
-- Attributes match the original exactly (LANGUAGE plpgsql, no SECURITY
-- clause, no search_path). The existing consent_forms_guard_update trigger
-- already points at this function, so CREATE OR REPLACE is sufficient —
-- no drop/create of the trigger here.
-- ============================================================================

create or replace function public.guard_consent_form_update()
returns trigger
language plpgsql
as $function$
begin
  -- The one legitimate client_id change: the FK cascade nulling it because
  -- the client row was deleted. Depth > 1 guarantees it is the cascade;
  -- the jsonb comparison guarantees nothing else was touched.
  if new.client_id is null and old.client_id is not null
     and pg_trigger_depth() > 1
     and to_jsonb(new) - 'client_id' = to_jsonb(old) - 'client_id' then
    return new;
  end if;

  if old.status = 'sent' and new.status = 'signed' then
    return new;
  end if;
  if old.status = 'signed' then
    raise exception 'Signed consent forms are immutable';
  end if;
  if new.client_id is distinct from old.client_id then
    raise exception 'A consent form cannot be re-targeted to a different client';
  end if;
  if new.artist_id is distinct from old.artist_id
     or new.sign_token is distinct from old.sign_token
     or new.signature_data is distinct from old.signature_data
     or new.signed_at is distinct from old.signed_at
     or new.status is distinct from old.status then
    raise exception 'Ownership, signing token, signature and status cannot be modified';
  end if;
  return new;
end;
$function$;

-- ============================================================================
-- CHUNK 6 — client cap function (SECURITY DEFINER, fixed search_path).
--
-- BEFORE INSERT on clients. Cap comes from plan_limits, never hardcoded.
-- Fail closed:
--   - NULL artist_id              → rejected (clients.artist_id is nullable;
--     a null would bypass the per-artist count entirely);
--   - missing profile row         → treated as 'free' (coalesce);
--   - plan row missing in plan_limits → fall back to the 'free' row's cap
--     and treat the plan as free;
--   - free row also missing       → blocked (raise), never allowed;
--   - plan row found with NULL cap → unlimited, insert allowed.
-- pg_advisory_xact_lock per artist serialises concurrent inserts (two tabs
-- cannot race past the cap).
-- ============================================================================

create or replace function public.enforce_client_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_cap int;
  v_count int;
begin
  -- clients.artist_id is nullable; a NULL here would bypass the count.
  if new.artist_id is null then
    raise exception 'VLTED_CLIENT_CAP_INVALID: client must belong to an artist'
      using errcode = 'check_violation';
  end if;

  -- Serialise inserts per artist: two tabs inserting simultaneously see
  -- the same count; the second waits for the first's transaction to commit.
  perform pg_advisory_xact_lock(hashtext(new.artist_id::text));

  select p.plan
    into v_plan
  from public.artist_profiles p
  where p.artist_id = new.artist_id;

  -- SELECT INTO with no row leaves the variable NULL → free (fail closed).
  v_plan := coalesce(v_plan, 'free');

  select l.client_cap
    into v_cap
  from public.plan_limits l
  where l.plan = v_plan;

  if not found then
    -- Unknown plan: fall back to the free row's cap, treated as free.
    select l2.client_cap
      into v_cap
    from public.plan_limits l2
    where l2.plan = 'free';
    if not found then
      -- No plan row and no free row: block rather than allow.
      raise exception 'VLTED_CLIENT_CAP: free plan limit is not configured'
        using errcode = 'check_violation';
    end if;
    v_plan := 'free';
  end if;

  -- Row found + NULL cap = unlimited for this plan.
  if v_cap is null then
    return new;
  end if;

  select count(*) into v_count
  from public.clients
  where artist_id = new.artist_id;

  if v_count >= v_cap then
    raise exception
      'VLTED_CLIENT_CAP: Free plan limit of % clients reached. Upgrade to keep adding clients.',
      v_cap
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- ============================================================================
-- CHUNK 7 — triggers. Applied last; all functions exist by now.
--
-- consent_forms_guard_update already calls public.guard_consent_form_update()
-- (confirmed in the catalog), so CHUNK 5's CREATE OR REPLACE is sufficient —
-- no trigger changes for consent_forms here.
-- ============================================================================

drop trigger if exists artist_profiles_guard_write on public.artist_profiles;
create trigger artist_profiles_guard_write
  before insert or update on public.artist_profiles
  for each row execute function public.artist_profiles_guard_write();

drop trigger if exists enforce_client_cap on public.clients;
create trigger enforce_client_cap
  before insert on public.clients
  for each row execute function public.enforce_client_cap();

-- ============================================================================
-- CHUNK 8 — SELF-TESTS. Run SEPARATELY from the chunks above (paste on its
-- own into the SQL editor).
--
-- This block does NOT create auth users — it reuses two existing users (the
-- two oldest) purely as identities. Everything happens inside this one
-- transaction, and the block ends by raising an exception on purpose, so
-- Postgres rolls the whole thing back: nothing commits, pass or fail.
-- Every failure raises 'TEST FAILED: <test id>' (which also rolls back).
-- Expected final output: SELF-TESTS PASSED - rolled back on purpose.
--
-- Consent-form facts used below (from the live catalog):
--   - CHECK consent_forms_sent_requires_blank_consent: a 'sent' row must
--     have age_verified/design_approved/aftercare_acknowledged/photo_consent
--     all false and signature_data null. Signed rows are unconstrained.
--   - audit rows: one action='edit' row per changed form, changed_fields =
--     {"client_id": {"from": <uuid>, "to": null}} for the unlink.
-- ============================================================================

do $$
declare
  v_a uuid;            -- artist A (free plan under test)
  v_b uuid;            -- artist B (isolation tests)
  v_client uuid;
  v_client2 uuid;
  v_form_signed uuid;
  v_form_unsigned uuid;
  v_form_signed2 uuid;
  v_form_unsigned2 uuid;
  v_n int;
  v_cap int;
  v_dummy int;
  v_notif_before int;
  v_notif_after int;
  v_audit_before int;
  v_audit_after int;
  v_readback text;
  v_ok boolean;
begin
  -- --- Identities: two existing users, profile rows ensured (rolled back).
  -- studio_name is NOT NULL with no default, so it is in every profile
  -- insert. ON CONFLICT DO NOTHING + explicit updates: real names on
  -- existing profiles are never overwritten.
  select id into v_a from auth.users order by created_at limit 1;
  if v_a is null then
    raise exception 'TEST FAILED: SETUP: no users exist to test with';
  end if;
  select id into v_b from auth.users where id <> v_a order by created_at limit 1;
  if v_b is null then
    raise exception 'TEST FAILED: SETUP: need two existing users';
  end if;

  insert into public.artist_profiles (artist_id, studio_name, full_name)
    values (v_a, 'Vaulted Test A', 'Test Artist A'),
           (v_b, 'Vaulted Test B', 'Test Artist B')
    on conflict (artist_id) do nothing;

  update public.artist_profiles set plan = 'free' where artist_id = v_a;

  -- Cap sized to A's current real client count + 1: no bulk rows, no deletes
  -- of pre-existing data. (Value restored only by the rollback.)
  select count(*) into v_n from public.clients where artist_id = v_a;
  select client_cap into v_cap from public.plan_limits where plan = 'free';
  update public.plan_limits set client_cap = v_n + 1 where plan = 'free';

  -- Helper claims for A.
  perform set_config('request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', v_a)::text, true);
  set local role authenticated;

  -- --- T1: under-cap insert as authenticated A succeeds. -------------------
  insert into public.clients (name, artist_id) values ('T1 client', v_a)
    returning id into v_client;

  -- --- T2: at-cap insert fails with VLTED_CLIENT_CAP + the cap number. -----
  v_ok := false;
  begin
    insert into public.clients (name, artist_id) values ('T2 client', v_a);
  exception
    when check_violation then
      -- Flag-and-raise pattern: never raise TEST FAILED inside a handler.
      if sqlerrm like '%VLTED_CLIENT_CAP%'
         and position((v_n + 1)::text in sqlerrm) > 0 then
        v_ok := true;
      end if;
  end;
  if not v_ok then
    raise exception 'TEST FAILED: T2: at-cap insert did not fail with VLTED_CLIENT_CAP + cap number';
  end if;

  -- --- T3: founding artist inserts over the cap; then back to free. --------
  reset role;
  update public.artist_profiles set plan = 'founding' where artist_id = v_a;
  insert into public.clients (name, artist_id) values ('T3 client', v_a);
  update public.artist_profiles set plan = 'free' where artist_id = v_a;

  -- --- T3a: solo and studio artists over the free cap insert fine. ---------
  update public.artist_profiles set plan = 'solo' where artist_id = v_a;
  insert into public.clients (name, artist_id) values ('T3a solo', v_a);
  update public.artist_profiles set plan = 'studio' where artist_id = v_a;
  insert into public.clients (name, artist_id) values ('T3a studio', v_a);
  update public.artist_profiles set plan = 'free' where artist_id = v_a;

  -- --- T3b (fail-closed): plan_limits row missing → free cap applies. ------
  delete from public.plan_limits where plan = 'solo';
  update public.artist_profiles set plan = 'solo' where artist_id = v_a;
  v_ok := false;
  begin
    insert into public.clients (name, artist_id) values ('T3b client', v_a);
  exception
    when check_violation then
      if sqlerrm like '%VLTED_CLIENT_CAP%' then
        v_ok := true;
      end if;
  end;
  if not v_ok then
    raise exception 'TEST FAILED: T3b: missing plan_limits row did not fall back to free cap';
  end if;
  insert into public.plan_limits (plan, client_cap) values ('solo', null)
    on conflict (plan) do nothing;
  update public.artist_profiles set plan = 'free' where artist_id = v_a;

  -- --- T3c (fail-closed): missing profile row = free. ----------------------
  -- A is at cap. Delete A's profile; insert must still be blocked (a
  -- profile-less artist must never be uncapped).
  delete from public.artist_profiles where artist_id = v_a;
  v_ok := false;
  begin
    insert into public.clients (name, artist_id) values ('T3c client', v_a);
  exception
    when check_violation then
      if sqlerrm like '%VLTED_CLIENT_CAP%' then
        v_ok := true;
      end if;
  end;
  if not v_ok then
    raise exception 'TEST FAILED: T3c: missing profile row did not fail closed';
  end if;
  -- Recreate the profile (rolled back at the end either way).
  insert into public.artist_profiles (artist_id, studio_name, full_name, plan)
    values (v_a, 'Vaulted Test A', 'Test Artist A', 'free')
    on conflict (artist_id) do nothing;

  -- --- T3d: insert with NULL artist_id fails. ------------------------------
  -- Runs as postgres: RLS would reject a NULL-owner insert before the
  -- trigger; the trigger rule itself is what's under test here.
  v_ok := false;
  begin
    insert into public.clients (name, artist_id) values ('T3d orphan', null);
  exception
    when check_violation then
      if sqlerrm like '%VLTED_CLIENT_CAP_INVALID%' then
        v_ok := true;
      end if;
  end;
  if not v_ok then
    raise exception 'TEST FAILED: T3d: NULL artist_id insert was not rejected';
  end if;

  -- --- T4: A cannot change own plan or artist_id. --------------------------
  perform set_config('request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', v_a)::text, true);
  set local role authenticated;

  v_ok := false;
  begin
    update public.artist_profiles set plan = 'studio' where artist_id = v_a;
  exception
    when insufficient_privilege then v_ok := true; -- 42501: no plan grant
    when check_violation then
      if sqlerrm like '%VLTED_PLAN_GUARD%' then v_ok := true; end if;
  end;
  if not v_ok then
    raise exception 'TEST FAILED: T4: artist changed own plan (or wrong error)';
  end if;

  v_ok := false;
  begin
    update public.artist_profiles set artist_id = v_b where artist_id = v_a;
  exception
    when insufficient_privilege then v_ok := true;
    when check_violation then
      if sqlerrm like '%VLTED_PLAN_GUARD%' then v_ok := true; end if;
  end;
  if not v_ok then
    raise exception 'TEST FAILED: T4: artist changed own artist_id (or wrong error)';
  end if;

  -- --- T5: legitimate profile edits work; Settings upsert keeps plan. ------
  update public.artist_profiles
    set full_name = 'Test Artist A2', studio_name = 'Test Studio A2',
        phone = '+1 555 0100', bio = 'test bio'
    where artist_id = v_a;

  reset role;
  update public.artist_profiles set plan = 'founding' where artist_id = v_a;
  set local role authenticated;
  -- Exact Settings.jsx payload, as a real upsert (onConflict artist_id).
  insert into public.artist_profiles (artist_id, studio_name, full_name, phone, bio)
    values (v_a, 'Test Studio A3', 'Test Artist A3', '+1 555 0100', 'test bio')
    on conflict (artist_id) do update
      set studio_name = excluded.studio_name,
          full_name = excluded.full_name,
          phone = excluded.phone,
          bio = excluded.bio;
  select plan into v_readback from public.artist_profiles where artist_id = v_a;
  if v_readback <> 'founding' then
    raise exception 'TEST FAILED: T5: Settings upsert changed plan to %', v_readback;
  end if;
  reset role;
  update public.artist_profiles set plan = 'free' where artist_id = v_a;

  -- --- T6: signup path on a profile-less artist. ---------------------------
  delete from public.artist_profiles where artist_id = v_a;
  set local role authenticated;

  v_ok := false;
  begin
    insert into public.artist_profiles (artist_id, studio_name, plan)
      values (v_a, 'Vaulted Test A', 'studio');
  exception
    when insufficient_privilege then v_ok := true; -- no INSERT grant on plan
    when check_violation then
      if sqlerrm like '%VLTED_PLAN_GUARD%' then v_ok := true; end if;
  end;
  if not v_ok then
    raise exception 'TEST FAILED: T6: artist inserted a profile with plan=studio';
  end if;

  -- Signup-style insert (studio_name included, no plan): succeeds, plan
  -- reads back 'free' (column default + INSERT guard).
  insert into public.artist_profiles (artist_id, studio_name, full_name)
    values (v_a, 'Vaulted Test A', 'Test Artist A');
  select plan into v_readback from public.artist_profiles where artist_id = v_a;
  if v_readback <> 'free' then
    raise exception 'TEST FAILED: T6: signup insert produced plan %', v_readback;
  end if;
  reset role;

  -- --- T7: anon fully blocked; plan_limits write-protected. ----------------
  set local role anon;

  v_ok := false;
  begin
    select count(*) into v_dummy from public.artist_profiles;
  exception when insufficient_privilege then v_ok := true; end;
  if not v_ok then
    raise exception 'TEST FAILED: T7: anon could read artist_profiles';
  end if;

  v_ok := false;
  begin
    insert into public.artist_profiles (artist_id, studio_name)
      values (v_a, 'anon studio');
  exception when insufficient_privilege then v_ok := true; end;
  if not v_ok then
    raise exception 'TEST FAILED: T7: anon could insert artist_profiles';
  end if;

  v_ok := false;
  begin
    update public.artist_profiles set full_name = 'anon' where artist_id = v_a;
  exception when insufficient_privilege then v_ok := true; end;
  if not v_ok then
    raise exception 'TEST FAILED: T7: anon could update artist_profiles';
  end if;

  v_ok := false;
  begin
    select count(*) into v_dummy from public.plan_limits;
  exception when insufficient_privilege then v_ok := true; end;
  if not v_ok then
    raise exception 'TEST FAILED: T7: anon could read plan_limits';
  end if;
  reset role;

  set local role authenticated;
  v_ok := false;
  begin
    insert into public.plan_limits (plan, client_cap) values ('hacker', 999999);
  exception when insufficient_privilege then v_ok := true; end;
  if not v_ok then
    raise exception 'TEST FAILED: T7: authenticated could insert plan_limits';
  end if;

  v_ok := false;
  begin
    update public.plan_limits set client_cap = 999999 where plan = 'free';
  exception when insufficient_privilege then v_ok := true; end;
  if not v_ok then
    raise exception 'TEST FAILED: T7: authenticated could update plan_limits';
  end if;
  reset role;

  -- --- T8: postgres CAN change plan (guard bypass for elevated roles). -----
  update public.artist_profiles set plan = 'founding' where artist_id = v_a;
  update public.artist_profiles set plan = 'free' where artist_id = v_a;

  -- --- T9: artist B sees nothing of A's profile. ---------------------------
  perform set_config('request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', v_b)::text, true);
  set local role authenticated;
  select count(*) into v_dummy from public.artist_profiles where artist_id = v_a;
  if v_dummy <> 0 then
    raise exception 'TEST FAILED: T9: artist B can read artist A''s profile';
  end if;
  update public.artist_profiles
    set plan = 'studio', full_name = 'hacked'
    where artist_id = v_a;
  if found then
    raise exception 'TEST FAILED: T9: artist B updated artist A''s profile';
  end if;
  reset role;

  -- --- T10: deleting a client frees a slot. --------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', v_a)::text, true);
  set local role authenticated;
  delete from public.clients where id = v_client;
  insert into public.clients (name, artist_id) values ('T10 client', v_a)
    returning id into v_client;
  reset role;

  -- --- T11: cascade unlink — forms survive, audit rows, no notifications. --
  -- 'sent' rows must satisfy consent_forms_sent_requires_blank_consent:
  -- all consent flags false, no signature_data. Explicitly set the flags
  -- (defaults are not assumed).
  insert into public.consent_forms
    (artist_id, client_id, client_name, client_email, status, sent_at,
     age_verified, design_approved, aftercare_acknowledged, photo_consent)
  values
    (v_a, v_client, 'T11 Signed', 't11s@example.com', 'sent', now(),
     false, false, false, false)
  returning id into v_form_signed;
  insert into public.consent_forms
    (artist_id, client_id, client_name, client_email, status, sent_at,
     age_verified, design_approved, aftercare_acknowledged, photo_consent)
  values
    (v_a, v_client, 'T11 Unsigned', 't11u@example.com', 'sent', now(),
     false, false, false, false)
  returning id into v_form_unsigned;

  -- Sign the first the way the real flow does (signed rows are
  -- unconstrained; flags set true + signature data). This fires
  -- notify_consent_signed, so notification and audit baselines are recorded
  -- AFTER this update.
  update public.consent_forms
    set status = 'signed',
        signed_at = now(),
        signature_data = 'data:image/png;base64,test',
        signed_ip = '127.0.0.1',
        age_verified = true,
        design_approved = true,
        aftercare_acknowledged = true,
        photo_consent = false,
        blood_thinner = false, skin_condition = false,
        allergies = false, pregnant = false,
        diabetes = false, heart_condition = false
    where id = v_form_signed;

  select count(*) into v_audit_before
    from public.consent_form_audit where form_id = v_form_signed;
  select count(*) into v_audit_after
    from public.consent_form_audit where form_id = v_form_unsigned;
  v_audit_signed_before := v_audit_before;
  v_audit_unsigned_before := v_audit_after;
  select count(*) into v_notif_before
    from public.notifications where entity_id in (v_form_signed, v_form_unsigned);

  delete from public.clients where id = v_client;

  if (select count(*) from public.consent_forms
      where id in (v_form_signed, v_form_unsigned)) <> 2 then
    raise exception 'TEST FAILED: T11: client delete destroyed consent forms';
  end if;
  if exists (select 1 from public.consent_forms
             where id in (v_form_signed, v_form_unsigned) and client_id is not null) then
    raise exception 'TEST FAILED: T11: forms not unlinked (client_id not nulled)';
  end if;

  -- Per-form audit assertion: exactly one new action='edit' row per form,
  -- with client_id as the ONLY key in changed_fields (live format:
  -- {"client_id": {"from": <uuid>, "to": null}}).
  select count(*) into v_audit_after
    from public.consent_form_audit where form_id = v_form_signed;
  if v_audit_after - v_audit_signed_before <> 1 then
    raise exception 'TEST FAILED: T11: signed form audit delta % <> 1',
      v_audit_after - v_audit_signed_before;
  end if;
  select count(*) into v_audit_after
    from public.consent_form_audit where form_id = v_form_unsigned;
  if v_audit_after - v_audit_unsigned_before <> 1 then
    raise exception 'TEST FAILED: T11: unsigned form audit delta % <> 1',
      v_audit_after - v_audit_unsigned_before;
  end if;
  select count(*) into v_dummy
    from public.consent_form_audit a
    where a.form_id in (v_form_signed, v_form_unsigned)
      and a.action = 'edit'
      and a.changed_fields ? 'client_id'
      and (a.changed_fields - 'client_id') = '{}'::jsonb;
  if v_dummy <> 2 then
    raise exception
      'TEST FAILED: T11: expected 2 audit rows with changed_fields = {client_id only}, got %',
      v_dummy;
  end if;

  select count(*) into v_notif_after
    from public.notifications where entity_id in (v_form_signed, v_form_unsigned);
  if v_notif_after <> v_notif_before then
    raise exception 'TEST FAILED: T11: unlink changed notification count';
  end if;

  -- --- T12: direct client_id writes still guarded; edits still allowed. ----
  -- Freshly linked signed + unsigned forms on a live client.
  insert into public.clients (name, artist_id) values ('T12 client', v_a)
    returning id into v_client2;
  insert into public.consent_forms
    (artist_id, client_id, client_name, client_email, status, sent_at,
     age_verified, design_approved, aftercare_acknowledged, photo_consent)
  values
    (v_a, v_client2, 'T12 Signed', 't12s@example.com', 'sent', now(),
     false, false, false, false)
  returning id into v_form_signed2;
  insert into public.consent_forms
    (artist_id, client_id, client_name, client_email, status, sent_at,
     age_verified, design_approved, aftercare_acknowledged, photo_consent)
  values
    (v_a, v_client2, 'T12 Unsigned', 't12u@example.com', 'sent', now(),
     false, false, false, false)
  returning id into v_form_unsigned2;
  update public.consent_forms
    set status = 'signed', signed_at = now(),
        signature_data = 'data:image/png;base64,test', signed_ip = '127.0.0.1',
        age_verified = true, design_approved = true, aftercare_acknowledged = true,
        photo_consent = false,
        blood_thinner = false, skin_condition = false, allergies = false,
        pregnant = false, diabetes = false, heart_condition = false
    where id = v_form_signed2;

  set local role authenticated;

  -- Signed form: direct nulling must fail with 'immutable'. Flag-and-raise:
  -- the handler only sets a flag; TEST FAILED is raised after the block.
  v_ok := false;
  begin
    update public.consent_forms set client_id = null where id = v_form_signed2;
  exception when others then
    if sqlerrm like '%immutable%' then v_ok := true; end if;
  end;
  if not v_ok then
    raise exception 'TEST FAILED: T12: direct unlink of signed form not blocked with immutable error';
  end if;

  -- Unsigned form: direct nulling must fail with 're-targeted'.
  v_ok := false;
  begin
    update public.consent_forms set client_id = null where id = v_form_unsigned2;
  exception when others then
    if sqlerrm like '%re-targeted%' then v_ok := true; end if;
  end;
  if not v_ok then
    raise exception 'TEST FAILED: T12: direct unlink of unsigned form not blocked with re-targeted error';
  end if;

  -- Legitimate edit of an unsigned form still works.
  update public.consent_forms set allergies_detail = 'penicillin'
    where id = v_form_unsigned2;
  if not found then
    raise exception 'TEST FAILED: T12: legitimate unsigned-form edit failed';
  end if;
  reset role;

  -- --- Done. This raise IS the success path: everything rolls back. --------
  raise exception 'SELF-TESTS PASSED - rolled back on purpose, nothing saved';
end;
$$;

-- ============================================================================
-- ROLLBACK (run only if unwinding the feature; destructive to the column).
-- The guard restore below is live SQL wrapped in a DO block so it can be
-- run by uncommenting just this section.
-- ============================================================================
-- drop trigger if exists enforce_client_cap on public.clients;
-- drop function if exists public.enforce_client_cap();
-- drop trigger if exists artist_profiles_guard_write on public.artist_profiles;
-- drop function if exists public.artist_profiles_guard_write();
-- -- Restores the ORIGINAL Mission 9 guard function verbatim:
-- create or replace function public.guard_consent_form_update()
-- returns trigger language plpgsql
-- as $function$
-- begin
--   if old.status = 'sent' and new.status = 'signed' then
--     return new;
--   end if;
--   if old.status = 'signed' then
--     raise exception 'Signed consent forms are immutable';
--   end if;
--   if new.client_id is distinct from old.client_id then
--     raise exception 'A consent form cannot be re-targeted to a different client';
--   end if;
--   if new.artist_id is distinct from old.artist_id
--      or new.sign_token is distinct from old.sign_token
--      or new.signature_data is distinct from old.signature_data
--      or new.signed_at is distinct from old.signed_at
--      or new.status is distinct from old.status then
--     raise exception 'Ownership, signing token, signature and status cannot be modified';
--   end if;
--   return new;
-- end $function$;
-- -- consent_forms_guard_update trigger is NOT touched by this migration.
-- alter table public.artist_profiles drop column if exists plan;
-- drop table if exists public.plan_limits;
