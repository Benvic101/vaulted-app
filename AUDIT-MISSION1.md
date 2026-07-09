 Vaulted — Product Audit (MISSION 1)

  Context Framing

  Vaulted currently reads as a well-crafted CRUD skeleton on Supabase, styled with a distinct dark/gold aesthetic. It is not yet an
  operating system for a tattoo studio — the seven screens capture data but don't yet compose into a workflow. Bookings, Clients,
  Consent, and Payments live as isolated ledgers with no cross-references. That disconnection, plus a handful of trust-eroding gaps (no
  client-signed consent, no responsive layout, no confirmations on destructive actions), is what a paying artist will notice within
  their first 10 minutes.

  The visual identity has real potential. The typography pairing (Playfair Display + DM Sans) is a strong, appropriate choice. The main
  risks to the premium feel are (a) the gold hue itself, (b) uniform dead-black chrome with no depth, and (c) missing motion/feedback.

  ---
  Strengths

  - Consistent visual system across screens — every page uses the same header pattern (headerSub + headerTitle), the same card
  treatment (#0d0d0d + #1a1a1a border + 12px radius), the same input field construction. This makes the app feel intentional even
  though it's inline-styled. [High — preserve]
  - Typography pairing is genuinely premium — Playfair Display on numeric values (booking day, revenue) is a smart move; it feels
  editorial rather than dashboard-y. [High — preserve]
  - Sensible tenancy model — every read/write is scoped to artist_id; assuming Supabase RLS mirrors this, it's a defensible foundation.
  [Critical — preserve]
  - Consent flow already exists as a concept — most competitors in this space treat consent as an afterthought. Even in its current
  state, it's a differentiator. [High — preserve, then radically improve]
  - Empty states exist on every list — friendly copy, iconography, no dead pages. Rare for an app at this stage. [Medium]
  - Bookings auto-computes the 20% deposit — a small "we understand your business" touch that clients don't get elsewhere. [Medium]

  ---
  Weaknesses

  - The screens don't talk to each other. Bookings has a client_name free-text field with no lookup to clients. Payments has a
  client_name free-text field with no lookup to clients or to bookings. bookings.deposit is a static number that never links to a
  payments row marked paid. consent_forms.client_name is again a string. The app is a set of parallel ledgers, not a workflow. This is
  the single biggest thing blocking Vaulted from being an "operating system." [Critical]
  - Consent forms are not actually signed by the client. The artist fills them in on the artist's own device and hits Save. There is no
  signature capture, no client-facing link/QR flow, no IP/timestamp record beyond the artist's submission time, no PDF generation.
  This is a legal/liability problem the moment a real artist tries to rely on it. [Critical]
  - No responsive layout. The sidebar is fixed 240px, the main column has marginLeft: 240px, and every grid is repeat(4, 1fr). Below
  ~1024px this breaks; on mobile it's unusable. Tattoo artists work off phones/tablets. [Critical]
  - No edit or delete on Bookings, Clients, Payments, or Consent Forms. Once created, records are immutable. Portfolio has delete but
  no confirmation and no storage cleanup. [Critical]
  - No password reset, no password requirements, no email verification flow surfaced to the user. Signup shows "Check your email to
  confirm ✅"  and then… nothing changes in the UI. [High]
  - Message state is unreliable. message is used for both errors and successes and is rendered in gold on both. Auto-clear only happens
  on the success path via setTimeout(1500); errors linger silently. No toast, no aria-live. [High]
  - No <form> element anywhere. Every submit is a <button onClick>. Enter-to-submit doesn't work. Browser autofill is degraded.
  Accessibility is degraded. [High]
  - No loading states between initial render and data arrival. On slow connections, users see "No clients yet. Add your first one!" for
  a moment before real data arrives — actively misleading. [High]
  - Dashboard stats stale. fetchStats runs once on user load; adding a client/booking/payment doesn't update the counters until page
  refresh. [High]
  - "Consent Forms Signed" stat is mislabeled. The query counts all forms for the artist; the state variable is named pendingConsents;
  the label says "Signed." One of the three is wrong. [High]
  - Portfolio delete leaks storage. handleDelete removes the DB row but never removes the object from the portfolio bucket. Storage
  cost grows unbounded. [High]
  - Portfolio bucket is public. Anyone with a URL can view; there is no signed-URL flow. Artists' work is technically discoverable if
  the URL pattern is guessed. [High]
  - Uploads are not resized or compressed. A 12MB phone photo goes straight to storage and gets rendered at 220px. Slow, expensive,
  unnecessary. [Medium]
  - activePage string routing is brittle — "consent forms" (lowercase, with space) is compared to item.label.toLowerCase() from the nav
  array. One typo breaks navigation silently. [Medium]
  - Currency and timezone are hardcoded. $ everywhere, en-US locale everywhere. Fine for US-only; not fine for an international launch.
  [Medium — becomes High if you target Europe/UK]
  - Settings has no way to change password, no logout confirmation, no session management. [Medium]
  - No hover, focus, or active states. Inline styles can't easily express :hover. Buttons feel dead. Focus outlines are removed on
  inputs (outline: none) with no replacement — accessibility failure. [High for accessibility, Medium for feel]

  ---
  UX Issues

  - No client picker in Bookings, Payments, or Consent Forms. Every artist will end up with duplicated clients ("John Smith", "john
  smith", "J. Smith") because they can't select an existing one. [Critical]
  - No way to mark a booking as completed or cancelled. Status is set to "upcoming" on insert and there's no UI to change it. The
  status badge shown on the list is decorative. [Critical]
  - No client detail view. Clicking a client does nothing. Artists cannot see "this client's bookings / consent forms / payments /
  notes / photos" — which is the entire point of a CRM. [Critical]
  - Deposit collection is theatrical. Bookings displays a 20% deposit; Payments has a "deposit" type. Nothing enforces or links them.
  An artist cannot see "who owes a deposit" or "which bookings are paid in full." [High]
  - No calendar view. Bookings is a flat list. Artists mentally think in weeks and days. A month/week view is table stakes for a
  booking product. [High]
  - Login page and Dashboard both flash before session hydration. Refreshing on the dashboard shows the login screen for ~200ms. Feels
  broken. [High]
  - No confirmation on Portfolio delete. One misclick, work is gone. [High]
  - New Booking / Add Client / New Form / Record Payment all use a view: "list" | "form" toggle in the same URL. Deep links can't jump
  to a form. Browser back button doesn't do the intuitive thing. [Medium]
  - setTimeout(1500) auto-switches back to list after success. Faster users don't see the success confirmation; slower users get yanked
  mid-read. Both are wrong. [Medium]
  - Bookings allows past dates. No validation. [Medium]
  - No search on any list. As soon as an artist has 30+ clients or bookings, browsing becomes painful. [Medium]
  - No sort / filter on Bookings, Clients, Payments. Portfolio is the only list with a filter. [Medium]
  - Consent form list has no drill-in. You can't view or export a saved form. Its value is exactly zero until you can. [High]
  - Sidebar shows no user identity. No avatar, no email, no studio name — just brand and nav. Artists lose orientation about which
  account they're in. [Medium]
  - bookings.status renders lowercase ("upcoming"), while nav labels are capitalized. Small but adds up. [Low]

  ---
  UI Issues

  - Gold #d4a843 reads yellow and slightly chalky against #0a0a0a. It has the hue of school-bus paint rather than gilded leather. See
  the palette section at the end. [High]
  - Everything is #0a0a0a or #0d0d0d with #1a1a1a borders. There's almost no elevation, no separation of surfaces. The eye can't rest
  anywhere; the app reads as one uniform dark rectangle. Premium dark UIs (Linear, Arc, Stripe) use layered darks — a hair of contrast
  between background, surface, elevated surface, and hover. [High]
  - 1px #1a1a1a borders on #0d0d0d cards are barely visible. Cards look like flat rectangles rather than surfaces. Consider #1e1e1e or
  a subtle inner highlight (box-shadow: inset 0 1px 0 rgba(255,255,255,0.03)). [Medium]
  - #333–#555 gray for secondary text is too dim. Legibility fails WCAG for anyone not in a dark room. Empty-state text at #333 on
  #0d0d0d is effectively invisible. [High — accessibility]
  - newBtn uses raw gold with black text and no hover — bright, blocky, static. A hover fade and a subtle inset stroke would elevate it
  materially. [Medium]
  - Serif on sectionTitle at 16px 400 weight looks like a leftover placeholder — the weight is too light for that size on dark. Bump to
  500/600 or go smaller. [Low]
  - Playfair Display for numbers is charming on the Dashboard but starts to feel showy when it's on every price, deposit, date, and
  stat. Reserve it for hero moments; use DM Sans (tabular numerals) for tables. [Medium]
  - Icons are uniform stroke width but the label typography carries all the visual weight — nav items feel flat. Consider a light hover
  glow or subtle scale on the icon on active. [Low]
  - Portfolio card footer is cramped. Category + caption + delete button crammed into 14px padding. Give it air. [Low]
  - The <input type="file"> in Portfolio is the browser default and looks alien. Everything else is custom. [Medium]
  - checkboxText at #888 is fine; the checkbox itself uses accentColor which the browser renders inconsistently. A custom checkbox
  would match the aesthetic. [Low]
  - Focus rings are removed (outline: none) with nothing replacing them. Keyboard users are lost. [High — accessibility]
  - opacity: 0.5 on disabled email input is the only "disabled" pattern, and there's no explanation why it's disabled ("email is set by
  your account"). [Low]
  - headerSub uppercase + letterSpacing: 1px at 12px is used and nav items use similar uppercase treatment and labels use uppercase.
  Uppercase is over-applied — reserve it for one register (section headers or eyebrow labels, not both). [Low]

  ---
  Opportunities

  - Turn Vaulted into a workflow. The linear artist flow is: client inquires → consult booked → consent captured → deposit paid →
  session held → final payment → portfolio piece added → follow-up. Every current screen touches one node of this flow but the edges
  don't exist. Building even one edge (e.g. "New booking → auto-create client if new → send consent link → record deposit against
  booking") reframes Vaulted from a database to a product. [Critical]
  - A client-facing surface. A shareable per-client link that (a) shows their upcoming appointment + directions, (b) presents the
  consent form for real signature, (c) pays their deposit via Stripe. This is the trust-and-conversion lever: it makes the artist look
  more professional to their clients, which is the single feature they'll pay for. [Critical]
  - A public studio profile. vaulted.app/@studio-name with portfolio, book-now, artist bio. Doubles as marketing surface and reduces
  artists' Linktree/Squarespace overhead. [High]
  - Reframe the Dashboard. Today it's four stats + four quick actions + today's appointments. It should be a triage view: "next 3
  appointments with client info," "deposits owed," "consent forms outstanding," "payments received this week." Numbers only matter in
  context. [High]
  - Portfolio as social object. Categories are there; captions are there. Add tags, publish-to-public-profile toggle, per-piece
  analytics. [Medium]
  - Stripe Connect for payments. Recording payments manually is fine; taking payments is what artists actually want. Deposit-on-booking
  via Stripe is a wedge that alone justifies a subscription. [High]

  ---
  Missing Features

  - Client-signed consent with signature capture + PDF + email copy. [Critical]
  - Booking status transitions (upcoming → completed/cancelled) and rescheduling. [Critical]
  - Edit and delete for every entity, with confirmation for destructive actions. [Critical]
  - Client detail page with related bookings/payments/consent/portfolio. [Critical]
  - Calendar view for Bookings (day / week / month). [High]
  - Search on Clients, Bookings, Payments. [High]
  - Link Payments to Bookings (mark deposit paid / mark session paid in full). [High]
  - Password reset and change-password flows. [High]
  - Email/SMS reminders to clients before appointments. [High]
  - Public studio profile / shareable booking link. [High]
  - CSV / PDF export of payments (bookkeeping / tax). [Medium]
  - Multi-artist studios (shared clients, per-artist calendars, roles). [Future] — but decide the data model now so you don't repaint
  later.
  - iCal / Google Calendar sync. [Medium]
  - Timezone and currency in Settings. [Medium]
  - Global command palette (Cmd-K). Fits the Linear/Raycast reference points. [Low, feel-multiplier]

  ---
  Quick Wins

  (items with disproportionate impact for the effort — do these before writing anything new)

  1. Wrap every submit in a <form onSubmit>. Enables Enter-to-submit, autofill, native validation. ~30 lines total. [High]
  2. Add loading skeletons or at minimum a "Loading…" state distinct from empty. Prevents "No clients yet" flashes. [High]
  3. Fix the Dashboard "Consent Forms Signed" mislabel/mis-query. Either rename or filter correctly. [High]
  4. Refetch dashboard stats when returning to the Dashboard tab. Move fetchStats into an effect keyed on activePage. [High]
  5. Add a session-loading gate in App.jsx so the login screen doesn't flash on refresh. Show the brand mark centered while session ===
  undefined. [High]
  6. Add confirmation to Portfolio delete (window.confirm is fine for now). [High]
  7. Add a delete of the storage file when a portfolio item is removed. [High]
  8. Add min={today} to booking date input. One attribute. [High]
  9. Restore focus rings with a branded outline (e.g. outline: 1px solid rgba(212,168,67,0.5); outline-offset: 2px). [High]
  10. Bump secondary text from #333/#444 to #5c5c5c/#6b6b6b so empty-state and meta text are readable. Zero-cost accessibility win.
  [High]
  11. Introduce a toast component (<Toast> with role="status" / aria-live="polite"). Route all message state through it. [Medium]
  12. Remove the setTimeout(1500) → setView("list") auto-switch. Let the user click "Back to List" or "Add another" themselves.
  [Medium]
  13. Show the signed-in artist's email + studio name in the sidebar footer above Logout. Grounds the user in the current account.
  [Medium]
  14. Replace uppercase everywhere with uppercase only on eyebrows (headerSub), not on labels and nav and badges. Immediate maturity
  gain. [Medium]
  15. Add hover + active states to nav items and buttons. Even a transition on background-color transforms the perceived quality.
  [Medium]

  ---
  Long-term Improvements

  - Real routing (React Router or TanStack Router). Deep links, browser back/forward, restorable form drafts. [High]
  - Extract a real design-system module. The current inline const styles = {…} per file duplicates the same primitives (container,
  header, field, input, button, card) across seven files. Consolidate into a small token file + a handful of primitive components
  (<Card>, <Field>, <Input>, <Button>, <PageHeader>). Do this before adding responsiveness — retrofitting responsive to 7 inline
  stylesheets is 3× the work of building it into primitives once. [High]
  - A responsive layout that collapses the sidebar to a bottom tab bar on mobile. Not a media-query patch — a real layout decision.
  [Critical for launch]
  - Move Supabase URL + key to env variables; publishable key is fine to expose but should be per-environment. Also lets you have a
  staging project. [High]
  - Add an ErrorBoundary and a Supabase-error interceptor so a single failed query doesn't blank the panel. [High]
  - Add optimistic updates + client-side caching (React Query or SWR). The current refetch after mutation pattern is fine at 10 rows
  and painful at 500. [High]
  - Notifications system (in-app + email) — reminders, deposit-due, consent-outstanding, birthday. [High]
  - Analytics (privacy-respecting) so you see what artists actually use. [Medium]
  - Onboarding flow. First-run should offer: import clients CSV, upload logo, set studio name, choose currency/timezone. Nothing about
  Vaulted currently teaches a new artist what to do first. [High]
  - Motion system. Subtle 150–200ms transitions on page swap, on card entry, on toast — the difference between "web app" and "Linear."
  Framer Motion is overkill; a light CSS-transition convention is enough. [Medium]
  - Command palette (Cmd-K). Not vanity — accelerates power users, and power users convert. [Low]
  - Native mobile shell (Capacitor/Expo) once web flow is proven. [Future]
  - Multi-artist studio schema. Introduce a studios table with artist_id becoming studio_member_id before you have paying users.
  Migrating later is expensive. [Future — decide now, build later]

  ---
  Accent Color — 3 Alternatives

  You're right that #d4a843 reads slightly flat and yellow. Against #0a0a0a it's warm but not rich; the value is high and the chroma
  leans lemon rather than amber. Three directions worth prototyping:

  Option A — Burnished Champagne Gold #c9974a (recommended for continuity)
  Same family as your current gold, one step deeper and warmer. Reads as antique brass / aged leather rather than school-bus yellow.
  Minimal cognitive change for you, but the whole app immediately feels more expensive. Pairs well with a slightly softened ivory text
  (#efe7d4 for hero copy instead of pure #f5f5f5) — the small warmth match ties the palette together.

  Option B — Warm Ivory / Pearl #e8dbb8 with a copper accent #b87745 (recommended for the boldest premium reset)
  Move the "primary" accent to a near-neutral warm ivory (used for CTAs, active nav, hero numbers). Use copper sparingly for secondary
  emphasis (badges, active-state underlines). This is the Aesop / Loro Piana move — the "gold" becomes light rather than saturated.
  It's a bigger shift, but it removes the "casino / crypto" energy that saturated gold can carry on dark UIs, and it makes photography
  (Portfolio) sing.

  Option C — Deep Ember #b8552b or Oxblood #8a2f2b
  Trades gold for a saturated warm accent that reads as ink, wax seal, or leather binding — thematically resonant with tattoo craft.
  Not gold at all. Only worth exploring if you're open to a full identity pivot; otherwise it fights your existing brand cues.

  My recommendation: A now, as a one-line find/replace, and B as a design exploration over the next few weeks. C only if you want to
  distance Vaulted from the crypto/luxury-dashboard gold aesthetic that's become common.

  While you're there: consider elevating the surface palette from a two-tone (#0a0a0a, #0d0d0d) to a four-tone (#0a0a0a app bg, #0f0f10
  surface, #141416 elevated, #1a1a1c hover). It's the single biggest change that makes a dark UI feel "designed" versus
  "dark-mode-toggled."

  ---
  Suggested Order of Implementation

  (assuming you accept — waiting for your go-ahead per MISSION 1)

  1. Trust + polish sweep — Quick Wins #1–#10. One PR. Zero new features, dramatically better feel. Ships in a day.
  2. Design-system extraction + accent swap (Option A) — one PR, cosmetic-only.
  3. Responsive layout + sidebar → mobile tab bar.
  4. Edit/delete + status transitions + client picker across all four screens.
  5. Consent v2: client-facing signature flow + PDF.
  6. Bookings calendar view.
  7. Payments ↔ Bookings linking + Stripe deposit collection.
  8. Public studio profile + onboarding.

  Awaiting your approval on the audit before touching code. Happy to go deeper on any section, mock up the color options in the
  browser, or start with the trust-and-polish PR if you want a fast confidence-building first step.