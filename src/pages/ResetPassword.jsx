import { useState } from "react"
import { supabase } from "../supabase"
import { Lock } from "lucide-react"

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setMessage("Couldn't update password: " + error.message)
    } else {
      setMessage("Password updated! Redirecting...")
      setTimeout(onDone, 1500)
    }
  }

  return (
    <div style={styles.wrap}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h2 style={styles.cardTitle}>Set a new password</h2>

        <div style={styles.inputWrapper}>
          <Lock size={16} color="var(--text-tertiary)" style={styles.inputIcon} />
          <input
            style={styles.input}
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </div>

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Updating..." : "Update password"}
        </button>

        {message && <p style={styles.message}>{message}</p>}
      </form>
    </div>
  )
}

const styles = {
  wrap: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg-primary)" },
  card: { width: "100%", maxWidth: "400px", padding: "0 40px" },
  cardTitle: { fontFamily: "'Playfair Display', serif", color: "var(--text-primary)", fontSize: "28px", margin: "0 0 32px 0" },
  inputWrapper: { position: "relative", marginBottom: "16px" },
  inputIcon: { position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" },
  input: { width: "100%", padding: "13px 16px 13px 42px", background: "var(--bg-tertiary)", border: "1px solid var(--border-secondary)", borderRadius: "10px", color: "var(--text-primary)", fontSize: "16px", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" },
  button: { width: "100%", padding: "14px", marginTop: "8px", background: "var(--accent-gold)", border: "none", borderRadius: "10px", color: "var(--text-on-accent)", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px" },
  message: { marginTop: "16px", color: "var(--accent-gold)", fontSize: "13px", textAlign: "center" },
}