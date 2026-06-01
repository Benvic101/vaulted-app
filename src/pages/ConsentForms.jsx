import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { FileText, User, Mail, CalendarDays, Plus, ArrowLeft, CheckSquare } from "lucide-react"

export default function ConsentForms() {
  const [view, setView] = useState("list")
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [form, setForm] = useState({
    client_name: "", client_email: "", date: "",
    blood_thinner: false, skin_condition: false,
    allergies: false, allergies_detail: "",
    pregnant: false, diabetes: false, heart_condition: false,
    age_verified: false, design_approved: false,
    aftercare_acknowledged: false, photo_consent: false,
  })

  useEffect(() => { fetchForms() }, [])

  const fetchForms = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from("consent_forms")
      .select("*")
      .eq("artist_id", user.id)
    if (!error) setForms(data)
  }

  const handleChange = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  const handleSubmit = async () => {
    if (!form.client_name || !form.client_email || !form.date) {
      setMessage("Please fill in client name, email and date.")
      return
    }
    if (!form.age_verified || !form.design_approved || !form.aftercare_acknowledged) {
      setMessage("Client must verify age, approve design and acknowledge aftercare.")
      return
    }
    setLoading(true)
    setMessage("")
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("consent_forms").insert([{
      ...form, artist_id: user.id, signed_at: new Date().toISOString(),
    }])
    if (error) {
      setMessage("Error: " + error.message)
    } else {
      setMessage("Consent form saved!")
      setForm({
        client_name: "", client_email: "", date: "",
        blood_thinner: false, skin_condition: false,
        allergies: false, allergies_detail: "",
        pregnant: false, diabetes: false, heart_condition: false,
        age_verified: false, design_approved: false,
        aftercare_acknowledged: false, photo_consent: false,
      })
      fetchForms()
      setTimeout(() => setView("list"), 1500)
    }
    setLoading(false)
  }

  const CheckBox = ({ name, label, required }) => (
    <label style={styles.checkboxLabel}>
      <input
        type="checkbox"
        name={name}
        checked={form[name]}
        onChange={handleChange}
        style={styles.checkbox}
      />
      <span style={styles.checkboxText}>
        {label} {required && <span style={{ color: "#8b1a1a" }}>*</span>}
      </span>
    </label>
  )

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <p style={styles.headerSub}>Digital health & consent declarations</p>
          <h1 style={styles.headerTitle}>Consent Forms</h1>
        </div>
        <button
          style={styles.newBtn}
          onClick={() => setView(view === "list" ? "form" : "list")}
        >
          {view === "list"
            ? <><Plus size={16} /> New Form</>
            : <><ArrowLeft size={16} /> Back to List</>
          }
        </button>
      </div>

      <div style={styles.divider} />

      {view === "form" && (
        <div style={styles.form}>

          {/* Client Details */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Client Details</h3>
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Full Name *</label>
                <div style={styles.inputWrapper}>
                  <User size={15} color="#444" style={styles.inputIcon} />
                  <input style={styles.input} name="client_name" placeholder="Full name" value={form.client_name} onChange={handleChange} />
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Email *</label>
                <div style={styles.inputWrapper}>
                  <Mail size={15} color="#444" style={styles.inputIcon} />
                  <input style={styles.input} name="client_email" placeholder="email@example.com" value={form.client_email} onChange={handleChange} />
                </div>
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Appointment Date *</label>
              <div style={styles.inputWrapper}>
                <CalendarDays size={15} color="#444" style={styles.inputIcon} />
                <input style={styles.input} name="date" type="date" value={form.date} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Medical History */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Medical History</h3>
            <p style={styles.sectionSub}>Check all conditions that apply</p>
            <div style={styles.checkboxGrid}>
              <CheckBox name="blood_thinner" label="Takes blood thinners" />
              <CheckBox name="skin_condition" label="Has skin condition" />
              <CheckBox name="allergies" label="Has allergies" />
              <CheckBox name="pregnant" label="Is pregnant" />
              <CheckBox name="diabetes" label="Has diabetes" />
              <CheckBox name="heart_condition" label="Has heart condition" />
            </div>
            {form.allergies && (
              <div style={{ ...styles.field, marginTop: "16px" }}>
                <label style={styles.label}>Allergy Details</label>
                <input style={{ ...styles.input, paddingLeft: "16px" }} name="allergies_detail" placeholder="Describe allergies..." value={form.allergies_detail} onChange={handleChange} />
              </div>
            )}
          </div>

          {/* Consent */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Client Consent</h3>
            <p style={styles.sectionSub}>Required fields must be checked to proceed</p>
            <div style={styles.consentList}>
              <CheckBox name="age_verified" label="I confirm I am 18 years or older" required />
              <CheckBox name="design_approved" label="I have reviewed and approved the design" required />
              <CheckBox name="aftercare_acknowledged" label="I have read and understood aftercare instructions" required />
              <CheckBox name="photo_consent" label="I consent to photos being used for portfolio purposes" />
            </div>
          </div>

          <button style={styles.button} onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Consent Form"}
          </button>
          {message && <p style={styles.message}>{message}</p>}
        </div>
      )}

      {view === "list" && (
        <div>
          {forms.length === 0 ? (
            <div style={styles.emptyState}>
              <FileText size={36} color="#222" />
              <p style={styles.emptyText}>No consent forms yet. Create your first one!</p>
            </div>
          ) : (
            <div style={styles.formsList}>
              {forms.map((f) => (
                <div key={f.id} style={styles.formCard}>
                  <div style={styles.formIconBox}>
                    <FileText size={20} color="#d4a843" />
                  </div>
                  <div style={styles.formInfo}>
                    <h3 style={styles.formName}>{f.client_name}</h3>
                    <div style={styles.formMeta}>
                      <span style={styles.formMetaItem}><Mail size={12} color="#444" /> {f.client_email}</span>
                      <span style={styles.formMetaItem}><CalendarDays size={12} color="#444" /> {f.date}</span>
                    </div>
                  </div>
                  <div style={styles.formRight}>
                    <span style={styles.signedBadge}>
                      <CheckSquare size={12} /> Signed
                    </span>
                    <p style={styles.formDate}>
                      {new Date(f.signed_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric"
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { padding: "48px 52px", fontFamily: "'DM Sans', sans-serif", color: "#f5f5f5", minHeight: "100vh", background: "#0a0a0a" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" },
  headerSub: { color: "#444", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 6px 0" },
  headerTitle: { fontFamily: "'Playfair Display', serif", fontSize: "32px", margin: 0, fontWeight: "600" },
  newBtn: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: "#d4a843", border: "none", borderRadius: "8px", color: "#0a0a0a", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  divider: { height: "1px", background: "#1a1a1a", marginBottom: "40px" },
  form: { display: "flex", flexDirection: "column", gap: "24px", maxWidth: "700px" },
  section: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" },
  sectionTitle: { fontFamily: "'Playfair Display', serif", color: "#f5f5f5", fontSize: "16px", margin: 0, fontWeight: "400" },
  sectionSub: { color: "#444", fontSize: "12px", margin: 0 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  field: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "12px", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px" },
  inputWrapper: { position: "relative" },
  inputIcon: { position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" },
  input: { width: "100%", padding: "12px 16px 12px 40px", background: "#111", border: "1px solid #1a1a1a", borderRadius: "8px", color: "#f5f5f5", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" },
  checkboxGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  consentList: { display: "flex", flexDirection: "column", gap: "12px" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" },
  checkbox: { width: "16px", height: "16px", cursor: "pointer", accentColor: "#d4a843" },
  checkboxText: { color: "#888", fontSize: "14px" },
  button: { padding: "13px", background: "#d4a843", border: "none", borderRadius: "8px", color: "#0a0a0a", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  message: { color: "#d4a843", fontSize: "13px", textAlign: "center", margin: 0 },
  emptyState: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "60px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" },
  emptyText: { color: "#333", fontSize: "14px", margin: 0 },
  formsList: { display: "flex", flexDirection: "column", gap: "12px" },
  formCard: { display: "flex", alignItems: "center", gap: "20px", background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "20px 24px" },
  formIconBox: { width: "44px", height: "44px", borderRadius: "10px", background: "rgba(212,168,67,0.05)", border: "1px solid rgba(212,168,67,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  formInfo: { flex: 1 },
  formName: { color: "#f5f5f5", fontSize: "16px", margin: "0 0 8px 0", fontWeight: "500" },
  formMeta: { display: "flex", gap: "16px" },
  formMetaItem: { display: "flex", alignItems: "center", gap: "6px", color: "#444", fontSize: "13px" },
  formRight: { textAlign: "right" },
  signedBadge: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: "rgba(45,106,79,0.15)", color: "#2d6a4f", border: "1px solid rgba(45,106,79,0.2)", marginBottom: "8px" },
  formDate: { color: "#444", fontSize: "12px", margin: 0 },
}