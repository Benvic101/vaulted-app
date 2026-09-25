export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger = false }) {
  if (!open) return null

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>{title}</h3>
        {message && <p style={styles.message}>{message}</p>}
        <div style={styles.actions}>
          <button type="button" style={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button
            type="button"
            style={danger ? styles.confirmBtnDanger : styles.confirmBtn}
            onClick={onConfirm}
          >
            {danger ? "Delete" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, background: "var(--overlay-bg)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "var(--bg-secondary)", border: "1px solid var(--border-secondary)", borderRadius: "12px",
    padding: "28px", width: "100%", maxWidth: "360px",
    fontFamily: "'DM Sans', sans-serif",
  },
  title: {
    fontFamily: "'Playfair Display', serif", color: "var(--text-primary)",
    fontSize: "18px", margin: "0 0 10px 0", fontWeight: "500",
  },
  message: { color: "var(--text-secondary)", fontSize: "13px", margin: "0 0 24px 0", lineHeight: "1.5" },
  actions: { display: "flex", justifyContent: "flex-end", gap: "10px" },
  cancelBtn: {
    padding: "10px 18px", background: "transparent", border: "1px solid var(--border-tertiary)",
    borderRadius: "8px", color: "var(--text-primary)", fontSize: "13px", cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  confirmBtn: {
    padding: "10px 18px", background: "var(--accent-gold)", border: "none",
    borderRadius: "8px", color: "var(--text-on-accent)", fontSize: "13px", fontWeight: "600",
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  confirmBtnDanger: {
    padding: "10px 18px", background: "var(--danger-primary)", border: "none",
    borderRadius: "8px", color: "var(--text-primary)", fontSize: "13px", fontWeight: "600",
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
}