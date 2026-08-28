# Mission 9: Consent Forms Edit/Delete

## Context
Consent Forms was deliberately excluded from Mission 2's edit/delete work 
given the legal weight of signed forms. This mission adds edit/delete, 
with rules that reflect that weight — unlike other entities, consent 
forms need different treatment depending on their status.

## Decisions (locked — implement as specified, don't re-derive)

### Draft / Sent (unsigned) forms
- Editable: form content/template fields, health-history pre-fill answers, 
  send-link expiry — investigate the actual schema/fields first.
- NOT editable: which client the form is addressed to. If the artist needs 
  to send it to a different client, they create a new form — do not allow 
  re-targeting an existing sent link to a different client_id.
- If a sent (not yet signed) form is edited, mark it with an "edited" 
  indicator and timestamp, visible wherever the form is displayed 
  (list view and detail view). This matters because the client may already 
  have the link open — they should be able to tell the content changed 
  since it was sent.

### Signed forms
- Delete is allowed, but requires a strong, explicit confirmation step — 
  not a generic "are you sure?" Something that makes the artist actively 
  acknowledge the consequence (e.g. typing the client's name to confirm, 
  or a two-stage confirm with an explicit warning that deleting a signed 
  consent record may have legal/liability implications). Investigate 
  existing confirmation patterns in the app — e.g. Portfolio's delete 
  confirmation from Mission 1 — before designing a new one, for consistency.
- Edit is NOT allowed on signed forms at all — the content, answers, and 
  signature are immutable once signed. No edit UI should be exposed for 
  signed forms.

### Audit trail (applies to both edit and delete, any status)
- Log who performed the action and when, for compliance purposes. 
  Investigate whether an existing audit/log table or pattern exists in 
  the schema before designing a new one — don't duplicate if something 
  already covers this need.

## Process
Investigate the real code and schema first (current ConsentForms.jsx 
structure, the consent_forms table, existing delete-confirmation patterns, 
any existing audit-log mechanism). Propose your approach — including any 
schema/migration changes needed for the audit trail — and wait for my 
approval before implementing. As always, I run any Supabase SQL myself; 
you don't touch the database directly.

## Out of scope
- No changes to the signature-capture flow itself (Mission 5).
- No changes to Client Detail's consent-form display (Mission 6) beyond 
  what's needed to show the "edited" indicator.