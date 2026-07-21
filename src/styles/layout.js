// Shared inline-style fragments — deduplication only, not a new styling
// system (Mission 7). Every value here was copy-pasted near-identically
// across at least three pages before this file existed. Anything that
// differs per page (even slightly) stays local to that page instead of
// being forced into a shared shape here.
//
// Page container padding and min-height are intentionally NOT included —
// they're breakpoint-controlled via the `.vlt-page-shell` CSS class in
// index.css instead, since inline styles can't express media queries.
// See that class for why.

export const container = {
  fontFamily: "'DM Sans', sans-serif",
  color: "#f5f5f5",
  background: "#0a0a0a",
}

export const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  marginBottom: "24px",
}

export const headerSub = {
  color: "#6b6b6b",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "1px",
  margin: "0 0 6px 0",
}

export const headerTitle = {
  fontFamily: "'Playfair Display', serif",
  fontSize: "32px",
  margin: 0,
  fontWeight: "600",
}

export const divider = {
  height: "1px",
  background: "#1a1a1a",
  marginBottom: "40px",
}

// gridTemplateColumns is intentionally omitted — owned by the
// `.vlt-form-grid` CSS class (2 columns desktop/tablet, 1 mobile).
export const formGrid = {
  display: "grid",
  gap: "20px",
}

export const field = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
}

export const label = {
  fontSize: "12px",
  color: "#555",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
}

export const inputWrapper = { position: "relative" }

export const inputIcon = {
  position: "absolute",
  left: "14px",
  top: "50%",
  transform: "translateY(-50%)",
}

// `background` is deliberately left out — it genuinely differs between
// pages today (#0f0f10 vs #141416), so forcing one value here would be
// an uncommunicated visual change. Each page supplies its own.
// fontSize is 16px (not the old 14px) to prevent iOS Safari's
// auto-zoom-on-focus for any input under 16px — a real mobile bug fix,
// not a breakpoint-conditional value, so it's just changed outright.
export const input = {
  width: "100%",
  padding: "12px 16px 12px 40px",
  border: "1px solid #1a1a1a",
  borderRadius: "8px",
  color: "#f5f5f5",
  fontSize: "16px",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "'DM Sans', sans-serif",
}

export const button = {
  padding: "13px",
  background: "#c9974a",
  border: "none",
  borderRadius: "8px",
  color: "#0a0a0a",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
}

export const newBtn = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 20px",
  background: "#c9974a",
  border: "none",
  borderRadius: "8px",
  color: "#0a0a0a",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
}

export const message = {
  color: "#c9974a",
  fontSize: "13px",
  textAlign: "center",
  margin: 0,
}

export const emptyState = {
  background: "#0f0f10",
  border: "1px solid #1a1a1a",
  borderRadius: "12px",
  padding: "60px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "16px",
}

export const emptyText = {
  color: "#5c5c5c",
  fontSize: "14px",
  margin: 0,
}

// padding intentionally omitted — owned by the `.vlt-icon-btn` CSS class
// (6px desktop, 12px tablet/mobile — a real touch-target fix, since 6px
// padding around a 14px icon is well under the ~44px guideline).
export const iconBtn = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  borderRadius: "6px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

// flexDirection/marginLeft intentionally omitted — owned by the
// `.vlt-card-actions` CSS class (column+offset desktop, row+top-margin
// mobile, matching the card row's own stack-on-mobile behavior).
export const rowActions = {
  display: "flex",
  gap: "4px",
}
