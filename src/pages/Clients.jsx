import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { Users, User, Mail, Phone, FileText, Plus, ArrowLeft, Pencil, Trash2 } from "lucide-react"
import ClientDetail from "../components/ClientDetail"
import * as layout from "../styles/layout"

const emptyForm = { name: "", email: "", phone: "", notes: "" }

export default function Clients() {
  const [view, setView] = useState("list")
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [selectedClient, setSelectedClient] = useState(null)
  const [cameFromDetail, setCameFromDetail] = useState(false)

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

  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setMessage("")
    setCameFromDetail(false)
    setView("form")
  }

  const backToList = () => {
    setEditingId(null)
    setForm(emptyForm)
    setMessage("")
    setSelectedClient(null)
    setCameFromDetail(false)
    setView("list")
  }

  const openDetail = (client) => {
    setSelectedClient(client)
    setMessage("")
    setView("detail")
  }

  const openEdit = (client, fromDetail = false) => {
    setEditingId(client.id)
    setForm({
      name: client.name ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      notes: client.notes ?? "",
    })
    setMessage("")
    setCameFromDetail(fromDetail)
    setView("form")
  }

  const handleDelete = async (client) => {
    if (!window.confirm(`Delete client ${client.name}? This cannot be undone.`)) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from("clients")
      .delete()
      .eq("id", client.id)
      .eq("artist_id", user.id)
      .select()
    if (error) {
      console.error("Client delete error:", error)
      setMessage("Delete error: " + error.message)
      return
    }
    if (!data || data.length === 0) {
      console.error("Client delete affected 0 rows", { id: client.id, artist_id: user.id })
      setMessage("Delete failed — no matching row (check DELETE RLS policy).")
      return
    }
    setClients((prev) => prev.filter((c) => c.id !== client.id))
  }

  const handleSubmit = async () => {
    if (!form.name || !form.email) {
      setMessage("Please fill in name and email.")
      return
    }
    setLoading(true)
    setMessage("")
    const { data: { user } } = await supabase.auth.getUser()

    if (editingId != null) {
      const { data, error } = await supabase
        .from("clients")
        .update({
          name: form.name,
          email: form.email,
          phone: form.phone,
          notes: form.notes,
        })
        .eq("id", editingId)
        .eq("artist_id", user.id)
        .select()
      if (error) {
        console.error("Client update error:", error)
        setMessage("Error: " + error.message)
      } else if (!data || data.length === 0) {
        console.error("Client update affected 0 rows", { editingId, artist_id: user.id })
        setMessage("Update failed — no matching row (check UPDATE RLS policy).")
      } else {
        setMessage("Client updated successfully!")
        fetchClients()
        if (cameFromDetail) {
          const updated = data[0]
          setTimeout(() => {
            setEditingId(null)
            setForm(emptyForm)
            setMessage("")
            setCameFromDetail(false)
            setSelectedClient(updated)
            setView("detail")
          }, 1500)
        } else {
          setTimeout(() => backToList(), 1500)
        }
      }
    } else {
      const { error } = await supabase.from("clients").insert([{
        ...form, artist_id: user.id,
      }])
      if (error) {
        setMessage("Error: " + error.message)
      } else {
        setMessage("Client added successfully!")
        setForm(emptyForm)
        fetchClients()
        setTimeout(() => backToList(), 1500)
      }
    }
    setLoading(false)
  }

  return (
    <div style={styles.container} className="vlt-page-shell">
      {view !== "detail" && (
        <>
          <div style={styles.header}>
            <div>
              <p style={styles.headerSub}>Manage your client database</p>
              <h1 style={styles.headerTitle}>Clients</h1>
            </div>
            <button
              style={styles.newBtn}
              onClick={() => (view === "list" ? openNew() : backToList())}
            >
              {view === "list"
                ? <><Plus size={16} /> Add Client</>
                : <><ArrowLeft size={16} /> Back to List</>
              }
            </button>
          </div>

          <div style={styles.divider} />
        </>
      )}

      {view === "detail" && selectedClient && (
        <ClientDetail
          client={selectedClient}
          onBack={backToList}
          onEdit={() => openEdit(selectedClient, true)}
          onDeleted={() => {
            setClients((prev) => prev.filter((c) => c.id !== selectedClient.id))
            backToList()
          }}
        />
      )}

      {view === "form" && (
        <form style={styles.form} onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
          <div style={styles.formGrid} className="vlt-form-grid">
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
            {loading ? "Saving..." : editingId ? "Save Changes" : "Add Client"}
          </button>
          {message && <p style={styles.message}>{message}</p>}
        </form>
      )}

      {view === "list" && (
        <div>
          {message && <p style={{ ...styles.message, textAlign: "left", marginBottom: "16px" }}>{message}</p>}
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
                <div
                  key={client.id}
                  style={{ ...styles.clientCard, cursor: "pointer" }}
                  className="vlt-card-row"
                  onClick={() => openDetail(client)}
                >
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
                  <div style={styles.clientDate} className="vlt-card-right">
                    <p style={styles.clientDateLabel}>Added</p>
                    <p style={styles.clientDateValue}>
                      {new Date(client.created_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                      })}
                    </p>
                  </div>

                  <div style={styles.rowActions} className="vlt-card-actions">
                    <button
                      type="button"
                      style={styles.iconBtn}
                      className="vlt-icon-btn"
                      aria-label={`Edit client ${client.name}`}
                      onClick={(e) => { e.stopPropagation(); openEdit(client) }}
                    >
                      <Pencil size={14} color="#8a8a8a" />
                    </button>
                    <button
                      type="button"
                      style={styles.iconBtn}
                      className="vlt-icon-btn"
                      aria-label={`Delete client ${client.name}`}
                      onClick={(e) => { e.stopPropagation(); handleDelete(client) }}
                    >
                      <Trash2 size={14} color="#8b1a1a" />
                    </button>
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
  container: layout.container,
  header: layout.header,
  headerSub: layout.headerSub,
  headerTitle: layout.headerTitle,
  newBtn: layout.newBtn,
  divider: layout.divider,
  form: { display: "flex", flexDirection: "column", gap: "20px", maxWidth: "700px" },
  formGrid: layout.formGrid,
  field: layout.field,
  label: layout.label,
  inputWrapper: layout.inputWrapper,
  inputIcon: layout.inputIcon,
  input: { ...layout.input, background: "#0f0f10" },
  button: layout.button,
  message: layout.message,
  emptyState: layout.emptyState,
  emptyText: layout.emptyText,
  clientsList: { display: "flex", flexDirection: "column", gap: "12px" },
  clientCard: { display: "flex", gap: "20px", background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "20px 24px" },
  clientAvatar: { width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #c9974a, #a07830)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "600", color: "#0a0a0a", flexShrink: 0, fontFamily: "'Playfair Display', serif" },
  clientInfo: { flex: 1 },
  clientName: { color: "#f5f5f5", fontSize: "16px", margin: "0 0 8px 0", fontWeight: "500" },
  clientMeta: { display: "flex", gap: "16px", flexWrap: "wrap" },
  clientMetaItem: { display: "flex", alignItems: "center", gap: "6px", color: "#6b6b6b", fontSize: "13px" },
  clientNotes: { color: "#5c5c5c", fontSize: "12px", margin: "8px 0 0 0", fontStyle: "italic" },
  clientDate: {},
  clientDateLabel: { color: "#5c5c5c", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px 0" },
  clientDateValue: { color: "#c9974a", fontSize: "14px", fontWeight: "600", margin: 0, fontFamily: "'Playfair Display', serif" },
  rowActions: layout.rowActions,
  iconBtn: layout.iconBtn,
}