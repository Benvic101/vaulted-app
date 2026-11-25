-- Mission 16: creator referral links.
--
-- Run CHUNK 1 once, as a whole script, in the Supabase SQL editor.
-- Then run CHUNK 2 (self-test) SEPARATELY, pasted on its own. It rolls
-- everything back on purpose, so nothing it does is saved.
--
-- What this does:
--   * creators table (private: RLS on, no policies, no grants to anon or
--     authenticated). You manage it from the SQL editor.
--   * artist_profiles.referred_by_code / referred_at (set once, never
--     writable by the artist).
--   * apply_referral(): SECURITY DEFINER RPC. Reads the code from the
--     signup metadata (user_metadata.referral_code, which travels with the
--     account, so it survives confirming email in a different browser),
--     and, for a NEW account only, tags it to the creator and sets
--     plan = 'founding'.
--   * creator_referral_counts view (SQL editor only).
--   * Drops the OLD overlapping trigger pair from the first version of
--     Mission 15 (guard_artist_plan, enforce_client_limit). The old plan
--     guard reads auth.role(), which is still 'authenticated' inside a
--     SECURITY DEFINER RPC, so it silently reverts plan changes. The newer
--     pair from migrations/0016_free_tier.sql (artist_profiles_guard_write,
--     enforce_client_cap) does the same job and stays.
--
-- Rules the RPC enforces (all fail closed, none raise):
--   * needs a session;
--   * no code in metadata               -> 'no_code'
--   * account older than 7 days         -> 'not_eligible' (existing users
--     cannot claim founding by editing their own metadata later);
--   * already tagged                    -> 'already_applied';
--   * plan is not 'free'                -> 'not_eligible';
--   * unknown or inactive code          -> 'invalid' (reveals nothing);
--   * creator's max_uses reached        -> 'creator_full';
--   * otherwise                         -> 'applied'.

-- ============================================================================
-- CHUNK 1 — the migration
-- ============================================================================
begin;

-- 0. Safety: refuse to drop the old guards unless the NEW plan guard is live.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'artist_profiles_guard_write'
      and tgrelid = 'public.artist_profiles'::regclass
      and not tgisinternal
  ) then
    raise exception
      'Mission 16 aborted: artist_profiles_guard_write is missing. Run migrations/0016_free_tier.sql first.';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgname = 'enforce_client_cap'
      and tgrelid = 'public.clients'::regclass
      and not tgisinternal
  ) then
    raise exception
      'Mission 16 aborted: enforce_client_cap is missing. Run migrations/0016_free_tier.sql first.';
  end if;
end;
$$;

-- 1. Drop the OLD overlapping triggers (functions are left in place).
drop trigger if exists guard_artist_plan on public.artist_profiles;
drop trigger if exists enforce_client_limit on public.clients;

-- 2. creators ----------------------------------------------------------------
create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    check (code ~ '^[A-Z0-9_-]{3,32}$'),
  name text not null,
  handle text,
  platform text check (platform in ('instagram', 'youtube', 'other')),
  active boolean not null default true,
  -- null = unlimited signups for this creator
  max_uses int check (max_uses is null or max_uses > 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.creators enable row level security;
revoke all on public.creators from anon, authenticated;
-- Deliberately NO policies: only the SQL editor / service role / SECURITY
-- DEFINER functions can touch this table.

-- 3. Attribution columns on artist_profiles -----------------------------------
alter table public.artist_profiles
  add column if not exists referred_by_code text
    references public.creators (code) on delete restrict;
alter table public.artist_profiles
  add column if not exists referred_at timestamptz;

create index if not exists artist_profiles_referred_by_code_idx
  on public.artist_profiles (referred_by_code);

-- The 0016 column grants already exclude these columns from authenticated
-- INSERT/UPDATE (they only list artist_id, studio_name, full_name, phone,
-- bio). This backstop makes the trigger refuse them as well.
-- Body is the 0016 function verbatim plus the two referral checks.
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
    if new.referred_by_code is not null or new.referred_at is not null then
      raise exception 'VLTED_PLAN_GUARD: referral fields are set by the system'
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
  if new.referred_by_code is distinct from old.referred_by_code
     or new.referred_at is distinct from old.referred_at then
    raise exception 'VLTED_PLAN_GUARD: referral fields cannot be changed by the artist'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- 4. apply_referral() ----------------------------------------------------------
create or replace function public.apply_referral()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_created   timestamptz;
  v_meta      jsonb;
  v_code      text;
  v_creator   public.creators%rowtype;
  v_profile   public.artist_profiles%rowtype;
  v_used      int;
begin
  if v_uid is null then
    return 'no_session';
  end if;

  select u.created_at, coalesce(u.raw_user_meta_data, '{}'::jsonb)
    into v_created, v_meta
  from auth.users u
  where u.id = v_uid;

  if not found then
    return 'no_session';
  end if;

  v_code := upper(btrim(coalesce(v_meta ->> 'referral_code', '')));
  if v_code = '' then
    return 'no_code';
  end if;

  -- New accounts only. Stops an existing free user from claiming founding
  -- by editing their own user_metadata later.
  if v_created < now() - interval '7 days' then
    return 'not_eligible';
  end if;

  -- Serialise per user and per creator (double-tap, two tabs, max_uses race).
  perform pg_advisory_xact_lock(hashtext('referral-user:' || v_uid::text));

  select * into v_profile
  from public.artist_profiles
  where artist_id = v_uid;

  if found then
    if v_profile.referred_by_code is not null then
      return 'already_applied';
    end if;
    if v_profile.plan <> 'free' then
      return 'not_eligible';
    end if;
  end if;

  select * into v_creator
  from public.creators
  where code = v_code and active;

  if not found then
    return 'invalid';
  end if;

  perform pg_advisory_xact_lock(hashtext('referral-creator:' || v_creator.id::text));

  if v_creator.max_uses is not null then
    select count(*) into v_used
    from public.artist_profiles
    where referred_by_code = v_creator.code;
    if v_used >= v_creator.max_uses then
      return 'creator_full';
    end if;
  end if;

  -- The profile row may not exist yet (it is created lazily on first
  -- Settings save). studio_name is NOT NULL, so start it as ''.
  insert into public.artist_profiles
    (artist_id, studio_name, full_name, plan, referred_by_code, referred_at)
  values
    (v_uid, '', nullif(btrim(coalesce(v_meta ->> 'full_name', '')), ''),
     'founding', v_creator.code, now())
  on conflict (artist_id) do update
    set plan = 'founding',
        referred_by_code = excluded.referred_by_code,
        referred_at = excluded.referred_at,
        full_name = coalesce(nullif(public.artist_profiles.full_name, ''), excluded.full_name);

  return 'applied';
end;
$$;

revoke all on function public.apply_referral() from public, anon;
grant execute on function public.apply_referral() to authenticated;

-- 5. Counts for you (SQL editor only) -----------------------------------------
create or replace view public.creator_referral_counts
with (security_invoker = true) as
select
  c.code,
  c.name,
  c.handle,
  c.platform,
  c.active,
  c.max_uses,
  count(p.artist_id) as signups,
  count(p.artist_id) filter (
    where exists (select 1 from public.clients cl where cl.artist_id = p.artist_id)
  ) as activated_with_clients
from public.creators c
left join public.artist_profiles p on p.referred_by_code = c.code
group by c.id;

revoke all on public.creator_referral_counts from anon, authenticated;

commit;

-- ----------------------------------------------------------------------------
-- ADD A CREATOR (SQL editor). Code: 3-32 chars, A-Z 0-9 _ - only, UPPERCASE.
--   insert into public.creators (code, name, handle, platform, max_uses)
--   values ('INKBYMARCO', 'Marco', '@inkbymarco', 'instagram', 50);
-- Their link:  https://vaulted-app-six.vercel.app/?ref=INKBYMARCO
--
-- SEE COUNTS:   select * from public.creator_referral_counts order by signups desc;
-- PAUSE A LINK: update public.creators set active = false where code = 'INKBYMARCO';
-- GIVE A CREATOR THEIR FREE STUDIO PLAN (after they sign up):
--   update public.artist_profiles set plan = 'studio'
--   where artist_id = (select id from auth.users where email = 'creator@example.com');
-- ----------------------------------------------------------------------------


-- ============================================================================
-- CHUNK 2 — SELF-TEST. Paste and run SEPARATELY from chunk 1.
--
-- Reuses two existing users purely as identities; everything happens in one
-- transaction and ends with an intentional exception, so nothing is saved.
-- Expected final output: SELF-TESTS PASSED - rolled back on purpose.
-- Any failure raises 'TEST FAILED: <id>'.
-- ============================================================================
do $$
declare
  v_a uuid;
  v_b uuid;
  v_res text;
  v_ok boolean;
  v_plan text;
  v_code text;
  v_n int;
begin
  select id into v_a from auth.users order by created_at limit 1;
  select id into v_b from auth.users where id <> v_a order by created_at limit 1;
  if v_a is null or v_b is null then
    raise exception 'TEST FAILED: SETUP: need two existing users';
  end if;

  insert into public.creators (code, name, handle, platform, max_uses)
    values ('TESTCODE', 'Test Creator', '@test', 'instagram', null),
           ('PAUSEDCODE', 'Paused', '@paused', 'instagram', null),
           ('FULLCODE', 'Full', '@full', 'instagram', 1);
  update public.creators set active = false where code = 'PAUSEDCODE';

  -- A: fresh account, no profile row, valid code in metadata.
  delete from public.artist_profiles where artist_id = v_a;
  update auth.users
    set created_at = now(),
        raw_user_meta_data = jsonb_build_object('referral_code', 'testcode', 'full_name', 'Test A')
    where id = v_a;

  perform set_config('request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', v_a)::text, true);
  set local role authenticated;

  -- T1: applies, case-insensitively, creating the missing profile row.
  v_res := public.apply_referral();
  if v_res <> 'applied' then
    raise exception 'TEST FAILED: T1: expected applied, got %', v_res;
  end if;
  select plan, referred_by_code into v_plan, v_code
    from public.artist_profiles where artist_id = v_a;
  if v_plan <> 'founding' or v_code <> 'TESTCODE' then
    raise exception 'TEST FAILED: T1: profile is %, %', v_plan, v_code;
  end if;

  -- T2: second call changes nothing.
  v_res := public.apply_referral();
  if v_res <> 'already_applied' then
    raise exception 'TEST FAILED: T2: expected already_applied, got %', v_res;
  end if;

  -- T3: the artist cannot edit plan or referral fields directly.
  v_ok := false;
  begin
    update public.artist_profiles set plan = 'studio' where artist_id = v_a;
  exception
    when insufficient_privilege then v_ok := true;
    when check_violation then v_ok := true;
  end;
  if not v_ok then raise exception 'TEST FAILED: T3a: plan editable'; end if;

  v_ok := false;
  begin
    update public.artist_profiles set referred_by_code = null where artist_id = v_a;
  exception
    when insufficient_privilege then v_ok := true;
    when check_violation then v_ok := true;
  end;
  if not v_ok then raise exception 'TEST FAILED: T3b: referred_by_code editable'; end if;

  -- T4: authenticated and anon cannot read creators or the counts view.
  v_ok := false;
  begin
    select count(*) into v_n from public.creators;
  exception when insufficient_privilege then v_ok := true; end;
  if not v_ok then raise exception 'TEST FAILED: T4a: authenticated read creators'; end if;

  v_ok := false;
  begin
    select count(*) into v_n from public.creator_referral_counts;
  exception when insufficient_privilege then v_ok := true; end;
  if not v_ok then raise exception 'TEST FAILED: T4b: authenticated read counts view'; end if;
  reset role;

  set local role anon;
  v_ok := false;
  begin
    select count(*) into v_n from public.creators;
  exception when insufficient_privilege then v_ok := true; end;
  if not v_ok then raise exception 'TEST FAILED: T4c: anon read creators'; end if;

  v_ok := false;
  begin
    perform public.apply_referral();
  exception when insufficient_privilege then v_ok := true; end;
  if not v_ok then raise exception 'TEST FAILED: T4d: anon executed apply_referral'; end if;
  reset role;

  -- B cases. Reset B to a fresh free account each time.
  update auth.users set created_at = now() where id = v_b;
  delete from public.artist_profiles where artist_id = v_b;
  perform set_config('request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', v_b)::text, true);

  -- T5: no code in metadata.
  update auth.users set raw_user_meta_data = '{}'::jsonb where id = v_b;
  set local role authenticated;
  v_res := public.apply_referral();
  reset role;
  if v_res <> 'no_code' then
    raise exception 'TEST FAILED: T5: expected no_code, got %', v_res;
  end if;

  -- T6: unknown code.
  update auth.users set raw_user_meta_data = '{"referral_code":"NOPE123"}'::jsonb where id = v_b;
  set local role authenticated;
  v_res := public.apply_referral();
  reset role;
  if v_res <> 'invalid' then
    raise exception 'TEST FAILED: T6: expected invalid, got %', v_res;
  end if;

  -- T7: paused code.
  update auth.users set raw_user_meta_data = '{"referral_code":"PAUSEDCODE"}'::jsonb where id = v_b;
  set local role authenticated;
  v_res := public.apply_referral();
  reset role;
  if v_res <> 'invalid' then
    raise exception 'TEST FAILED: T7: expected invalid for paused code, got %', v_res;
  end if;

  -- T8: old account cannot claim.
  update auth.users
    set created_at = now() - interval '30 days',
        raw_user_meta_data = '{"referral_code":"TESTCODE"}'::jsonb
    where id = v_b;
  set local role authenticated;
  v_res := public.apply_referral();
  reset role;
  if v_res <> 'not_eligible' then
    raise exception 'TEST FAILED: T8: expected not_eligible, got %', v_res;
  end if;

  -- T9: creator at max_uses. FULLCODE allows 1; use it for A's slot first.
  update public.artist_profiles
    set referred_by_code = 'FULLCODE' where artist_id = v_a; -- postgres may
  update auth.users
    set created_at = now(),
        raw_user_meta_data = '{"referral_code":"FULLCODE"}'::jsonb
    where id = v_b;
  set local role authenticated;
  v_res := public.apply_referral();
  reset role;
  if v_res <> 'creator_full' then
    raise exception 'TEST FAILED: T9: expected creator_full, got %', v_res;
  end if;
  if exists (select 1 from public.artist_profiles
             where artist_id = v_b and referred_by_code is not null) then
    raise exception 'TEST FAILED: T9: B was tagged despite creator_full';
  end if;

  -- T10: existing paid plan is not overwritten.
  insert into public.artist_profiles (artist_id, studio_name, plan)
    values (v_b, 'B studio', 'solo')
    on conflict (artist_id) do update set plan = 'solo';
  update auth.users
    set raw_user_meta_data = '{"referral_code":"TESTCODE"}'::jsonb where id = v_b;
  set local role authenticated;
  v_res := public.apply_referral();
  reset role;
  if v_res <> 'not_eligible' then
    raise exception 'TEST FAILED: T10: expected not_eligible for solo plan, got %', v_res;
  end if;

  -- T11: counts view works (postgres).
  select signups into v_n from public.creator_referral_counts where code = 'FULLCODE';
  if v_n <> 1 then
    raise exception 'TEST FAILED: T11: FULLCODE signups = %', v_n;
  end if;

  raise exception 'SELF-TESTS PASSED - rolled back on purpose, nothing saved';
end;
$$;

-- ============================================================================
-- ROLLBACK (only if unwinding the feature)
-- ============================================================================
-- drop view if exists public.creator_referral_counts;
-- drop function if exists public.apply_referral();
-- alter table public.artist_profiles drop column if exists referred_at;
-- alter table public.artist_profiles drop column if exists referred_by_code;
-- drop table if exists public.creators;
-- -- Then re-run CHUNK 4 of migrations/0016_free_tier.sql to restore the
-- -- previous artist_profiles_guard_write body.
