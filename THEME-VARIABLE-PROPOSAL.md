# Theme Toggle Phase 2: CSS Variable Proposal

## Current State

The theme toggle infrastructure works (themeHelpers.js, localStorage persistence, `.light-theme` class on `<html>`), but has zero visual effect because every component uses hardcoded hex colors in inline styles.

## Proposed CSS Variable Structure

### Core Palette Variables

**Backgrounds**
- `--bg-primary` — main app background (#0a0a0a dark)
- `--bg-secondary` — card/section background (#0f0f10 / #0d0d0d dark)
- `--bg-tertiary` — nested input/element background (#141416 dark)
- `--bg-elevated` — modal/dropdown background (#0f0f10 / #0d0d0d dark)

**Text**
- `--text-primary` — main headings and primary content (#f5f5f5 dark)
- `--text-secondary` — body text, metadata (#888 / #ccc dark)
- `--text-tertiary` — labels, subtle text (#6b6b6b dark)
- `--text-muted` — disabled, placeholder (#555 / #5c5c5c dark)
- `--text-inverse` — text on accent backgrounds (#0a0a0a dark)

**Borders**
- `--border-primary` — main borders (#1a1a1a dark)
- `--border-secondary` — subtle borders (#1e1e1e dark)
- `--border-tertiary` — very subtle dividers (#2a2a2a dark)

**Accents & Semantic Colors** (these may need light-mode adjustments for contrast)
- `--accent-gold` — primary accent, buttons (#c9974a)
- `--accent-gold-dark` — gold gradient variant (#a07830)
- `--success-primary` — completed status, revenue (#2d6a4f)
- `--success-bg` — success badge background (rgba(45,106,79,0.15))
- `--success-border` — success badge border (rgba(45,106,79,0.2))
- `--danger-primary` — error, delete actions (#8b1a1a)
- `--danger-secondary` — danger text variant (#c94a4a)
- `--danger-bg` — danger badge background (rgba(139,26,26,0.1))
- `--danger-border` — danger badge border (rgba(139,26,26,0.3))
- `--warning-primary` — upcoming status, notifications (#c9974a)
- `--warning-bg` — warning badge background (rgba(201,151,74,0.12))
- `--warning-border` — warning badge border (rgba(201,151,74,0.25))
- `--info-primary` — card payments, tips (#4c9ac9)

**Overlays & Shadows**
- `--overlay-bg` — modal scrim (rgba(0,0,0,0.6) dark)
- `--overlay-strong` — confirm dialog scrim (rgba(5,5,5,0.75) dark)
- `--shadow-dropdown` — dropdown shadow (0 8px 24px rgba(0,0,0,0.4) dark)

### Light Mode Values (Proposed)

For light mode, the palette inverts:

**Backgrounds**
- `--bg-primary`: #fafafa
- `--bg-secondary`: #ffffff
- `--bg-tertiary`: #f5f5f5
- `--bg-elevated`: #ffffff

**Text**
- `--text-primary`: #0a0a0a
- `--text-secondary`: #444444
- `--text-tertiary`: #666666
- `--text-muted`: #999999
- `--text-inverse`: #ffffff

**Borders**
- `--border-primary`: #e0e0e0
- `--border-secondary`: #d0d0d0
- `--border-tertiary`: #cccccc

**Accents** stay similar with minor adjustments for readability:
- `--accent-gold`: #b8853d (slightly darker for contrast on light bg)
- Success/danger/warning colors stay the same but backgrounds adjust
- `--success-bg`: rgba(45,106,79,0.08)
- `--danger-bg`: rgba(139,26,26,0.06)
- `--warning-bg`: rgba(201,151,74,0.08)

**Overlays**
- `--overlay-bg`: rgba(255,255,255,0.7)
- `--overlay-strong`: rgba(255,255,255,0.85)
- `--shadow-dropdown`: 0 8px 24px rgba(0,0,0,0.1)

## Implementation Strategy

1. Define all CSS variables in `index.css` under `:root` (dark theme as default)
2. Define light theme overrides under `.light-theme` class selector
3. Replace every hardcoded hex/rgba value in component styles with `var(--token-name)`
4. Test both themes across all pages
5. Watch for contrast issues with semantic colors (status badges especially)

## Files to Update

- `src/index.css` — define variables
- `src/App.jsx` — auth page styles
- `src/pages/Dashboard.jsx`
- `src/pages/Bookings.jsx`
- `src/pages/Clients.jsx`
- `src/pages/ConsentForms.jsx`
- `src/pages/Payments.jsx`
- `src/pages/Portfolio.jsx`
- `src/pages/Settings.jsx`
- `src/pages/SignConsentForm.jsx`
- `src/pages/ForgotPassword.jsx` (if exists)
- `src/pages/ResetPassword.jsx` (if exists)
- `src/components/ClientDetail.jsx`
- `src/components/ClientPicker.jsx`
- `src/components/ConfirmDialog.jsx`
- `src/components/ConfirmDeleteDialog.jsx`
- `src/styles/layout.js`

## Edge Cases to Watch

- **Status badges**: Current dark backgrounds (rgba with low opacity) may not work on light backgrounds — need separate light-mode values
- **Avatar gradients**: linear-gradient with gold shades should work in both themes
- **Overlay scrims**: light mode needs lighter overlays (white with transparency instead of black)
- **Shadows**: light mode needs softer shadows
- **Canvas signature background**: should contrast with theme
- **Input disabled states**: opacity adjustments may need theme-specific values

## Out of Scope

- Don't touch themeHelpers.js or the toggle button mechanism (already working)
- Don't add new theme options (just dark/light)
- Don't change font families or spacing (purely color swap)
