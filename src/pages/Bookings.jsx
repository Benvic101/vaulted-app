import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { CalendarDays, Clock, User, Mail, FileText, Plus, ArrowLeft, DollarSign } from "lucide-react"

export default function Bookings() {
  const [view, setView] = useState("list")
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [message, setMessage] = useState("")
  const today = new Date().toISOString().split("T")[0]
  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    session_type: "Full Tattoo Session",
    date: "",
    time: "",
    price: "",
    notes: "",
  })

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

  const handleSubmit = async () => {
    if (!form.client_name || !form.date || !form.time || !form.price) {
      setMessage("Please fill in all required fields.")
      return
    }
    setLoading(true)
    setMessage("")
    const { data: { user } } = await supabase.auth.getUser()
    const deposit = (parseFloat(form.price) * 0.2).toFixed(2)
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
      setForm({
        client_name: "", client_email: "",
        session_type: "Full Tattoo Session",
        date: "", time: "", price: "", notes: "",
      })
      fetchBookings()
      setTimeout(() => setView("list"), 1500)
    }
    setLoading(false)
  }

  const getStatusColor = (status) => {
    if (status === "upcoming") return "#c9974a"
    if (status === "completed") return "#2d6a4f"
    if (status === "cancelled") return "#8b1a1a"
    return "#c9974a"
  }

  return (
    <div style={styles.container}>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <p style={styles.headerSub}>Manage your appointments</p>
          <h1 style={styles.headerTitle}>Bookings</h1>
        </div>
        <button
          style={styles.newBtn}
          onClick={() => setView(view === "list" ? "form" : "list")}
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

          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Client Name *</label>
              <div style={styles.inputWrapper}>
                <User size={15} color="#6b6b6b" style={styles.inputIcon} />
                <input style={styles.input} name="client_name" placeholder="e.g. John Smith" value={form.client_name} onChange={handleChange} />
              </div>
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

          <div style={styles.formGrid}>
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
            {loading ? "Saving..." : "Create Booking"}
          </button>

          {message && <p style={styles.message}>{message}</p>}
        </form>
      )}

      {/* List */}
      {view === "list" && (
        <div>
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
                <div key={booking.id} style={styles.bookingCard}>
                  <div style={styles.bookingDateBox}>
                    <span style={styles.bookingDay}>
                      {new Date(booking.date).toLocaleDateString("en-US", { day: "numeric" })}
                    </span>
                    <span style={styles.bookingMonth}>
                      {new Date(booking.date).toLocaleDateString("en-US", { month: "short" })}
                    </span>
                  </div>

                  <div style={styles.bookingInfo}>
                    <h3 style={styles.bookingName}>{booking.client_name}</h3>
                    <p style={styles.bookingMeta}>{booking.session_type} &nbsp;·&nbsp; {booking.time}</p>
                  </div>

                  <div style={styles.bookingRight}>
                    <span style={{
                      ...styles.statusBadge,
                      background: `${getStatusColor(booking.status)}15`,
                      color: getStatusColor(booking.status),
                      border: `1px solid ${getStatusColor(booking.status)}30`,
                    }}>
                      {booking.status}
                    </span>
                    <p style={styles.bookingPrice}>${booking.price}</p>
                    <p style={styles.bookingDeposit}>Deposit: ${booking.deposit}</p>
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
  depositBox: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(201,151,74,0.05)", border: "1px solid rgba(201,151,74,0.15)", borderRadius: "8px", padding: "16px 20px" },
  depositLabel: { color: "#666", fontSize: "13px" },
  depositValue: { color: "#c9974a", fontSize: "24px", fontFamily: "'Playfair Display', serif" },
  button: { padding: "13px", background: "#c9974a", border: "none", borderRadius: "8px", color: "#0a0a0a", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  message: { color: "#c9974a", fontSize: "13px", textAlign: "center", margin: 0 },
  emptyState: { background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "60px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" },
  emptyText: { color: "#5c5c5c", fontSize: "14px", margin: 0 },
  bookingsList: { display: "flex", flexDirection: "column", gap: "12px" },
  bookingCard: { display: "flex", alignItems: "center", gap: "24px", background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "20px 24px" },
  bookingDateBox: { display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(201,151,74,0.05)", border: "1px solid rgba(201,151,74,0.1)", borderRadius: "10px", padding: "12px 16px", minWidth: "56px" },
  bookingDay: { color: "#c9974a", fontSize: "22px", fontWeight: "600", fontFamily: "'Playfair Display', serif" },
  bookingMonth: { color: "#555", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" },
  bookingInfo: { flex: 1 },
  bookingName: { color: "#f5f5f5", fontSize: "16px", margin: "0 0 4px 0", fontWeight: "500" },
  bookingMeta: { color: "#6b6b6b", fontSize: "13px", margin: 0 },
  bookingRight: { textAlign: "right" },
  statusBadge: { display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" },
  bookingPrice: { color: "#f5f5f5", fontSize: "18px", fontWeight: "600", margin: "0 0 2px 0", fontFamily: "'Playfair Display', serif" },
  bookingDeposit: { color: "#6b6b6b", fontSize: "12px", margin: 0 },
}