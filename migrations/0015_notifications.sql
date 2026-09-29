-- Mission 14, Phase 2: artist notifications (in-app bell).
--
-- Run this yourself in the Supabase SQL editor. Safe to re-run: every
-- statement is idempotent (CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE /
-- DROP ... IF EXISTS), so a partial first run can just be applied again.
--
-- Rows are created ONLY by (a) the consent-signed trigger below and
-- (b) the service-role cron function (which bypasses RLS). There is no
-- INSERT policy for normal users on purpose — clients/anonymous visitors
-- can never fabricate notifications.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('consent_signed', 'booking_upcoming', 'reminder_failed')),
  title text not null,
  body text not null default '',
  -- What the notification links to in the app. Free-form type ('booking' |
  -- 'consent_form' | 'reminder') + the row's id; null for rows with no
  -- single target.
  entity_type text,
  entity_id uuid,
  -- null = unread. Only this column is writable by the artist (see grants).
  read_at timestamptz,
  created_at timestamptz not null default now(),
  -- Idempotency guard for cron-generated rows: one booking_upcoming per
  -- booking, one reminder_failed per reminders row (so the 3-day and 1-day
  -- failures for the same booking each get their own notification).
  -- consent_signed rows are naturally one-per-form (trigger fires on the
  -- one-time sent->signed flip) and use the form id the same way.
  constraint notifications_unique_event unique (artist_id, type, entity_id)
);

create index if not exists notifications_artist_created_idx
  on public.notifications (artist_id, created_at desc);
-- Backs the unique (artist_id, type, entity_id) constraint's lookup shape
-- and the unread count query.
create index if not exists notifications_artist_unread_idx
  on public.notifications (artist_id)
  where read_at is null;

alter table public.notifications enable row level security;

-- Read: only your own notifications.
drop policy if exists "Artists can view their own notifications" on public.notifications;
create policy "Artists can view their own notifications"
  on public.notifications for select
  to authenticated
  using (artist_id = auth.uid());

-- Update: only your own rows. The WITH CHECK plus the guard trigger below
-- (notifications_no_field_edits) limits the artist to touching read_at —
-- belt and braces on top of the column-level grants.
drop policy if exists "Artists can update their own notifications" on public.notifications;
create policy "Artists can update their own notifications"
  on public.notifications for update
  to authenticated
  using (artist_id = auth.uid())
  with check (artist_id = auth.uid());

-- Deliberately NO insert or delete policies. Inserts come from the trigger
-- and the service-role cron only. Deletion/retention is a future concern.

-- ============================================================================
-- read_at enforcement (Ben asked which mechanism: column-level privileges,
-- with a guard trigger as backstop).
--
-- Column-level GRANTs: the app's roles get SELECT on all columns but UPDATE
-- only on read_at. Any update statement that sets other columns is rejected
-- at the privilege level before RLS even runs. This is the primary
-- enforcement. The blanket REVOKE first strips Supabase's default grants
-- (which include table-wide UPDATE on the target table for authenticated),
-- so the column grant below really is the only write path.
-- ============================================================================
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Backstop trigger: even a role that somehow holds broader column grants
-- cannot change anything except read_at. Read-only check (raises, no write)
-- so it can never modify data itself. NOT SECURITY DEFINER — it runs with
-- the updating user's identity and needs no elevated access.
create or replace function public.notifications_guard_update()
returns trigger
language plpgsql
as $$
begin
  if new.artist_id is distinct from old.artist_id
     or new.type is distinct from old.type
     or new.title is distinct from old.title
     or new.body is distinct from old.body
     or new.entity_type is distinct from old.entity_type
     or new.entity_id is distinct from old.entity_id
     or new.created_at is distinct from old.created_at then
    raise exception 'notifications: only read_at may be modified'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_guard_update on public.notifications;
create trigger notifications_guard_update
  before update on public.notifications
  for each row execute function public.notifications_guard_update();

-- ============================================================================
-- consent_signed trigger.
--
-- SECURITY DEFINER with a fixed search_path (Ben's requirement): the signing
-- path is an anonymous RPC, so the firing role is `anon` — which by design
-- has no INSERT on notifications. DEFINER lets the notification insert run
-- with the owner's rights; the fixed search_path stops a hostile search_path
-- from re-resolving the functions called here.
--
-- Exception-safety (Ben's requirement): a failed notification insert must
-- never block or roll back the signature. The write to consent_forms is the
-- client's actual action; the notification is a nice-to-have. So the insert
-- runs inside a nested block with its own exception handler that swallows
-- everything — the signature commits even if the notification insert fails
-- for any reason (constraint, permissions, future schema drift). Failures
-- are logged to the Postgres log for diagnosis.
-- ============================================================================
create or replace function public.notify_consent_signed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only the one-time sent -> signed flip, not any other update.
  if old.status = 'sent' and new.status = 'signed' then
    begin
      insert into public.notifications (artist_id, type, title, body, entity_type, entity_id)
      values (
        new.artist_id,
        'consent_signed',
        'Consent form signed',
        coalesce(new.client_name, 'A client') || ' signed the consent form' ||
          case when new.date is not null then ' for ' || new.date else '' end || '.',
        'consent_form',
        new.id
      );
    exception when others then
      -- Never block or roll back the client's signature.
      raise warning 'notify_consent_signed failed for form %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_consent_signed on public.consent_forms;
create trigger notify_consent_signed
  after update of status on public.consent_forms
  for each row
  when (old.status = 'sent' and new.status = 'signed')
  execute function public.notify_consent_signed();

-- ============================================================================
-- Test: sign a form as an anonymous user.
--
-- Run the whole block; it cleans up after itself and raises a clear error
-- on any failed expectation. No values need replacing.
--
-- Column note: every column in the INSERT below (artist_id, client_name,
-- client_email, date, status, sent_at) is written by the app's own inserts
-- (ConsentForms.jsx handleSendForSignature), so all exist on consent_forms.
-- ============================================================================
do $$
declare
  v_artist uuid;
  v_form uuid;
  v_token text;
  v_notif_count int;
begin
  -- 1. Pick an artist to test with (or hardcode: v_artist := '<uuid>';).
  select id into v_artist from auth.users limit 1;

  -- 2. Create a fresh 'sent' form directly (service context via SQL editor).
  insert into public.consent_forms (artist_id, client_name, client_email, date, status, sent_at)
  values (v_artist, 'Notif Test Client', 'notif-test@example.com', current_date, 'sent', now())
  returning id into v_form;

  select sign_token into v_token from public.consent_forms where id = v_form;

  -- 3. Clear any stale state, then sign it EXACTLY as the client would:
  --    switch to the anon role and call the real signing RPC with the same
  --    name and arguments the /sign/:token page uses (SignConsentForm.jsx:153).
  delete from public.notifications
  where artist_id = v_artist and entity_id = v_form;
  set local role anon;
  perform public.sign_consent_form(
    p_token => v_token,
    p_blood_thinner => false,
    p_skin_condition => false,
    p_allergies => false,
    p_allergies_detail => '',
    p_pregnant => false,
    p_diabetes => false,
    p_heart_condition => false,
    p_age_verified => true,
    p_design_approved => true,
    p_aftercare_acknowledged => true,
    p_photo_consent => false,
    p_signature_data => 'data:image/png;base64,test'
  );
  reset role;

  -- 4. Assert the form flipped...
  if (select status from public.consent_forms where id = v_form) <> 'signed' then
    raise exception 'TEST FAILED: signing RPC did not set status=signed';
  end if;

  -- 5. ...and exactly one notification exists for the artist + form.
  select count(*) into v_notif_count
  from public.notifications
  where artist_id = v_artist and entity_id = v_form and type = 'consent_signed';
  if v_notif_count <> 1 then
    raise exception 'TEST FAILED: expected 1 consent_signed notification, got %', v_notif_count;
  end if;

  -- (No re-update step: the Mission 9 guard rejects any edit to a signed
  -- form, so a second sent->signed flip can't occur and no duplicate is
  -- possible.)

  -- 6. Cleanup: remove the test form and its notification.
  delete from public.notifications where entity_id = v_form;
  delete from public.consent_forms where id = v_form;

  raise notice 'TEST PASSED: anonymous sign produced exactly one notification';
end;
$$;
