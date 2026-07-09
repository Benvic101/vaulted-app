MISSION 2 — Edit + Delete for Bookings, Clients, Payments

From your Mission 1 audit, this is the item I'm approving now (quoted exactly 
as you wrote it):

"No edit or delete on Bookings, Clients, Payments, or Consent Forms. Once 
created, records are immutable. Portfolio has delete but no confirmation 
and no storage cleanup. [Critical]"

Scope for this mission: Bookings, Clients, and Payments only.
Consent Forms is intentionally EXCLUDED from this pass — editing a signed 
legal/consent document raises separate questions I want to think through 
on its own. Do not touch ConsentForms.jsx in this mission.

What to build, for each of Bookings, Clients, and Payments:
1. An Edit action on each record that opens the existing create/add form, 
   pre-filled with that record's current values, and saves via an update 
   instead of an insert.
2. A Delete action with a confirmation prompt (window.confirm is fine — 
   match the pattern already used in Portfolio's delete).
3. Reuse the existing form components/styling already in each page — do 
   not create new duplicate form UI.

Important constraint on the database:
These tables likely don't have UPDATE and DELETE row-level-security 
policies yet (only SELECT/INSERT). Do NOT attempt to run any SQL or 
modify Supabase yourself. Instead:
- Write out the exact SQL needed to add UPDATE and DELETE RLS policies 
  for bookings, clients, and payments (scoped to artist_id = auth.uid(), 
  matching the existing ownership model).
- Show me that SQL clearly so I can run it myself in the Supabase SQL 
  Editor before I test the frontend changes.

Other constraints:
- No changes to ConsentForms.jsx or any other page not listed above.
- No other schema changes beyond the UPDATE/DELETE policies described.
- Keep changes scoped to exactly what's listed here — no adjacent 
  "while I'm in there" improvements.
- Show me a summary of every file changed, and the SQL to run, before 
  I test anything.