# Mission 8: Clipboard Copy Fallback for Consent Link

## Context
The "Link ready" Copy button in ConsentForms uses the Clipboard API 
(navigator.clipboard.writeText), which requires a secure context 
(HTTPS or localhost). When tested on a real Android device over LAN 
HTTP, the copy silently fails — no error, no feedback, button just 
does nothing.

## Goal
Make the Copy button work regardless of secure-context, with graceful 
degradation and honest user feedback either way.

## Requirements
1. Investigate the current Copy button implementation in ConsentForms.jsx 
   (or wherever it lives) before proposing changes.
2. Detect whether navigator.clipboard is available and whether the write 
   actually succeeds (wrap in try/catch — some browsers expose the API 
   but throw on insecure contexts).
3. If it fails or isn't available, fall back to:
   - document.execCommand('copy') on a temporary/hidden text node, OR
   - if that also fails, visibly select the link text and show a 
     "select the link above and copy manually" message
   (Investigate current browser support for execCommand before committing 
   to it as the fallback — flag if it's unreliable enough to skip straight 
   to the manual-select fallback.)
4. Give clear, distinct user feedback for: copy succeeded, copy fell back 
   to manual-select, copy failed entirely. Don't silently do nothing in 
   any case.
5. Keep it consistent with the existing dark/gold design system and 
   Mission 7's responsive conventions.

## Out of scope
- Don't touch the mobile overflow fix from the last mission.
- Don't set up local HTTPS dev (mkcert etc.) — that's a separate, optional 
  follow-up for Ben's own testing convenience, not app code.

## Process
Investigate the real code first, propose your approach, wait for my 
approval, then implement. Report back with what changed and file/line 
references.