import { useState } from "react"
import { supabase } from "../supabase"
import { Mail } from "lucide-react"

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    setMessage(error ? "Something went wrong: " + error.message : "Check your email for a reset link.")
  }

  return (
    <form style={styles.card} onSubmit={handleSubmit}>
      <h2 style={styles.cardTitle}>Reset password</h2>
      <p style={styles.cardSubtitle}>We'll email you a link to set a new one</p>

      <div style={styles.inputWrapper}>
        <Mail size={16} color="var(--text-tertiary)" style={styles.inputIcon} />
        <input
          style={styles.input}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>

      <button type="submit" style={styles.button} disabled={loading}>
        {loading ? "Sending..." : "Send reset link"}
      </button>

      {message && <p style={styles.message}>{message}</p>}

      <button type="button" onClick={onBack} style={styles.backLink}>
        ← Back to sign in
      </button>
    </form>
  )
}

const styles = {
  card: { width: "100%", maxWidth: "400px" },
  cardTitle: { fontFamily: "'Playfair Display', serif", color: "var(--text-primary)", fontSize: "32px", margin: "0 0 8px 0" },
  cardSubtitle: { color: "var(--text-tertiary)", fontSize: "14px", margin: "0 0 32px 0" },
  inputWrapper: { position: "relative", marginBottom: "16px" },
  inputIcon: { position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" },
  input: { width: "100%", padding: "13px 16px 13px 42px", background: "var(--bg-tertiary)", border: "1px solid var(--border-secondary)", borderRadius: "10px", color: "var(--text-primary)", fontSize: "16px", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" },
  button: { width: "100%", padding: "14px", marginTop: "8px", background: "var(--accent-gold)", border: "none", borderRadius: "10px", color: "var(--text-on-accent)", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px" },
  message: { marginTop: "16px", color: "var(--accent-gold)", fontSize: "13px", textAlign: "center" },
  backLink: { background: "transparent", border: "none", color: "var(--text-tertiary)", fontSize: "13px", cursor: "pointer", padding: 0, marginTop: "20px" },
}