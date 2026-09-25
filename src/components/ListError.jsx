import { AlertTriangle, RotateCcw } from "lucide-react"

// Shared inline error state for failed list fetches (Mission 10).
// Rendering this instead of the empty state is what distinguishes
// "request failed" from "genuinely nothing yet" across the app.
export default function ListError({ message, onRetry, styles = {} }) {
  return (
    <div style={{ ...base.box, ...styles.box }}>
      <AlertTriangle size={18} color="var(--danger-secondary)" style={{ flexShrink: 0 }} />
      <p style={{ ...base.text, ...styles.text }}>
        {message || "Something went wrong while loading."}
      </p>
      {onRetry && (
        <button
          type="button"
          style={{ ...base.retryBtn, ...styles.retryBtn }}
          onClick={onRetry}
        >
          <RotateCcw size={13} /> Try again
        </button>
      )}
    </div>
  )
}

const base = {
  box: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    background: "var(--danger-bg)",
    border: "1px solid var(--danger-border)",
    borderRadius: "10px",
    padding: "16px 20px",
  },
  text: {
    color: "var(--danger-secondary)",
    fontSize: "13px",
    margin: 0,
    flex: 1,
    minWidth: "200px",
    lineHeight: "1.5",
  },
  retryBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "transparent",
    border: "1px solid var(--danger-border)",
    borderRadius: "6px",
    padding: "6px 12px",
    color: "var(--danger-secondary)",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    flexShrink: 0,
  },
}
