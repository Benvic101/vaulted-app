import { useState, useEffect, useRef } from "react"
import { getTheme, setTheme } from "../utils/themeHelpers"
import { supabase } from "../supabase"
import ListError from "../components/ListError"
import { User, Mail, Building, Save, Moon, Sun, LogOut } from "lucide-react"
import * as layout from "../styles/layout"
import ConfirmDialog from "../components/ConfirmDialog"

export default function Settings() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [profileError, setProfileError] = useState(null)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [form, setForm] = useState({
    studio_name: "",
    full_name: "",
    email: "",
    phone: "",
    bio: "",
  })

const [theme, setThemeState] = useState(getTheme())

function toggleTheme() {
  const newTheme = theme === "dark" ? "light" : "dark"
  setTheme(newTheme)
  setThemeState(newTheme)
}

async function handleSignOut() {
  window.__vaultedIntentionalSignOut = true
  await supabase.auth.signOut()
}

  const isMountedRef = useRef(true)

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!isMountedRef.current) return
    setProfileError(null)
    setForm((prev) => ({ ...prev, email: user.email }))

    const { data, error } = await supabase
      .from("artist_profiles")
      .select("*")
      .eq("artist_id", user.id)
      .single()

    // A missing row (PGRST116) is normal for a new account — no profile
    // yet. Any other failure would leave the form silently blank.
    if (error && error.code !== "PGRST116" && isMountedRef.current) {
      console.error("Settings profile fetch error:", error)
      setProfileError("Couldn't load your profile — " + error.message)
    }

    if (data && isMountedRef.current) {
      setForm((prev) => ({
        ...prev,
        studio_name: data.studio_name || "",
        full_name: data.full_name || "",
        phone: data.phone || "",
        bio: data.bio || "",
      }))
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    fetchProfile()
    return () => { isMountedRef.current = false }
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    setLoading(true)
    setMessage("")
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from("artist_profiles")
      .upsert([{
        artist_id: user.id,
        studio_name: form.studio_name,
        full_name: form.full_name,
        phone: form.phone,
        bio: form.bio,
      }], { onConflict: "artist_id" })

    if (error) {
      setMessage("Error: " + error.message)
    } else {
      setMessage("Settings saved successfully!")
    }
    setLoading(false)
  }

  return (
    <div style={styles.container} className="vlt-page-shell">
      <div style={styles.header}>
        <p style={styles.headerSub}>Manage your studio profile</p>
        <h1 style={styles.headerTitle}>Settings</h1>
      </div>

      <div style={styles.divider} />

      <form style={styles.form} onSubmit={(e) => { e.preventDefault(); handleSave() }}>
        {profileError && <ListError message={profileError} onRetry={fetchProfile} />}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Studio Information</h3>

          <div style={styles.field}>
            <label style={styles.label}>Studio Name</label>
            <div style={styles.inputWrapper}>
              <Building size={15} color="var(--text-tertiary)" style={styles.inputIcon} />
              <input style={styles.input} name="studio_name" placeholder="e.g. Vaulted Tattoo Studio" value={form.studio_name} onChange={handleChange} />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Artist Full Name</label>
            <div style={styles.inputWrapper}>
              <User size={15} color="var(--text-tertiary)" style={styles.inputIcon} />
              <input style={styles.input} name="full_name" placeholder="Your full name" value={form.full_name} onChange={handleChange} />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputWrapper}>
              <Mail size={15} color="var(--text-tertiary)" style={styles.inputIcon} />
              <input style={{ ...styles.input, opacity: 0.5 }} value={form.email} disabled />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Phone</label>
            <div style={styles.inputWrapper}>
              <input style={{ ...styles.input, paddingLeft: "16px" }} name="phone" placeholder="e.g. +1 234 567 8900" value={form.phone} onChange={handleChange} />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Studio Bio</label>
            <textarea
              style={{ ...styles.input, height: "100px", resize: "vertical", paddingLeft: "16px" }}
              name="bio"
              placeholder="Tell clients about your studio and style..."
              value={form.bio}
              onChange={handleChange}
            />
          </div>
        </div>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Appearance</h3>

          <div style={styles.field}>
            <label style={styles.label}>Theme</label>
            <button
              type="button"
              onClick={toggleTheme}
              style={styles.themeToggle}
            >
              {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
              {theme === "dark" ? "Dark Mode" : "Light Mode"}
            </button>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Account</h3>

          <div style={styles.field}>
            <label style={styles.label}>Session</label>
            <button
              type="button"
              onClick={() => setShowSignOutConfirm(true)}
              style={styles.signOutButton}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>

        <button type="submit" style={styles.button} disabled={loading}>
          <Save size={16} /> {loading ? "Saving..." : "Save Changes"}
        </button>

        {message && <p style={styles.message}>{message}</p>}
      </form>

        <ConfirmDialog
        open={showSignOutConfirm}
        title="Sign out of Vaulted?"
        message="Are you sure you want to sign out of your account?"
        onConfirm={() => { setShowSignOutConfirm(false); handleSignOut() }}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </div>
  )
}

const styles = {
  container: layout.container,
  header: { marginBottom: "24px" },
  headerSub: layout.headerSub,
  headerTitle: layout.headerTitle,
  divider: layout.divider,
  form: { display: "flex", flexDirection: "column", gap: "24px", maxWidth: "600px" },
  section: { background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" },
  sectionTitle: { fontFamily: "'Playfair Display', serif", color: "var(--text-primary)", fontSize: "16px", margin: 0, fontWeight: "400" },
  field: layout.field,
  label: layout.label,
  inputWrapper: layout.inputWrapper,
  inputIcon: layout.inputIcon,
  input: { ...layout.input, background: "var(--bg-tertiary)" },
  themeToggle: { display: "flex", alignItems: "center", gap: "8px", padding: "11px 16px", background: "var(--bg-tertiary)", border: "1px solid var(--border-tertiary)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", width: "fit-content" },
  signOutButton: { display: "flex", alignItems: "center", gap: "8px", padding: "11px 16px", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "8px", color: "var(--danger-secondary)", fontSize: "14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", width: "fit-content" },
  button: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "13px", background: "var(--accent-gold)", border: "none", borderRadius: "8px", color: "var(--text-on-accent)", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  message: layout.message,
}