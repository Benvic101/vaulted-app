import { useState, useEffect, useRef } from "react"
import { AlertTriangle } from "lucide-react"

// Typed-confirmation delete dialog. Deliberately NOT a general replacement
// for the window.confirm pattern used by Bookings/Clients/Payments/Portfolio
// — those stay as they are. This exists because window.confirm cannot ask the
// artist to type anything, and deleting a *signed* consent form is the one
// destructive action in the app where a reflexive "OK" click is too cheap:
// it destroys a client's signature and health declaration with legal weight.
//
// The confirmation phrase is the client's name (case-insensitive, trimmed —
// we want deliberate acknowledgement, not a typing test).
export default function ConfirmDeleteDialog({
  clientName,
  onCancel,
  onConfirm,
  busy = false,
}) {
  const [typed, setTyped] = useState("")
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [busy, onCancel])

  const matches =
    typed.trim().toLowerCase() === (clientName ?? "").trim().toLowerCase() &&
    typed.trim() !== ""

  return (
    <div
      style={styles.overlay}
      onClick={() => { if (!busy) onCancel() }}
      role="presentation"
    >
      <div
        style={styles.card}
        className="vlt-confirm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vlt-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.iconBox}>
          <AlertTriangle size={20} color="#8b1a1a" />
        </div>

        <h2 id="vlt-confirm-title" style={styles.title}>
          Delete a signed consent form?
        </h2>

        <p style={styles.body}>
          This permanently destroys {clientName}'s signature, health declaration
          and consent record. It cannot be undone and there is no backup copy.
        </p>
        <p style={styles.warning}>
          A signed consent form is your record that this client agreed to the
          procedure. Deleting it may have legal or liability consequences, and
          your local health-authority rules may require you to retain it.
        </p>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="vlt-confirm-input">
            Type <span style={styles.nameHint}>{clientName}</span> to confirm
          </label>
          <input
            id="vlt-confirm-input"
            ref={inputRef}
            style={styles.input}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={clientName}
            autoComplete="off"
            disabled={busy}
          />
        </div>

        <div style={styles.actions} className="vlt-confirm-actions">
          <button
            type="button"
            style={styles.cancelBtn}
            onClick={onCancel}
            disabled={busy}
          >
            Keep form
          </button>
          <button
            type="button"
            style={{
              ...styles.deleteBtn,
              opacity: matches && !busy ? 1 : 0.4,
              cursor: matches && !busy ? "pointer" : "not-allowed",
            }}
            onClick={onConfirm}
            disabled={!matches || busy}
          >
            {busy ? "Deleting..." : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(5,5,5,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 200,
  },
  card: {
    width: "100%",
    maxWidth: "440px",
    background: "#0d0d0d",
    border: "1px solid #1e1e1e",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    boxSizing: "border-box",
    fontFamily: "'DM Sans', sans-serif",
  },
  iconBox: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "rgba(139,26,26,0.08)",
    border: "1px solid rgba(139,26,26,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    color: "#f5f5f5",
    fontSize: "20px",
    margin: 0,
    fontWeight: "600",
  },
  body: { color: "#999", fontSize: "14px", margin: 0, lineHeight: "1.6" },
  warning: {
    color: "#b06a6a",
    fontSize: "13px",
    margin: 0,
    lineHeight: "1.6",
    background: "rgba(139,26,26,0.06)",
    border: "1px solid rgba(139,26,26,0.15)",
    borderRadius: "8px",
    padding: "12px 14px",
  },
  field: { display: "flex", flexDirection: "column", gap: "8px", marginTop: "2px" },
  label: { fontSize: "12px", color: "#666", letterSpacing: "0.3px" },
  nameHint: { color: "#f5f5f5", fontWeight: "600" },
  input: {
    width: "100%",
    padding: "12px 16px",
    background: "#141416",
    border: "1px solid #1a1a1a",
    borderRadius: "8px",
    color: "#f5f5f5",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "'DM Sans', sans-serif",
  },
  actions: { display: "flex", gap: "10px", marginTop: "4px" },
  cancelBtn: {
    flex: 1,
    padding: "13px",
    background: "transparent",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    color: "#f5f5f5",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  deleteBtn: {
    flex: 1,
    padding: "13px",
    background: "#8b1a1a",
    border: "none",
    borderRadius: "8px",
    color: "#f5f5f5",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "'DM Sans', sans-serif",
  },
}
