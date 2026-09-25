Mission: Theme Toggle Phase 2 — App-wide CSS Variable Conversion

Context for Claude Code to investigate first:
Vaulted currently has dark/light theme infrastructure already built and working:

src/utils/themeHelpers.js — getTheme()/setTheme(), persists choice to localStorage, toggles a light-theme class on <html>
Theme is applied on app load in main.jsx
A working toggle button exists in Settings → Appearance section

The problem: none of it does anything visually. Every page in the app uses inline styles (style={{ background: "#0a0a0a", ... }}) defined per-component in each file's own const styles = {...} object at the bottom, with hardcoded hex colors. Toggling the light-theme class on <html> currently has zero effect because nothing reads that class.

What's needed:

Investigate every page component (App.jsx, Dashboard.jsx, Bookings.jsx, Clients.jsx, ConsentForms.jsx, Payments.jsx, Portfolio.jsx, Settings.jsx, ClientDetail.jsx, SignConsentForm.jsx, plus anything in src/styles/layout.js) to catalog every hardcoded color currently in use — background, text, border, accent colors.
Define a consistent set of CSS custom properties (e.g. --bg-primary, --bg-card, --text-primary, --text-secondary, --border-color, --accent-gold, etc.) covering the dark theme's existing palette (
#0a0a0a background, 
#d4a843/
#c9974a gold accent, etc.) as the default, with light-theme equivalents defined under the existing .light-theme class selector.
Replace hardcoded hex values in each component's inline styles object with var(--token-name) references — this is the bulk of the work and touches the most files.
Confirm the toggle in Settings actually produces a visible, correct-looking light mode across every page — not just Settings itself.
Watch for edge cases: status badges with semantic colors (booking status green/red/gold, payment type colors) may need their own light-mode-safe variants rather than a blanket swap, since some current colors rely on dark backgrounds for contrast (e.g. rgba(45,106,79,0.15) backgrounds with light text).

Explicitly out of scope: don't touch the theme mechanism itself (themeHelpers.js, the toggle button, main.jsx's theme application) — that's already correct and working. This mission is purely about making the app's colors actually respond to it.

Ben's role: approve the proposed CSS variable naming/structure before implementation, and manually spot-check the visual result across a few key pages in both themes before merging.