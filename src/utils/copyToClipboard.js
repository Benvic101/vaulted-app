// Tiered copy-to-clipboard, shared by every "copy a link" action in the app.
// Tier 1: async Clipboard API — secure contexts (HTTPS or localhost) only;
// guarded rather than trusted because some browsers expose the object but
// reject on insecure origins. Tier 2: deprecated-but-still-working
// execCommand('copy') on a hidden textarea, which does work over plain-HTTP
// LAN (e.g. phone testing against a dev server) as long as it runs inside
// the click handler; its boolean return is checked explicitly since it
// reports failure by returning false, not by throwing.
//
// Returns one of three mutually exclusive outcomes so callers can give
// distinct feedback for each:
//   "copied" — clipboard write succeeded
//   "manual" — automatic copy unavailable; fallbackEl (a DOM element whose
//              contents are the link text) has been pre-selected so the user
//              only has to long-press/Ctrl+C. Omit fallbackEl when there is
//              no visible link text (e.g. copying from a list-row button).
//   "failed" — nothing worked; the caller should tell the user to copy
//              manually wherever they can see the link.
export async function copyToClipboard(text, fallbackEl = null) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return "copied"
    }
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(textarea)
    if (ok) return "copied"
  } catch {
    // fall through to manual-select below
  }
  if (fallbackEl) {
    // Manual-select tier: highlight the full URL for the user. The element is
    // often ellipsis-truncated, so the highlight may show on the clipped
    // portion, but the selection (and anything copied from it) is the full link.
    try {
      const range = document.createRange()
      range.selectNodeContents(fallbackEl)
      const selection = window.getSelection()
      selection.removeAllRanges()
      selection.addRange(range)
      return "manual"
    } catch {
      // fall through
    }
  }
  return "failed"
}
