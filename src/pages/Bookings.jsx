import { useState, useEffect, useRef } from "react"
import { supabase } from "../supabase"
import { CalendarDays, Clock, Mail, FileText, Plus, ArrowLeft, DollarSign, Pencil, Trash2, CheckSquare, XCircle, ChevronDown } from "lucide-react"
import ClientPicker from "../components/ClientPicker"
import * as layout from "../styles/layout"

const STATUS_OPTIONS = ["upcoming", "completed", "cancelled"]

const emptyForm = {
  client_id: null,
  client_name: "",
  client_email: "",
  session_type: "Full Tattoo Session",
  date: "",
  time: "",
  price: "",
  notes: "",
}

export default function Bookings() {
  const [view, setView] = useState("list")
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [statusMenuId, setStatusMenuId] = useState(null)
  const today = new Date().toISOString().split("T")[0]
  const [form, setForm] = useState(emptyForm)
  const statusMenuRef = useRef(null)

  const sessionTypes = [
    "Full Tattoo Session",
    "Touch Up",
    "Consultation",
    "Flash Tattoo",
    "Cover Up",
  ]

  useEffect(() => {
    fetchBookings()
  }, [])

  useEffect(() => {
    const onDoc = (e) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target)) setStatusMenuId(null)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const fetchBookings = async () => {
    setListLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("artist_id", user.id)
      .order("date", { ascending: true })
    if (!error) setBookings(data)
    setListLoading(false)
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setMessage("")
    setView("form")
  }

  const backToList = () => {
    setEditingId(null)
    setForm(emptyForm)
    setMessage("")
    setView("list")
  }

  const openEdit = (booking) => {
    setEditingId(booking.id)
    setForm({
      client_id: booking.client_id ?? null,
      client_name: booking.client_name ?? "",
      client_email: booking.client_email ?? "",
      session_type: booking.session_type ?? "Full Tattoo Session",
      date: booking.date ?? "",
      time: (booking.time ?? "").slice(0, 5),
      price: booking.price != null ? String(booking.price) : "",
      notes: booking.notes ?? "",
    })
    setMessage("")
    setView("form")
  }

  const handleDelete = async (booking) => {
    if (!window.confirm(`Delete booking for ${booking.client_name}? This cannot be undone.`)) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", booking.id)
      .eq("artist_id", user.id)
      .select()
    if (error) {
      console.error("Booking delete error:", error)
      setMessage("Delete error: " + error.message)
      return
    }
    if (!data || data.length === 0) {
      console.error("Booking delete affected 0 rows", { id: booking.id, artist_id: user.id })
      setMessage("Delete failed — no matching row (check DELETE RLS policy).")
      return
    }
    setBookings((prev) => prev.filter((b) => b.id !== booking.id))
  }

  const handleStatusChange = async (booking, newStatus) => {
    setStatusMenuId(null)
    if (newStatus === booking.status) return
    if (newStatus === "cancelled" && !window.confirm(`Cancel booking for ${booking.client_name}?`)) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", booking.id)
      .eq("artist_id", user.id)
      .select()
    if (error) {
      console.error("Booking status update error:", error)
      setMessage("Error: " + error.message)
      return
    }
    if (!data || data.length === 0) {
      console.error("Booking status update affected 0 rows", { id: booking.id, artist_id: user.id })
      setMessage("Status update failed — no matching row (check UPDATE RLS policy).")
      return
    }
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: newStatus } : b)))
  }

  const handleSubmit = async () => {
    if (!form.client_name || !form.date || !form.time || !form.price) {
      setMessage("Please fill in all required fields.")
      return
    }
    setLoading(true)
    setMessage("")
    const { data: { user } } = await supabase.auth.getUser()
    const deposit = (parseFloat(form.price) * 0.2).toFixed(2)

    if (editingId != null) {
      const { data, error } = await supabase
        .from("bookings")
        .update({
          client_id: form.client_id,
          client_name: form.client_name,
          client_email: form.client_email,
          session_type: form.session_type,
          date: form.date,
          time: form.time,
          notes: form.notes,
          price: parseFloat(form.price),
          deposit: parseFloat(deposit),
        })
        .eq("id", editingId)
        .eq("artist_id", user.id)
        .select()
      if (error) {
        console.error("Booking update error:", error)
        setMessage("Error: " + error.message)
      } else if (!data || data.length === 0) {
        console.error("Booking update affected 0 rows", { editingId, artist_id: user.id })
        setMessage("Update failed — no matching row (check UPDATE RLS policy).")
      } else {
        setMessage("Booking updated successfully!")
        fetchBookings()
        setTimeout(() => backToList(), 1500)
      }
    } else {
      const { error } = await supabase.from("bookings").insert([{
        ...form,
        deposit: parseFloat(deposit),
        price: parseFloat(form.price),
        status: "upcoming",
        artist_id: user.id,
      }])
      if (error) {
        setMessage("Error: " + error.message)
      } else {
        setMessage("Booking created successfully!")
        setForm(emptyForm)
        fetchBookings()
        setTimeout(() => backToList(), 1500)
      }
    }
    setLoading(false)
  }

  const getStatusColor = (status) => {
    if (status === "upcoming") return "#c9974a"
    if (status === "completed") return "#2d6a4f"
    if (status === "cancelled") return "#8b1a1a"
    return "#c9974a"
  }

  const getStatusIcon = (status) => {
    if (status === "completed") return <CheckSquare size={11} />
    if (status === "cancelled") return <XCircle size={11} />
    return null
  }

  return (
    <div style={styles.container} className="vlt-page-shell">

      {/* Header */}
      <div style={styles.header}>
        <div>
          <p style={styles.headerSub}>Manage your appointments</p>
          <h1 style={styles.headerTitle}>Bookings</h1>
        </div>
        <button
          style={styles.newBtn}
          onClick={() => (view === "list" ? openNew() : backToList())}
        >
          {view === "list"
            ? <><Plus size={16} /> New Booking</>
            : <><ArrowLeft size={16} /> Back to List</>
          }
        </button>
      </div>

      <div style={styles.divider} />

      {/* Form */}
      {view === "form" && (
        <form style={styles.form} onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>

          <div style={styles.formGrid} className="vlt-form-grid">
            <div style={styles.field}>
              <label style={styles.label}>Client *</label>
              <ClientPicker
                value={form.client_id ? { id: form.client_id, name: form.client_name } : null}
                onChange={(c) => setForm((f) => ({
                  ...f,
                  client_id: c?.id ?? null,
                  client_name: c?.name ?? "",
                  // Auto-fill email from the selected client only if the field is empty,
                  // so an artist-typed override isn't clobbered on re-select.
                  client_email: c?.email && !f.client_email ? c.email : f.client_email,
                }))}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Client Email</label>
              <div style={styles.inputWrapper}>
                <Mail size={15} color="#6b6b6b" style={styles.inputIcon} />
                <input style={styles.input} name="client_email" placeholder="e.g. john@email.com" value={form.client_email} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Session Type *</label>
            <div style={styles.inputWrapper}>
              <FileText size={15} color="#6b6b6b" style={styles.inputIcon} />
              <select style={styles.input} name="session_type" value={form.session_type} onChange={handleChange}>
                {sessionTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formGrid} className="vlt-form-grid">
            <div style={styles.field}>
              <label style={styles.label}>Date *</label>
              <div style={styles.inputWrapper}>
                <CalendarDays size={15} color="#6b6b6b" style={styles.inputIcon} />
                <input style={styles.input} name="date" type="date" min={today} value={form.date} onChange={handleChange} />
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Time *</label>
              <div style={styles.inputWrapper}>
                <Clock size={15} color="#6b6b6b" style={styles.inputIcon} />
                <input style={styles.input} name="time" type="time" value={form.time} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Estimated Price ($) *</label>
            <div style={styles.inputWrapper}>
              <DollarSign size={15} color="#6b6b6b" style={styles.inputIcon} />
              <input style={styles.input} name="price" type="number" placeholder="e.g. 200" value={form.price} onChange={handleChange} />
            </div>
          </div>

          {form.price && (
            <div style={styles.depositBox}>
              <span style={styles.depositLabel}>Deposit Required (20%)</span>
              <span style={styles.depositValue}>${(parseFloat(form.price) * 0.2).toFixed(2)}</span>
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Notes</label>
            <textarea
              style={{ ...styles.input, height: "100px", resize: "vertical", paddingLeft: "16px" }}
              name="notes"
              placeholder="Design ideas, placement, special requests..."
              value={form.notes}
              onChange={handleChange}
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Saving..." : editingId ? "Save Changes" : "Create Booking"}
          </button>

          {message && <p style={styles.message}>{message}</p>}
        </form>
      )}

      {/* List */}
      {view === "list" && (
        <div>
          {message && <p style={{ ...styles.message, textAlign: "left", marginBottom: "16px" }}>{message}</p>}
          {listLoading ? (
            <div style={styles.emptyState}>
              <CalendarDays size={36} color="#5c5c5c" />
              <p style={styles.emptyText}>Loading bookings…</p>
            </div>
          ) : bookings.length === 0 ? (
            <div style={styles.emptyState}>
              <CalendarDays size={36} color="#222" />
              <p style={styles.emptyText}>No bookings yet. Create your first one!</p>
            </div>
          ) : (
            <div style={styles.bookingsList}>
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  style={{
                    ...styles.bookingCard,
                    opacity: booking.status === "upcoming" ? 1 : 0.6,
                  }}
                  className="vlt-card-row"
                >
                  <div style={styles.bookingDateBox}>
                    <span style={styles.bookingDay}>
                      {new Date(booking.date).toLocaleDateString("en-US", { day: "numeric" })}
                    </span>
                    <span style={styles.bookingMonth}>
                      {new Date(booking.date).toLocaleDateString("en-US", { month: "short" })}
                    </span>
                  </div>

                  <div style={styles.bookingInfo}>
                    <h3 style={{
                      ...styles.bookingName,
                      textDecoration: booking.status === "cancelled" ? "line-through" : "none",
                    }}>
                      {booking.client_name}
                    </h3>
                    <p style={styles.bookingMeta}>{booking.session_type} &nbsp;·&nbsp; {booking.time}</p>
                  </div>

                  <div style={styles.bookingRight} className="vlt-card-right">
                    <div style={styles.statusWrap} ref={statusMenuId === booking.id ? statusMenuRef : null}>
                      <button
                        type="button"
                        style={{
                          ...styles.statusBadge,
                          background: `${getStatusColor(booking.status)}15`,
                          color: getStatusColor(booking.status),
                          border: `1px solid ${getStatusColor(booking.status)}30`,
                        }}
                        onClick={() => setStatusMenuId(statusMenuId === booking.id ? null : booking.id)}
                      >
                        {getStatusIcon(booking.status)}
                        {booking.status}
                        <ChevronDown size={11} />
                      </button>
                      {statusMenuId === booking.id && (
                        <div style={styles.statusMenu}>
                          {STATUS_OPTIONS.map((s) => (
                            <div
                              key={s}
                              style={{
                                ...styles.statusOption,
                                color: getStatusColor(s),
                                fontWeight: s === booking.status ? "700" : "400",
                              }}
                              onClick={() => handleStatusChange(booking, s)}
                            >
                              {getStatusIcon(s)}
                              {s}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p style={styles.bookingPrice}>${booking.price}</p>
                    <p style={styles.bookingDeposit}>Deposit: ${booking.deposit}</p>
                  </div>

                  <div style={styles.rowActions} className="vlt-card-actions">
                    <button
                      type="button"
                      style={styles.iconBtn}
                      className="vlt-icon-btn"
                      aria-label={`Edit booking for ${booking.client_name}`}
                      onClick={() => openEdit(booking)}
                    >
                      <Pencil size={14} color="#8a8a8a" />
                    </button>
                    <button
                      type="button"
                      style={styles.iconBtn}
                      className="vlt-icon-btn"
                      aria-label={`Delete booking for ${booking.client_name}`}
                      onClick={() => handleDelete(booking)}
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
  depositBox: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(201,151,74,0.05)", border: "1px solid rgba(201,151,74,0.15)", borderRadius: "8px", padding: "16px 20px" },
  depositLabel: { color: "#666", fontSize: "13px" },
  depositValue: { color: "#c9974a", fontSize: "24px", fontFamily: "'Playfair Display', serif" },
  button: layout.button,
  message: layout.message,
  emptyState: layout.emptyState,
  emptyText: layout.emptyText,
  bookingsList: { display: "flex", flexDirection: "column", gap: "12px" },
  bookingCard: { display: "flex", gap: "24px", background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "20px 24px" },
  bookingDateBox: { display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(201,151,74,0.05)", border: "1px solid rgba(201,151,74,0.1)", borderRadius: "10px", padding: "12px 16px", minWidth: "56px" },
  bookingDay: { color: "#c9974a", fontSize: "22px", fontWeight: "600", fontFamily: "'Playfair Display', serif" },
  bookingMonth: { color: "#555", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" },
  bookingInfo: { flex: 1 },
  bookingName: { color: "#f5f5f5", fontSize: "16px", margin: "0 0 4px 0", fontWeight: "500" },
  bookingMeta: { color: "#6b6b6b", fontSize: "13px", margin: 0 },
  bookingRight: {},
  statusWrap: { position: "relative", marginBottom: "8px" },
  statusBadge: { display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  statusMenu: { position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#141416", border: "1px solid #1e1e1e", borderRadius: "8px", padding: "4px", zIndex: 10, minWidth: "130px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" },
  statusOption: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 10px", borderRadius: "6px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer" },
  bookingPrice: { color: "#f5f5f5", fontSize: "18px", fontWeight: "600", margin: "0 0 2px 0", fontFamily: "'Playfair Display', serif" },
  bookingDeposit: { color: "#6b6b6b", fontSize: "12px", margin: 0 },
  rowActions: layout.rowActions,
  iconBtn: layout.iconBtn,
}