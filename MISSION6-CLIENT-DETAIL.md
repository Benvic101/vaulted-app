# MISSION 6 — Client Detail Page (The CRM Foundation)

Objective:

Right now, the Clients screen is simply a list of records. Clicking a client
does nothing.

Vaulted's long-term vision is to become the operating system for tattoo
studios—not just a collection of disconnected CRUD pages.

The Client Detail page is where those separate features begin to connect into
an actual workflow.

A tattoo artist should be able to click a client and immediately understand
their entire relationship with the studio.

---

## BEFORE WRITING ANY CODE

First inspect the existing implementation rather than assuming.

Determine:

1. How are Clients currently rendered?
   - Is each client already a clickable card?
   - Is there already any selectedClient state?
   - Is there an existing pattern for switching between list/detail/form
     views that should be reused?

2. Confirm how client relationships currently work.

Specifically:

- Are Bookings linked through client_id?
- Are Payments linked through client_id?
- Are Consent Forms linked through client_id?
- Is Portfolio currently linked to a client in any way?

Do not assume previous migrations succeeded.

Verify the actual schema first.

3. Explain whether the current architecture (activePage navigation inside the
SPA) is sufficient for a client detail screen or whether introducing another
view state (list | detail | form) is the most appropriate solution at this
stage.

Do NOT introduce React Router during this mission.

If you believe routing should change in the future, explain why—but keep this
mission aligned with the current architecture.

---

## Design Goal

This page should feel like opening a client's folder.

Not another form.

Not another table.

The artist should immediately understand:

"I've opened this person's history."

The design should remain consistent with Vaulted's existing luxury aesthetic:

- Dark surfaces
- Gold accent
- Playfair Display
- DM Sans
- Existing cards/buttons/components
- Inline style objects

Do not introduce a new design language.

---

## Information Hierarchy

At minimum, the page should include:

### Client Header

- Client name
- Phone
- Email
- Notes (if available)

Actions:

- Edit Client
- Delete Client
- Back to Clients

---

### Relationship Summary

Small overview cards showing:

- Total Bookings
- Upcoming Booking
- Total Payments
- Total Spent
- Consent Forms
- Last Visit

These should provide quick context before scrolling.

---

### Bookings Section

Display every booking belonging to this client.

Include:

- Date
- Time
- Tattoo description
- Status
- Deposit
- Total price

If there are none:

Show a thoughtful empty state.

---

### Payments Section

Display every payment for this client.

Include:

- Date
- Amount
- Type
- Method
- Notes

Show useful totals where appropriate.

---

### Consent Forms Section

Display all consent forms belonging to this client.

At this stage they do NOT need editing.

The artist should simply be able to view that consent history exists.

Future missions will improve consent workflows.

---

### Portfolio Section

If portfolio pieces are currently associated with clients,
display them.

If they are not yet linked in the schema,
explain that clearly and leave a placeholder section rather than inventing
relationships that don't exist.

---

## UX Requirements

The page should answer these questions within a few seconds:

- Who is this client?
- Have they been here before?
- Have they signed consent?
- Have they paid?
- What is their next appointment?
- How valuable has this client been to the studio?

Avoid forcing the artist to jump between screens.

The goal is reducing navigation—not adding more.

---

## Performance

Avoid unnecessary queries.

Prefer fetching related information together when practical.

If multiple queries are required, explain why.

Loading states should be handled gracefully.

Empty states should never be confused with loading states.

---

## Constraints

Do NOT redesign the Clients page.

Do NOT introduce React Router.

Do NOT modify unrelated screens.

Do NOT change the design system.

Keep this mission focused solely on introducing a premium Client Detail
experience.

---

## Before Implementing

Explain:

- your proposed UI structure
- any schema assumptions you've verified
- any trade-offs
- every file you expect to modify

Wait for approval before writing code.