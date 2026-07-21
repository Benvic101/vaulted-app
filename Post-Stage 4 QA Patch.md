# Post-Stage 4 QA Patch — Mobile Link Sharing & Clipboard Reliability

Objective:

During real-device testing (Android phone), two issues were discovered in the
Consent Forms "Link Ready" screen that were not apparent during desktop
development.

These should be treated as a focused QA patch—not a redesign.

The goal is to make the sharing experience fully responsive and reliable on
mobile devices.

---

## Real Device Findings

### Issue 1 — Responsive Layout

On narrow screens, the generated signing link and the "Copy" button overflow
their container.

The rest of the application responds correctly, but this specific row does not.

This creates horizontal overflow and breaks the otherwise polished mobile
experience.

---

### Issue 2 — Copy Button

On an actual Android device, tapping "Copy" does nothing.

There is:

- no copied text
- no success feedback
- no error feedback

The feature appears broken to the user.

This was tested against the local development server running on:

http://192.168.xxx.xxx:5173

Do not assume this is purely an HTTP restriction.

Investigate the implementation before changing it.

---

## BEFORE WRITING ANY CODE

First inspect the implementation.

Determine:

1.

How is the "Link Ready" row currently laid out?

Specifically inspect:

- flex settings
- width
- min-width
- flex-grow
- flex-shrink
- overflow rules

Explain why it overflows on mobile.

Do not guess.

2.

Inspect the Copy button implementation.

Determine:

- how clipboard copying currently works
- whether navigator.clipboard.writeText() is used
- whether errors are caught
- whether a fallback exists
- whether user feedback exists

Explain why copying fails on the tested Android device.

---

## Layout Requirements

The link sharing section must remain fully usable on:

- 390px phones
- 430px phones
- tablets
- desktop

No horizontal scrolling.

No clipped controls.

No overflowing text.

Preferred approaches include:

Option A

URL field expands while Copy button remains fixed width.

OR

Option B

Stack vertically on small screens:

[ URL ]

[ Copy Link ]

Choose whichever produces the better UX while remaining consistent with
Vaultted's design language.

Explain your choice before implementation.

---

## Clipboard Requirements

The Copy action should feel reliable.

Requirements:

- successful copies should provide immediate user feedback
- failures should provide clear feedback
- do not fail silently

If navigator.clipboard is unavailable or rejected:

- explain why
- provide an appropriate fallback if reasonable
- otherwise present a helpful error message

Do not hide failures.

---

## UX Requirements

The artist should immediately know whether the link was copied.

Examples include:

- temporary success message
- toast notification
- button state change

Remain consistent with Vaultted's existing UI.

Do not introduce a new notification system solely for this feature.

---

## Constraints

Do NOT redesign the Consent Forms page.

Do NOT modify unrelated screens.

Do NOT introduce new dependencies.

Do NOT change the design language.

Keep this patch narrowly focused on:

- responsive link sharing
- clipboard reliability
- user feedback

---

## Verification

After implementing:

Explain:

- what caused the responsive overflow
- what caused the clipboard issue
- whether it was browser-specific or implementation-specific
- how it was fixed

Confirm:

- no horizontal overflow remains
- copying succeeds where supported
- failures are communicated clearly
- build succeeds
- lint introduces no new issues

Wait for approval before implementing if architectural changes are required.