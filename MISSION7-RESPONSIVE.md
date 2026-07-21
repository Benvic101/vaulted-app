# # MISSION 7 — Responsive Foundation

Objective:

Vaulted currently assumes the user is sitting in front of a large desktop
monitor.

The sidebar is permanently fixed at approximately 240px, page layouts rely on
wide multi-column grids, and many screens become unusable below tablet sizes.

This is a critical launch blocker.

Tattoo artists frequently work:

- behind the tattoo chair
- between appointments
- while travelling
- during conventions
- using phones and tablets

Vaulted should feel intentionally designed for those environments—not merely
"desktop squeezed onto a phone."

The goal of this mission is to build a responsive foundation that every future
feature can inherit.

This is an architectural improvement—not a cosmetic one.

---

## Architecture

This mission should establish layout primitives that future features inherit.

Examples may include:

- responsive page container
- responsive content wrapper
- reusable grid helpers
- responsive card layouts

Do not create an entirely new design system.
If a shared layout file (e.g. layout.js) is introduced, its purpose is 
deduplication — not abstraction. If a style is duplicated across multiple 
pages, it belongs there. If it is unique to one page, it should remain 
local. Avoid creating generic primitives that add indirection without 
reducing maintenance. The goal is fewer repeated layout definitions — 
not a new styling framework.

Instead strengthen the existing one.

Explain any proposed abstractions before implementation.

---

## BEFORE WRITING ANY CODE

Before making changes, inspect the current layout implementation.

Determine:

1.

How is the application shell currently structured?

Specifically identify:

- sidebar implementation
- main content wrapper
- page container
- width calculations
- fixed positioning
- marginLeft usage
- overflow behavior

2.

Identify every screen that currently relies on fixed-width layouts.

Examples include:

- Dashboard
- Bookings
- Clients
- Consent Forms
- Payments
- Portfolio
- Settings

Explain which layouts will naturally collapse
and which require redesign.

3.

Audit the current style system.

Determine:

- repeated layout patterns
- duplicated spacing values
- duplicated card widths
- duplicated grid definitions

Explain whether introducing a small shared layout utility
would reduce future maintenance while remaining consistent with the current
inline-style architecture.

Do NOT replace the styling system.

Improve it.

4.

Explain your responsive breakpoint strategy before implementation.

Do not simply add random media queries.

Describe:

- mobile breakpoint
- tablet breakpoint
- desktop breakpoint

Explain why those values were chosen.

---

## Design Philosophy

Responsive should never mean:

"Everything gets smaller."

Responsive should mean:

"The interface adapts to the user's context."

Desktop users optimize for information density.

Mobile users optimize for speed.

Tablet users often sit somewhere between.

Design accordingly.

---

## Navigation

The current desktop sidebar works well on larger screens.

Do NOT remove it.

Instead propose an adaptive navigation system.

Recommended approach:

Desktop
- Permanent left sidebar

Tablet
- Collapsible sidebar

Mobile
- Bottom navigation bar
or
- Slide-out navigation drawer

Before implementing, explain which approach you recommend and why.

The decision should prioritize:

- speed
- discoverability
- thumb reach
- consistency

over visual novelty.

---

## Dashboard

Audit the Dashboard specifically.

Determine how each section should behave responsively.

Examples:

Desktop

Four KPI cards in a row.

Tablet

Two by two grid.

Mobile

Single-column stack.

Quick Actions should remain easy to reach with one thumb.

Today's Appointments should become the primary focus rather than being pushed
far below the fold.

Explain your proposed hierarchy before implementation.

---

## Forms

Every form throughout Vaulted should remain comfortable on mobile.

Audit:

- Bookings
- Clients
- Consent Forms
- Payments
- Portfolio
- Settings

Consider:

- field widths
- label spacing
- touch targets
- keyboard behavior
- scrolling

Avoid horizontal scrolling entirely.

Buttons should remain easy to tap.

---

## Lists & Cards

Audit every list view.

Determine how each should adapt.

For example:

Desktop

Cards may appear side-by-side where appropriate.

Tablet

Reduced columns.

Mobile

Single-column vertical flow.

Never force horizontal scrolling for core workflows.

---

## Typography

Do not simply shrink text.

Instead establish a responsive typography scale.

Maintain hierarchy while improving readability.

Playfair Display should continue to feel elegant.

DM Sans should remain highly legible.

Explain any typography adjustments before implementation.

---

## Spacing

Audit spacing throughout the application.

Determine where spacing should adapt between:

Desktop

Tablet

Mobile

Avoid interfaces that feel cramped simply because everything was compressed.

Whitespace should remain intentional.

---

## Touch Experience

This application is expected to be used with fingers—not just a mouse.

Audit:

- button sizes
- spacing between actions
- tap targets
- scroll behavior

Interactive controls should comfortably meet modern touch guidelines.

Avoid tiny click targets.

---

## Performance

Responsive improvements should not significantly increase runtime complexity.

Prefer CSS layout techniques over JavaScript layout calculations.

Avoid unnecessary resize listeners.

Explain any exceptions.

---

## Accessibility

Responsiveness should improve accessibility—not reduce it.

Consider:

- focus order
- keyboard navigation
- zoom support
- landscape orientation
- screen readers

Maintain proper visual hierarchy across every breakpoint.

---


## Constraints

Do NOT redesign Vaultted.

Do NOT replace inline styles.

Do NOT introduce Tailwind.

Do NOT introduce CSS Modules.

Do NOT migrate to another UI framework.

Do NOT introduce React Router.

Remain consistent with the existing architecture.

The objective is improving adaptability—not rebuilding the application.

---

## Success Criteria

A tattoo artist should be able to comfortably perform every core workflow on:

- desktop
- laptop
- tablet
- large phone
- standard phone

without layout breakage.

Every screen should feel intentionally designed for its device—not merely
scaled.

Future features should inherit the responsive foundation established in this
mission.

---
## Technical Confirmations Required

Before implementing, explicitly confirm:
- Wherever a property becomes breakpoint-controlled via new CSS classes, 
  the old hardcoded value for that exact property is removed from that 
  page's local inline style object — not left in place to silently 
  override the class.
- The approach does not block pinch-to-zoom (no maximum-scale=1 in any 
  viewport meta tag), and no layout relies on a fixed height that would 
  break in landscape orientation on mobile.


## Before Implementing

Explain:

- the responsive strategy
- breakpoint philosophy
- navigation approach
- layout architecture
- files expected to change
- any reusable layout primitives you recommend introducing

Wait for approval before writing any code.

Given this mission's scope is significantly larger than previous ones 
(touches all 8 pages plus the app shell, vs. 1-3 files previously), 
after I approve your overall strategy, implement and report back in 
stages rather than all at once — e.g.: (1) shared primitives + 
navigation/sidebar first, (2) Dashboard, (3) list/form pages as a group. 
I'll test and confirm each stage before you proceed to the next.

---Explicitly declare this as an Architectural Mission
This mission establishes the responsive foundation for the remainder of the
project.

Every future screen—including Calendar, Client Detail improvements,
Consent v2, Studio Profiles, Analytics, and future features—should inherit
the layout system introduced here.

Do not optimize only the current screens.

Optimize the architecture future screens will build upon.

---

## Definition of Done
Apply this checklist after EACH implementation stage, not only once at 
the very end — catching a regression after Stage 1 is far cheaper than 
after Stage 4.

This mission is complete only if:

✓ No horizontal scrolling exists anywhere in the application.

✓ Every page functions correctly on:
- 390px phones
- 768px tablets
- 1024px laptops
- large desktop monitors

✓ Navigation adapts appropriately for every breakpoint.

✓ Forms remain comfortable to complete using touch.

✓ Existing desktop users experience no regression.

✓ Future screens can inherit the responsive foundation without additional
layout work.


---

## Regression Prevention

Desktop is currently the primary experience.

Responsive improvements must preserve:

- existing spacing
- existing typography hierarchy
- existing interactions
- existing navigation behavior
- existing visual identity

The desktop experience should feel unchanged except where an improvement is
intentional.

Responsiveness should be additive—not destructive.