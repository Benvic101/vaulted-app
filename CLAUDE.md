# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server with HMR
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally
- `npm run lint` — run ESLint over the repo

There is no test runner configured.

## Architecture

Vaulted is a single-page React 19 + Vite 8 app for tattoo artists to manage their studio (bookings, clients, consent forms, payments, portfolio). All data and auth go through Supabase — there is no separate backend.

### App shell

- `src/main.jsx` mounts `<App />`.
- `src/App.jsx` is the auth gate: it subscribes to `supabase.auth.onAuthStateChange` and renders either the login/signup card or `<Dashboard />` based on session presence.
- `src/pages/Dashboard.jsx` owns the persistent sidebar + main content area. There is **no router** — page switching is done with an `activePage` string state and a chain of `activePage === "..." && <Page />` conditionals. When adding a page: add a nav entry to `navItems`, import the component, and add another conditional render.

### Supabase client & data model

- `src/supabase.js` exports a single `supabase` client. **The publishable key is hardcoded in this file** (not read from env vars) — keep that in mind when changing environments.
- Every page follows the same pattern: on mount, call `supabase.auth.getUser()`, then query a table filtered by `artist_id = user.id`. Writes always include `artist_id: user.id`. This is the per-artist tenancy model — assume Supabase RLS enforces it server-side.
- Tables in use: `clients`, `bookings`, `consent_forms`, `payments`, `portfolio_items`, `artist_profiles`. Portfolio images upload to the `portfolio` storage bucket under `${user.id}/${timestamp}.${ext}` before the row is inserted with the public URL.
- Business logic quirks to preserve: `Bookings` auto-computes `deposit = price * 0.2` on insert; `consent_forms` requires `age_verified`, `design_approved`, and `aftercare_acknowledged` before submit and stamps `signed_at`; `payments.type` is `"deposit" | "final"` and the Payments page derives revenue splits by filtering on that.

### Styling

Every component defines a local `const styles = { ... }` object and applies it via inline `style={}`. There is no CSS-in-JS library, no Tailwind, and `App.css`/`index.css` are near-empty. The visual language is fixed: dark background (`#0a0a0a` / `#0d0d0d`), 1px `#1a1a1a`–`#1e1e1e` borders, gold accent `#d4a843`, `Playfair Display` for headings and `DM Sans` for body. Match this palette and font pairing when adding UI.

### Icons

`lucide-react` — imported per-component. Note `Image` is imported as a Lucide icon in Dashboard; alias it (`Image as ImageIcon`, as Portfolio does) if you also need the DOM `Image`.

---

# Development Philosophy

Vaulted is not simply a CRUD application for tattoo studios.

The long-term vision is to become the operating system for modern tattoo artists and studios by providing an elegant, reliable, and premium experience across every touchpoint.

Every feature, refactor, and UI decision should reinforce this vision.

---

# Product Principles

When proposing or implementing features, prioritize:

- Simplicity over complexity.
- Quality over quantity.
- User trust over cleverness.
- Premium experience over unnecessary features.
- Long-term maintainability over short-term convenience.

If a proposed feature increases complexity without significantly improving the user experience, suggest a simpler alternative.

---

# Design Philosophy

Vaulted should continuously evolve toward a world-class product experience.

Claude is encouraged to:

- Improve UI consistency.
- Improve UX flows whenever opportunities are identified.
- Reduce unnecessary clicks and friction.
- Improve information hierarchy.
- Improve spacing, typography, alignment, and accessibility.
- Suggest thoughtful animations and micro-interactions where appropriate.
- Improve responsiveness across desktop, tablet, and mobile.

Do not redesign interfaces simply for visual novelty.

Every UI change should have a clear usability reason.

---

# Design Inspiration

When evaluating UI and UX quality, draw inspiration from products such as:

- Linear
- Notion
- Stripe Dashboard
- Raycast
- Arc Browser

Do not copy their appearance directly.

Instead, emulate their:

- clarity
- polish
- responsiveness
- consistency
- attention to detail

---

# Engineering Standards

When implementing changes:

- Keep components modular.
- Prefer readable code over clever code.
- Avoid unnecessary dependencies.
- Minimize duplication.
- Preserve backwards compatibility unless instructed otherwise.
- Explain architectural changes before implementing them.

For substantial changes, prefer updating complete files rather than fragmented code snippets.

---

# Database Standards

The `artist_id` ownership model is a core security requirement.

Never remove, bypass, or weaken artist data isolation without explicit instruction.

When making database changes:

- preserve existing data
- avoid destructive migrations
- explain migration strategies before implementation

---

# Code Review Standards

Before implementing significant changes:

1. Explain the proposed approach.
2. Mention advantages and trade-offs.
3. Identify possible edge cases.
4. Ask for confirmation when changes affect architecture or user workflows.

---

# Documentation

Whenever a feature changes significantly:

- update documentation
- keep naming consistent
- avoid stale comments
- ensure new developers can understand the implementation

---

# Communication Style

When working with this repository:

- Be concise.
- Be technically accurate.
- Explain reasoning when making important decisions.
- Challenge weak architectural decisions respectfully.
- Suggest better alternatives when appropriate.

Do not agree with decisions solely because they were requested.

Act like a senior software engineer helping build a world-class SaaS product.

---

# Continuous Improvement

Whenever appropriate, proactively identify opportunities to improve:

- performance
- scalability
- accessibility
- developer experience
- security
- maintainability
- user experience

Explain why the improvement is valuable before implementing it.