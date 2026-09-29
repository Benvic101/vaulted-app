// Mission 13, Phase 1: daily cron that sends client email reminders for
// bookings 3 days and 1 day out. Runs on Vercel Cron; the only server-side
// code in the repo. Uses the service role key (server-only env var) to read
// all artists' bookings — RLS does not apply to it.
//
// Required env vars (set in Vercel):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, CRON_SECRET
//   Optional: RESEND_FROM (defaults to the Resend test sender)
//
// Duplicate-send safety is the reminders unique(booking_id, reminder_type)
// constraint: a row is only committed as 'sent' after Resend accepts the
// email, so a failed send is retried on the next run and a successful send
// can never be sent twice.
//
// Mission 14, Phase 2: this run also writes artist notifications —
// booking_upcoming for bookings 1 day out (independent of client_email — the
// artist wants to know the session is tomorrow even if the client never gave
// an address) and reminder_failed when a reminder email fails. Both are
// idempotent via the notifications unique(artist_id, type, entity_id)
// constraint, using onConflict do-nothing so a re-run can never duplicate.

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const REMINDER_OFFSETS = [
  { type: '3_day', days: 3 },
  { type: '1_day', days: 1 },
]

// Best-effort notification insert. Notifications must never break reminder
// delivery, so any failure is logged and swallowed. onConflict do-nothing
// against the unique (artist_id, type, entity_id) constraint makes repeat
// runs no-ops.
async function insertNotification(supabase, { artistId, type, title, body, entityType, entityId }) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      artist_id: artistId,
      type,
      title,
      body,
      entity_type: entityType,
      entity_id: entityId,
    })
    .ignoreDuplicates()
  if (error) {
    console.error(`Cron: notification insert failed (${type}, entity ${entityId}):`, error)
  }
}

export default async function handler(req, res) {
  // Vercel Cron sends this header automatically when CRON_SECRET is set.
  const auth = req.headers.authorization
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
  const resend = new Resend(process.env.RESEND_API_KEY)
  const sender = process.env.RESEND_FROM || 'Vaulted <onboarding@resend.dev>'

  const today = new Date().toISOString().slice(0, 10)
  const targetDates = REMINDER_OFFSETS.map((o) => {
    const d = new Date(`${today}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + o.days)
    return { ...o, date: d.toISOString().slice(0, 10) }
  })

  // All upcoming bookings on any target date (3 or 1 day out).
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, artist_id, client_name, client_email, session_type, date, time, status')
    .in('date', targetDates.map((t) => t.date))
    .eq('status', 'upcoming')
  if (error) {
    console.error('Cron: bookings query failed:', error)
    return res.status(500).json({ error: 'Bookings query failed' })
  }

  // Artist names live in artist_profiles, not on the booking row.
  const artistIds = [...new Set(bookings.map((b) => b.artist_id))]
  const artistNames = new Map()
  if (artistIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('artist_profiles')
      .select('artist_id, full_name, studio_name')
      .in('artist_id', artistIds)
    if (profilesError) {
      console.error('Cron: artist_profiles query failed:', profilesError)
      return res.status(500).json({ error: 'Artist profiles query failed' })
    }
    for (const p of profiles) artistNames.set(p.artist_id, p)
  }

  const results = []
  for (const booking of bookings) {
    const offset = targetDates.find((t) => t.date === booking.date)
    if (!offset || !booking.client_email) continue
    const profile = artistNames.get(booking.artist_id) || {}
    const context = {
      ...booking,
      artist_name: profile.full_name || 'your artist',
      studio_name: profile.studio_name || '',
    }

    // Skip anything already logged as sent. A 'failed' row means the email
    // didn't go out — retry it this run.
    const { data: existing } = await supabase
      .from('reminders')
      .select('id, status')
      .eq('booking_id', booking.id)
      .eq('reminder_type', offset.type)
      .maybeSingle()
    if (existing && existing.status === 'sent') continue

    // Artist notification for sessions happening tomorrow. Not gated on
    // client_email — the artist wants the heads-up regardless of whether the
    // reminder email can even be addressed. 1-day offset only.
    if (offset.type === '1_day') {
      await insertNotification(supabase, {
        artistId: booking.artist_id,
        type: 'booking_upcoming',
        title: 'Session tomorrow',
        body: `${booking.client_name || 'A client'} — ${formatDateTime(booking.date, booking.time)}.`,
        entityType: 'booking',
        entityId: booking.id,
      })
    }

    try {
      await resend.emails.send({
        from: sender,
        to: context.client_email,
        subject: buildSubject(context, offset),
        html: buildHtmlEmail(context, offset),
        text: buildTextEmail(context, offset),
      })
      const { error: logError } = await supabase
        .from('reminders')
        .upsert({
          booking_id: booking.id,
          artist_id: booking.artist_id,
          reminder_type: offset.type,
          status: 'sent',
          sent_at: new Date().toISOString(),
          error_message: null,
        }, { onConflict: 'booking_id,reminder_type' })
      if (logError) {
        // Email went out but logging failed — log loudly so it can be
        // reconciled manually rather than re-sent on the next run.
        console.error(`Cron: email sent but log failed for booking ${booking.id} (${offset.type}):`, logError)
      }
      results.push({ booking: booking.id, type: offset.type, status: 'sent' })
    } catch (err) {
      console.error(`Cron: Resend send failed for booking ${booking.id} (${offset.type}):`, err)
      const { error: logError } = await supabase
        .from('reminders')
        .upsert({
          booking_id: booking.id,
          artist_id: booking.artist_id,
          reminder_type: offset.type,
          status: 'failed',
          error_message: String(err.message || err),
        }, { onConflict: 'booking_id,reminder_type' })
      if (logError) {
        console.error(`Cron: failed to log failure for booking ${booking.id}:`, logError)
      }
      // Artist notification: a client reminder email didn't go out. Keyed on
      // the reminders ROW id (not the booking) so a 3-day and a 1-day failure
      // for the same booking are two distinct notifications. If the failure
      // log itself failed (no row id to key on), skip the notification —
      // the retry next run will surface it then.
      const { data: failedRow } = await supabase
        .from('reminders')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('reminder_type', offset.type)
        .maybeSingle()
      if (failedRow) {
        await insertNotification(supabase, {
          artistId: booking.artist_id,
          type: 'reminder_failed',
          title: 'Reminder email failed',
          body: `The ${offset.type === '1_day' ? '1-day' : '3-day'} reminder to ${booking.client_email || booking.client_name || 'the client'} didn't send. It will retry on the next daily run.`,
          entityType: 'reminder',
          entityId: failedRow.id,
        })
      }
      results.push({ booking: booking.id, type: offset.type, status: 'failed' })
    }
  }

  return res.status(200).json({ ran_at: new Date().toISOString(), results })
}

function firstName(fullName) {
  return (fullName || '').trim().split(/\s+/)[0] || 'there'
}

function buildSubject(booking, offset) {
  if (offset.type === '1_day') return `Tomorrow: your session with ${booking.artist_name}`
  return `Your tattoo session with ${booking.artist_name} — ${formatDateTime(booking.date, booking.time)}`
}

function formatDateTime(date, time) {
  const d = new Date(`${date}T${(time || '00:00:00').slice(0, 8)}Z`)
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
  return `${dateStr} at ${timeStr}`
}

function listItems(items) {
  return items.map((t) => `<li style="margin-bottom:6px;">${t}</li>`).join('')
}

function buildTextEmail(booking, offset) {
  const when = formatDateTime(booking.date, booking.time)
  if (offset.type === '1_day') {
    return [
      `Hi ${firstName(booking.client_name)},`,
      '',
      `Your session is tomorrow — ${when}.`,
      '',
      'Quick checklist for tonight:',
      "- Get a solid night's sleep",
      '- No alcohol tonight',
      '- Eat well in the morning',
      '- Bring your photo ID',
      '',
      'Running late or need to reschedule? Reply to this email right away.',
      '',
      'See you tomorrow,',
      booking.artist_name,
    ].join('\n')
  }
  return [
    `Hi ${firstName(booking.client_name)},`,
    '',
    'This is a reminder about your upcoming tattoo session.',
    '',
    when,
    `with ${booking.artist_name}`,
    booking.session_type ? `${booking.session_type} session` : '',
    '',
    'A few things that help the day go smoothly:',
    '- Eat a good meal beforehand and stay hydrated',
    '- Avoid alcohol for 24 hours before your appointment',
    '- Wear comfortable clothing that gives easy access to the tattoo area',
    '- Bring a valid photo ID',
    '',
    'If you need to reschedule, reply to this email as soon as possible.',
    '',
    'We look forward to seeing you.',
    '',
    booking.artist_name,
  ].filter(Boolean).join('\n')
}

function buildHtmlEmail(booking, offset) {
  const when = formatDateTime(booking.date, booking.time)
  const body = offset.type === '1_day'
    ? `
      <p>Your session is tomorrow — <strong>${when}</strong>.</p>
      <p style="margin-bottom:8px;">Quick checklist for tonight:</p>
      <ul style="margin:0;padding-left:20px;">${listItems([
        "Get a solid night's sleep",
        'No alcohol tonight',
        'Eat well in the morning',
        'Bring your photo ID',
      ])}</ul>
      <p>Running late or need to reschedule? Reply to this email right away.</p>
      <p>See you tomorrow,<br>${booking.artist_name}</p>`
    : `
      <p>This is a reminder about your upcoming tattoo session.</p>
      <p style="font-size:18px;"><strong>${when}</strong><br>with <strong>${booking.artist_name}</strong></p>
      ${booking.session_type ? `<p style="color:#666;">${booking.session_type} session</p>` : ''}
      <p style="margin-bottom:8px;">A few things that help the day go smoothly:</p>
      <ul style="margin:0;padding-left:20px;">${listItems([
        'Eat a good meal beforehand and stay hydrated',
        'Avoid alcohol for 24 hours before your appointment',
        'Wear comfortable clothing that gives easy access to the tattoo area',
        'Bring a valid photo ID',
      ])}</ul>
      <p>If you need to reschedule, reply to this email as soon as possible.</p>
      <p>We look forward to seeing you.</p>
      <p>${booking.artist_name}</p>`

  return `<!DOCTYPE html>
<html><body style="margin:0;background:#f5f5f4;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e5e5e2;border-radius:8px;">
      <tr><td style="background:#0a0a0a;padding:28px 32px;border-radius:8px 8px 0 0;">
        <div style="font-family:Georgia,'Playfair Display',serif;font-size:22px;letter-spacing:4px;color:#d4a843;">VAULTED</div>
        <div style="height:1px;background:#d4a843;margin-top:14px;width:48px;"></div>
      </td></tr>
      <tr><td style="padding:32px;line-height:1.6;font-size:15px;">
        <p>Hi ${firstName(booking.client_name)},</p>
        ${body}
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
