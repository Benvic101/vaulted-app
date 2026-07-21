MISSION 3 — Client Picker for Bookings and Payments

Objective: instead of typing a client's name freehand in Bookings and 
Payments (which causes duplicate/inconsistent client records — "John 
Smith" vs "john smith" vs "J. Smith"), the artist should select an 
existing client from a searchable list, with a quick option to add a 
new client inline if they don't exist yet.

BEFORE WRITING ANY CODE:

Given what we just found with the missing id columns, first inspect the 
actual current schema of bookings, payments, clients, and consent_forms 
(don't assume — check via information_schema like we did for the PK 
issue). Specifically confirm:
1. Does clients.id exist and is it a proper primary key now (after 
   today's migration)?
2. Do bookings.client_name / payments.client_name currently have any 
   relationship (foreign key or otherwise) to the clients table, or are 
   they fully independent free-text fields?
3. Does consent_forms have a similar client_name free-text field that 
   should also be included in this mission's scope?

Then, before implementing anything, explain your proposed approach:
- Will this require adding a client_id column (foreign key to clients.id) 
  to bookings and payments? If so, what happens to existing rows — how 
  do you propose matching/backfilling their existing client_name text 
  to a real client_id (or leaving it null if no confident match exists)?
- How will the "add new client inline" flow work if the artist searches 
  and doesn't find an existing match?
- Will client_name be kept alongside client_id (for display/history) or 
  fully replaced?

Do NOT write or run any SQL yourself. If a schema change is needed, 
write out the exact SQL and explain the migration/backfill strategy, 
and wait for me to review and run it myself, same as before.

Do NOT implement any code yet. Wait for my approval of your proposed 
approach first.

Scope once approved: Bookings.jsx and Payments.jsx only, plus 
ConsentForms.jsx if you confirm it has the same free-text client field. 
Match existing UI patterns and styling — no new design system.