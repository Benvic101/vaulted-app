-- Mission 13, Phase 1: reminders table for client email reminders.
-- Run manually in the Supabase SQL editor — do not auto-apply.
--
-- One row per (booking, reminder_type) send attempt. The unique constraint
-- is the hard duplicate guard: if the cron ever runs twice in a day (or two
-- instances race), the second insert fails instead of sending a second email.
-- A 'failed' row is retried on a later run; the row is upserted to 'sent'
-- only after Resend accepts the email.

create table reminders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  artist_id uuid not null,
  reminder_type text not null check (reminder_type in ('3_day', '1_day')),
  status text not null default 'pending' check (status in ('sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique (booking_id, reminder_type)
);

alter table reminders enable row level security;

-- Artists can see the reminder log for their own bookings (read-only).
-- No insert/update/delete policies: only the service-role cron writes here.
create policy "artists view own reminder logs"
  on reminders for select
  using (artist_id = auth.uid());

create index reminders_artist_idx on reminders (artist_id);
