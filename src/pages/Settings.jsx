import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { User, Mail, Building, Save } from "lucide-react"
import * as layout from "../styles/layout"

export default function Settings() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [form, setForm] = useState({
    studio_name: "",
    full_name: "",
    email: "",
    phone: "",
    bio: "",
  })

useEffect(() => {
    let isMounted = true

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!isMounted) return
      setForm((prev) => ({ ...prev, email: user.email }))

      const { data } = await supabase
        .from("artist_profiles")
        .select("*")
        .eq("artist_id", user.id)
        .single()

      if (data && isMounted) {
        setForm((prev) => ({
          ...prev,
          studio_name: data.studio_name || "",
          full_name: data.full_name || "",
          phone: data.phone || "",
          bio: data.bio || "",
        }))
      }
    }

    init()
    return () => { isMounted = false }
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
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Studio Information</h3>

          <div style={styles.field}>
            <label style={styles.label}>Studio Name</label>
            <div style={styles.inputWrapper}>
              <Building size={15} color="#6b6b6b" style={styles.inputIcon} />
              <input style={styles.input} name="studio_name" placeholder="e.g. Vaulted Tattoo Studio" value={form.studio_name} onChange={handleChange} />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Artist Full Name</label>
            <div style={styles.inputWrapper}>
              <User size={15} color="#6b6b6b" style={styles.inputIcon} />
              <input style={styles.input} name="full_name" placeholder="Your full name" value={form.full_name} onChange={handleChange} />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputWrapper}>
              <Mail size={15} color="#6b6b6b" style={styles.inputIcon} />
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

        <button type="submit" style={styles.button} disabled={loading}>
          <Save size={16} /> {loading ? "Saving..." : "Save Changes"}
        </button>

        {message && <p style={styles.message}>{message}</p>}
      </form>
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
  section: { background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" },
  sectionTitle: { fontFamily: "'Playfair Display', serif", color: "#f5f5f5", fontSize: "16px", margin: 0, fontWeight: "400" },
  field: layout.field,
  label: layout.label,
  inputWrapper: layout.inputWrapper,
  inputIcon: layout.inputIcon,
  input: { ...layout.input, background: "#141416" },
  button: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "13px", background: "#c9974a", border: "none", borderRadius: "8px", color: "#0a0a0a", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  message: layout.message,
}