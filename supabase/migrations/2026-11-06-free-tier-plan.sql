-- Mission 15: permanent free tier (15-client cap), enforced in the database.
-- Run ONCE in the Supabase SQL editor, as a whole script. Safe to deploy the
-- frontend before this runs: the UI hides plan info if get_my_plan() is missing.
--
-- Plans: 'free' (15 clients), 'solo', 'studio', 'founding' (all uncapped).
-- Every account that exists when this runs becomes 'founding' (uncapped).
-- Nothing is deleted. Artists already over 15 keep all clients; they just
-- cannot add more until upgraded.

begin;

-- 1. plan column -------------------------------------------------------------
alter table public.artist_profiles
  add column if not exists plan text not null default 'free'
  check (plan in ('free', 'solo', 'studio', 'founding'));

-- 2. Grandfather every existing profile row as founding ---------------------
update public.artist_profiles set plan = 'founding';

-- 3. Single source of truth for plan lookup ---------------------------------
-- Accounts created before this migration that have NO profile row yet are also
-- founding (profile rows are created lazily). Newer accounts default to free.
create or replace function public.default_plan_for(p_artist uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when (select created_at from auth.users where id = p_artist)
         < timestamptz '2026-11-06 00:00:00+00'
    then 'founding'
    else 'free'
  end
$$;

create or replace function public.plan_for(p_artist uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select plan from public.artist_profiles where artist_id = p_artist),
    public.default_plan_for(p_artist)
  )
$$;

revoke all on function public.default_plan_for(uuid) from public, anon, authenticated;
revoke all on function public.plan_for(uuid) from public, anon, authenticated;

-- 4. Stop users from changing their own plan --------------------------------
-- Client-side writes (role authenticated/anon) can never set plan. The SQL
-- editor and the service role (role null/postgres/service_role) can.
create or replace function public.guard_artist_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.plan := public.default_plan_for(new.artist_id);
    else
      new.plan := old.plan;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_artist_plan on public.artist_profiles;
create trigger guard_artist_plan
  before insert or update on public.artist_profiles
  for each row execute function public.guard_artist_plan();

-- 5. The client cap ----------------------------------------------------------
create or replace function public.enforce_client_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan  text;
  v_limit constant int := 15;
  v_count int;
begin
  v_plan := public.plan_for(new.artist_id);
  if v_plan <> 'free' then
    return new;
  end if;

  -- Serialize concurrent inserts for the same artist so two quick requests
  -- cannot both slip past the limit.
  perform pg_advisory_xact_lock(hashtext(new.artist_id::text));

  select count(*) into v_count from public.clients where artist_id = new.artist_id;
  if v_count >= v_limit then
    raise exception 'FREE_PLAN_CLIENT_LIMIT: the free plan allows % clients', v_limit
      using errcode = 'P0001',
            hint = 'Upgrade to add more clients.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_client_limit on public.clients;
create trigger enforce_client_limit
  before insert on public.clients
  for each row execute function public.enforce_client_limit();

-- 6. Plan info for the UI ----------------------------------------------------
create or replace function public.get_my_plan()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'plan', public.plan_for(auth.uid()),
    'client_limit', case when public.plan_for(auth.uid()) = 'free' then 15 else null end,
    'client_count', (select count(*) from public.clients where artist_id = auth.uid())
  )
$$;

revoke all on function public.get_my_plan() from public, anon;
grant execute on function public.get_my_plan() to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- VERIFY (run separately after the script above):
--   select plan, count(*) from public.artist_profiles group by plan;
--     -> every existing row should be 'founding'
--   select tgname from pg_trigger
--    where tgname in ('enforce_client_limit','guard_artist_plan');
--     -> both listed
--
-- To put an artist on the free plan for testing (then add 16 clients):
--   update public.artist_profiles set plan = 'free' where artist_id = '<uuid>';
-- To upgrade someone after they pay:
--   update public.artist_profiles set plan = 'solo' where artist_id = '<uuid>';
