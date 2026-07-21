MISSION 4 — Booking Status Transitions

Objective: bookings currently get status = "upcoming" on insert with no way 
to change it. The status badge on each booking card is purely decorative. 
Artists need to be able to mark a booking as "completed" or "cancelled" 
(and potentially back to "upcoming" if marked in error).

BEFORE WRITING ANY CODE:

Given our history this session with hidden schema issues, first check:
1. Is there a check constraint on bookings.status restricting which text 
   values are allowed? (Check via information_schema or pg_constraint — 
   don't assume it's a free-text column just because earlier queries 
   showed data_type as "text".)
2. What's the current default value for status on insert?
3. Are there any other places in the codebase that read bookings.status 
   and assume specific string values (e.g. filtering "upcoming" bookings 
   somewhere, or the Dashboard stats)?

Then propose your approach before implementing:
- Where should the status control live — inline on each booking card 
  (e.g. a small dropdown or button group), or only inside the edit form?
- What are the exact allowed statuses and transitions? (e.g. can a 
  "completed" booking be reverted to "upcoming," or is that a one-way door?)
- Should changing status require confirmation (like delete does), or 
  is it low-risk enough to be instant?
- Any visual treatment needed — e.g. should "completed" bookings look 
  visually distinct (dimmed, checkmark) vs "cancelled" (strikethrough, 
  muted)?

Do NOT implement any code yet. Wait for my approval of your proposed 
approach first.

Scope: Bookings.jsx only. Match existing UI patterns and styling.