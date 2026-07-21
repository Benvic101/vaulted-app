import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import Dashboard from "./pages/Dashboard"
import { Mail, Lock, Palette } from "lucide-react"
import logo from "./assets/logo.png"

export default function App() {
  const [session, setSession] = useState(undefined)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleAuth = async (e) => {
    e?.preventDefault?.()
    setLoading(true)
    setMessage("")
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage("Account created! Check your email to confirm. ✅")
    }
    setLoading(false)
  }

  if (session === undefined) {
    return (
      <div style={styles.bootGate} className="vlt-full-height">
        <img
          src={logo}
          alt="Vaulted"
          style={styles.bootLogo}
        />
        <span style={styles.bootBrand}>Vaulted</span>
      </div>
    )
  }

  if (session) return <Dashboard />

  return (
    <div style={styles.container} className="vlt-full-height">
      <div style={styles.left} className="vlt-auth-left">
        <div style={styles.leftContent}>
          <div style={styles.brandRow}>
            <img
  src={logo}
  alt="Vaulted"
  style={{
    width: "40px",
    height: "40px",
    objectFit: "cover",
    borderRadius: "50%",
    border: "1px solid #1e1e1e",
  }}
/>
            <h1 style={styles.brandName}>Vaulted</h1>
          </div>
          <h2 style={styles.tagline}>Your Studio,<br />refined for artists.</h2>
          <p style={styles.taglineSub}>Bookings, clients, consent forms and payments — all in one place.</p>
          <div style={styles.features}>
            {["Digital consent forms", "Deposit collection", "Client profiles", "Revenue tracking"].map(f => (
              <div key={f} style={styles.featureItem}>
                <div style={styles.featureDot} />
                <span style={styles.featureText}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.right} className="vlt-auth-right">
        <form style={styles.card} onSubmit={handleAuth}>
          <div style={styles.mobileBrandRow} className="vlt-auth-brand-mobile">
            <img src={logo} alt="Vaulted" style={styles.mobileBrandLogo} />
            <span style={styles.mobileBrandName}>Vaulted</span>
          </div>
          <h2 style={styles.cardTitle}>{isLogin ? "Welcome back" : "Create account"}</h2>
          <p style={styles.cardSubtitle}>{isLogin ? "Sign in to your studio" : "Start managing your studio"}</p>

          <div style={styles.tabs}>
            <button type="button" style={isLogin ? styles.tabActive : styles.tab} onClick={() => setIsLogin(true)}>Login</button>
            <button type="button" style={!isLogin ? styles.tabActive : styles.tab} onClick={() => setIsLogin(false)}>Sign Up</button>
          </div>

          <div style={styles.inputWrapper}>
            <Mail size={16} color="#6b6b6b" style={styles.inputIcon} />
            <input
              style={styles.input}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div style={styles.inputWrapper}>
            <Lock size={16} color="#6b6b6b" style={styles.inputIcon} />
            <input
              style={styles.input}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </button>

          {message && <p style={styles.message}>{message}</p>}
        </form>
      </div>
    </div>
  )
}

const styles = {
  bootGate: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    background: "#0a0a0a",
    fontFamily: "'DM Sans', sans-serif",
  },
  bootLogo: {
    width: "48px",
    height: "48px",
    objectFit: "cover",
    borderRadius: "50%",
    border: "1px solid #1e1e1e",
    opacity: 0.9,
  },
  bootBrand: {
    fontFamily: "'Playfair Display', serif",
    color: "#f5f5f5",
    fontSize: "20px",
    letterSpacing: "1px",
    opacity: 0.7,
  },
  container: {
    display: "flex",
    background: "#0a0a0a",
    fontFamily: "'DM Sans', sans-serif",
  },
  left: {
    flex: 1,
    background: "linear-gradient(135deg, #0a0a0a 0%, #141416 100%)",
    borderRight: "1px solid #1e1e1e",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px",
  },
  leftContent: {
    maxWidth: "420px",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "48px",
  },
  brandName: {
    fontFamily: "'Playfair Display', serif",
    color: "#f5f5f5",
    fontSize: "28px",
    margin: 0,
    letterSpacing: "1px",
  },
  tagline: {
    fontFamily: "'Playfair Display', serif",
    color: "#f5f5f5",
    fontSize: "42px",
    lineHeight: "1.2",
    margin: "0 0 20px 0",
    fontWeight: "600",
  },
  taglineSub: {
    color: "#666",
    fontSize: "16px",
    lineHeight: "1.6",
    margin: "0 0 40px 0",
  },
  features: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  featureDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#c9974a",
    flexShrink: 0,
  },
  featureText: {
    color: "#888",
    fontSize: "15px",
  },
  right: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 40px",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
  },
  mobileBrandRow: {
    alignItems: "center",
    gap: "10px",
    marginBottom: "32px",
  },
  mobileBrandLogo: {
    width: "32px",
    height: "32px",
    objectFit: "cover",
    borderRadius: "50%",
    border: "1px solid #1e1e1e",
  },
  mobileBrandName: {
    fontFamily: "'Playfair Display', serif",
    color: "#f5f5f5",
    fontSize: "20px",
    letterSpacing: "1px",
  },
  cardTitle: {
    fontFamily: "'Playfair Display', serif",
    color: "#f5f5f5",
    fontSize: "32px",
    margin: "0 0 8px 0",
  },
  cardSubtitle: {
    color: "#666",
    fontSize: "14px",
    margin: "0 0 32px 0",
  },
  tabs: {
    display: "flex",
    background: "#141416",
    borderRadius: "10px",
    padding: "4px",
    marginBottom: "24px",
    border: "1px solid #1e1e1e",
  },
  tab: {
    flex: 1,
    padding: "10px",
    border: "none",
    background: "transparent",
    color: "#666",
    cursor: "pointer",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
  },
  tabActive: {
    flex: 1,
    padding: "10px",
    border: "none",
    background: "#c9974a",
    color: "#0a0a0a",
    cursor: "pointer",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "'DM Sans', sans-serif",
  },
  inputWrapper: {
    position: "relative",
    marginBottom: "16px",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)",
  },
  input: {
    width: "100%",
    padding: "13px 16px 13px 42px",
    background: "#141416",
    border: "1px solid #1e1e1e",
    borderRadius: "10px",
    color: "#f5f5f5",
    fontSize: "16px",
    boxSizing: "border-box",
    fontFamily: "'DM Sans', sans-serif",
  },
  button: {
    width: "100%",
    padding: "14px",
    marginTop: "8px",
    background: "#c9974a",
    border: "none",
    borderRadius: "10px",
    color: "#0a0a0a",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: "0.5px",
  },
  message: {
    marginTop: "16px",
    color: "#c9974a",
    fontSize: "13px",
    textAlign: "center",
  },
}