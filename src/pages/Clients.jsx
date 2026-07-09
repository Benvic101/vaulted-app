import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { Users, User, Mail, Phone, FileText, Plus, ArrowLeft } from "lucide-react"

export default function Clients() {
  const [view, setView] = useState("list")
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [form, setForm] = useState({
    name: "", email: "", phone: "", notes: "",
  })

  useEffect(() => { fetchClients() }, [])

  const fetchClients = async () => {
    setListLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("artist_id", user.id)
    if (!error) setClients(data)
    setListLoading(false)
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    if (!form.name || !form.email) {
      setMessage("Please fill in name and email.")
      return
    }
    setLoading(true)
    setMessage("")
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("clients").insert([{
      ...form, artist_id: user.id,
    }])
    if (error) {
      setMessage("Error: " + error.message)
    } else {
      setMessage("Client added successfully!")
      setForm({ name: "", email: "", phone: "", notes: "" })
      fetchClients()
      setTimeout(() => setView("list"), 1500)
    }
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <p style={styles.headerSub}>Manage your client database</p>
          <h1 style={styles.headerTitle}>Clients</h1>
        </div>
        <button
          style={styles.newBtn}
          onClick={() => setView(view === "list" ? "form" : "list")}
        >
          {view === "list"
            ? <><Plus size={16} /> Add Client</>
            : <><ArrowLeft size={16} /> Back to List</>
          }
        </button>
      </div>

      <div style={styles.divider} />

      {view === "form" && (
        <form style={styles.form} onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name *</label>
              <div style={styles.inputWrapper}>
                <User size={15} color="#6b6b6b" style={styles.inputIcon} />
                <input style={styles.input} name="name" placeholder="e.g. Sarah Johnson" value={form.name} onChange={handleChange} />
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Email *</label>
              <div style={styles.inputWrapper}>
                <Mail size={15} color="#6b6b6b" style={styles.inputIcon} />
                <input style={styles.input} name="email" placeholder="e.g. sarah@email.com" value={form.email} onChange={handleChange} />
              </div>
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Phone</label>
            <div style={styles.inputWrapper}>
              <Phone size={15} color="#6b6b6b" style={styles.inputIcon} />
              <input style={styles.input} name="phone" placeholder="e.g. +1 234 567 8900" value={form.phone} onChange={handleChange} />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Notes</label>
            <textarea
              style={{ ...styles.input, height: "100px", resize: "vertical", paddingLeft: "16px" }}
              name="notes"
              placeholder="Any important notes about this client..."
              value={form.notes}
              onChange={handleChange}
            />
          </div>
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Saving..." : "Add Client"}
          </button>
          {message && <p style={styles.message}>{message}</p>}
        </form>
      )}

      {view === "list" && (
        <div>
          {listLoading ? (
            <div style={styles.emptyState}>
              <Users size={36} color="#5c5c5c" />
              <p style={styles.emptyText}>Loading clients…</p>
            </div>
          ) : clients.length === 0 ? (
            <div style={styles.emptyState}>
              <Users size={36} color="#222" />
              <p style={styles.emptyText}>No clients yet. Add your first one!</p>
            </div>
          ) : (
            <div style={styles.clientsList}>
              {clients.map((client) => (
                <div key={client.id} style={styles.clientCard}>
                  <div style={styles.clientAvatar}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.clientInfo}>
                    <h3 style={styles.clientName}>{client.name}</h3>
                    <div style={styles.clientMeta}>
                      <span style={styles.clientMetaItem}>
                        <Mail size={12} color="#6b6b6b" /> {client.email}
                      </span>
                      {client.phone && (
                        <span style={styles.clientMetaItem}>
                          <Phone size={12} color="#6b6b6b" /> {client.phone}
                        </span>
                      )}
                    </div>
                    {client.notes && (
                      <p style={styles.clientNotes}>{client.notes}</p>
                    )}
                  </div>
                  <div style={styles.clientDate}>
                    <p style={styles.clientDateLabel}>Added</p>
                    <p style={styles.clientDateValue}>
                      {new Date(client.created_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
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
  headerSub: { color: "#6b6b6b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 6px 0" },
  headerTitle: { fontFamily: "'Playfair Display', serif", fontSize: "32px", margin: 0, fontWeight: "600" },
  newBtn: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: "#c9974a", border: "none", borderRadius: "8px", color: "#0a0a0a", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  divider: { height: "1px", background: "#1a1a1a", marginBottom: "40px" },
  form: { display: "flex", flexDirection: "column", gap: "20px", maxWidth: "700px" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  field: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "12px", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px" },
  inputWrapper: { position: "relative" },
  inputIcon: { position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" },
  input: { width: "100%", padding: "12px 16px 12px 40px", background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "8px", color: "#f5f5f5", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" },
  button: { padding: "13px", background: "#c9974a", border: "none", borderRadius: "8px", color: "#0a0a0a", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  message: { color: "#c9974a", fontSize: "13px", textAlign: "center", margin: 0 },
  emptyState: { background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "60px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" },
  emptyText: { color: "#5c5c5c", fontSize: "14px", margin: 0 },
  clientsList: { display: "flex", flexDirection: "column", gap: "12px" },
  clientCard: { display: "flex", alignItems: "center", gap: "20px", background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "20px 24px" },
  clientAvatar: { width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #c9974a, #a07830)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "600", color: "#0a0a0a", flexShrink: 0, fontFamily: "'Playfair Display', serif" },
  clientInfo: { flex: 1 },
  clientName: { color: "#f5f5f5", fontSize: "16px", margin: "0 0 8px 0", fontWeight: "500" },
  clientMeta: { display: "flex", gap: "16px", flexWrap: "wrap" },
  clientMetaItem: { display: "flex", alignItems: "center", gap: "6px", color: "#6b6b6b", fontSize: "13px" },
  clientNotes: { color: "#5c5c5c", fontSize: "12px", margin: "8px 0 0 0", fontStyle: "italic" },
  clientDate: { textAlign: "right" },
  clientDateLabel: { color: "#5c5c5c", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px 0" },
  clientDateValue: { color: "#c9974a", fontSize: "14px", fontWeight: "600", margin: 0, fontFamily: "'Playfair Display', serif" },
}