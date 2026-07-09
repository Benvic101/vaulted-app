I've reviewed the Mission 1 audit. Approved for implementation now:

1. Quick Wins #1 through #10 exactly as listed in your audit report:
   - Wrap every submit in a <form onSubmit>
   - Add loading states distinct from empty states
   - Fix the Dashboard "Consent Forms Signed" mislabel/mis-query
   - Refetch dashboard stats when returning to the Dashboard tab
   - Add a session-loading gate in App.jsx so login doesn't flash on refresh
   - Add confirmation to Portfolio delete
   - Delete the storage file when a portfolio item is removed
   - Add min={today} to booking date input
   - Restore focus rings with a branded outline
   - Bump secondary text from #333/#444 to #5c5c5c/#6b6b6b for readability

2. Accent color swap — Option A only: replace #d4a843 with #c9974a 
   across the app.

3. Surface palette — elevate from two-tone to the four-tone scale you 
   suggested: #0a0a0a app bg, #0f0f10 surface, #141416 elevated, 
   #1a1a1c hover. Apply this consistently wherever background/surface 
   colors are currently #0a0a0a or #0d0d0d, using your judgment on 
   which tone fits each context (base page vs card vs hover state).

Everything else in the audit (workflow linking, consent signature capture, 
calendar view, responsive layout, design-system extraction, Option B/C 
colors, etc.) is NOT approved yet — do not touch those.

Constraints:
- No changes to Supabase table schemas, RLS policies, or migrations of 
  any kind. If any of the above items seem to require a schema change, 
  stop and ask me first instead of proceeding.
- Keep every change scoped to exactly what's listed above — no adjacent 
  "while I'm in there" improvements.
- Show me a summary of every file you changed when done, before I test it.