MISSION 5 — Client-Facing Consent Signature Capture

Objective: currently, the artist fills out and saves the consent form 
themselves — the client never actually signs anything. This mission adds 
a real client-facing signing flow: the client receives a link, reviews 
the form, and signs it themselves on their own device.

BEFORE WRITING ANY CODE, inspect and report back on:

1. Current consent_forms schema (columns, constraints) — confirm exactly 
   what fields exist today (I recall: client_name, client_email, date, 
   several boolean health/consent checkboxes, artist_id, signed_at, id, 
   client_id — but verify against the live schema, don't assume from memory).

2. Routing: this app currently has NO router — everything is gated behind 
   login via the activePage pattern in Dashboard.jsx. A client signing a 
   form is NOT logged in and should never need to be. This genuinely 
   requires adding a public, unauthenticated route this time (unlike the 
   earlier public-portfolio idea we deferred, this one is now an approved, 
   real requirement). Propose how you'd add this with minimal risk to the 
   existing authenticated app — I'd expect something like adding 
   react-router-dom and a single public route (e.g. /sign/:formId) that 
   renders outside the auth-gated App.jsx tree entirely.

3. RLS implications: the client filling this out has no Supabase auth 
   session. Explain how the public signing page will read the pending 
   form and write the signature back, given RLS currently assumes 
   artist_id = auth.uid(). Propose the safest approach (e.g. a scoped 
   Supabase Edge Function with the service role, vs a narrowly-scoped 
   anon RLS policy keyed to an unguessable form token) — do not propose 
   anything that would let one client read another client's or another 
   artist's data.

Then propose your full approach before implementing anything:
- How does the artist generate/send the link? (e.g. a "Send for Signature" 
  button that creates a pending form + shareable URL)
- What does the client see and do on their end? (review the health 
  questions, some kind of signature — typed name, or drawn signature 
  via canvas, your recommendation)
- What gets stored as proof of signing? (signature data, timestamp, 
  IP address if easily available, anything else relevant)
- Does the artist get notified when a client signs?
- What's the minimal safe schema change needed (new columns/tables), 
  and give me the exact SQL to review — I'll run it myself, as always.

IMPORTANT: Include a clear note in your response that the legal 
sufficiency of this flow (signature validity, health data handling, 
minors) should be reviewed by an actual lawyer before relying on it 
with real clients — you're building the technical mechanism, not 
providing legal certification that it's compliant.

Do NOT write or run any code or SQL yet. Wait for my approval of the 
full proposed approach first.