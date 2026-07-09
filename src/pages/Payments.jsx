import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { CreditCard, User, DollarSign, Plus, ArrowLeft, TrendingUp, Wallet, Receipt } from "lucide-react"

export default function Payments() {
  const [view, setView] = useState("list")
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [form, setForm] = useState({
    client_name: "", amount: "", type: "deposit", method: "cash", notes: "",
  })

  useEffect(() => { fetchPayments() }, [])

  const fetchPayments = async () => {
    setListLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("artist_id", user.id)
    if (!error) setPayments(data)
    setListLoading(false)
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    if (!form.client_name || !form.amount) {
      setMessage("Please fill in client name and amount.")
      return
    }
    setLoading(true)
    setMessage("")
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("payments").insert([{
      ...form,
      amount: parseFloat(form.amount),
      artist_id: user.id,
      paid_at: new Date().toISOString(),
    }])
    if (error) {
      setMessage("Error: " + error.message)
    } else {
      setMessage("Payment recorded!")
      setForm({ client_name: "", amount: "", type: "deposit", method: "cash", notes: "" })
      fetchPayments()
      setTimeout(() => setView("list"), 1500)
    }
    setLoading(false)
  }

  const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
  const totalDeposits = payments.filter(p => p.type === "deposit").reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
  const totalFinal = payments.filter(p => p.type === "final").reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  const getMethodIcon = (method) => {
    if (method === "cash") return <Wallet size={18} color="#c9974a" />
    if (method === "card") return <CreditCard size={18} color="#4c9ac9" />
    if (method === "transfer") return <Receipt size={18} color="#2d6a4f" />
    return <DollarSign size={18} color="#c9974a" />
  }

  const getTypeColor = (type) => {
    if (type === "deposit") return "#c9974a"
    if (type === "final") return "#2d6a4f"
    if (type === "tip") return "#4c9ac9"
    return "#c9974a"
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <p style={styles.headerSub}>Track your revenue and transactions</p>
          <h1 style={styles.headerTitle}>Payments</h1>
        </div>
        <button
          style={styles.newBtn}
          onClick={() => setView(view === "list" ? "form" : "list")}
        >
          {view === "list"
            ? <><Plus size={16} /> Record Payment</>
            : <><ArrowLeft size={16} /> Back to List</>
          }
        </button>
      </div>

      <div style={styles.divider} />

      {/* Summary Cards */}
      {view === "list" && (
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}><TrendingUp size={18} color="#c9974a" /></div>
            <p style={styles.summaryLabel}>Total Revenue</p>
            <p style={styles.summaryValue}>${totalRevenue.toFixed(2)}</p>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}><Wallet size={18} color="#c9974a" /></div>
            <p style={styles.summaryLabel}>Total Deposits</p>
            <p style={{ ...styles.summaryValue, color: "#c9974a" }}>${totalDeposits.toFixed(2)}</p>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}><CreditCard size={18} color="#2d6a4f" /></div>
            <p style={styles.summaryLabel}>Final Payments</p>
            <p style={{ ...styles.summaryValue, color: "#2d6a4f" }}>${totalFinal.toFixed(2)}</p>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}><Receipt size={18} color="#888" /></div>
            <p style={styles.summaryLabel}>Transactions</p>
            <p style={styles.summaryValue}>{payments.length}</p>
          </div>
        </div>
      )}

      {/* Form */}
      {view === "form" && (
        <form style={styles.form} onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
          <div style={styles.field}>
            <label style={styles.label}>Client Name *</label>
            <div style={styles.inputWrapper}>
              <User size={15} color="#6b6b6b" style={styles.inputIcon} />
              <input style={styles.input} name="client_name" placeholder="e.g. John Smith" value={form.client_name} onChange={handleChange} />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Amount ($) *</label>
            <div style={styles.inputWrapper}>
              <DollarSign size={15} color="#6b6b6b" style={styles.inputIcon} />
              <input style={styles.input} name="amount" type="number" placeholder="e.g. 150" value={form.amount} onChange={handleChange} />
            </div>
          </div>
          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Payment Type</label>
              <select style={{ ...styles.input, paddingLeft: "16px" }} name="type" value={form.type} onChange={handleChange}>
                <option value="deposit">Deposit</option>
                <option value="final">Final Payment</option>
                <option value="tip">Tip</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Payment Method</label>
              <select style={{ ...styles.input, paddingLeft: "16px" }} name="method" value={form.method} onChange={handleChange}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="transfer">Bank Transfer</option>
              </select>
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Notes</label>
            <input style={{ ...styles.input, paddingLeft: "16px" }} name="notes" placeholder="Any additional notes..." value={form.notes} onChange={handleChange} />
          </div>
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Saving..." : "Record Payment"}
          </button>
          {message && <p style={styles.message}>{message}</p>}
        </form>
      )}

      {/* List */}
      {view === "list" && (
        <div style={styles.paymentsList}>
          {listLoading ? (
            <div style={styles.emptyState}>
              <CreditCard size={36} color="#5c5c5c" />
              <p style={styles.emptyText}>Loading payments…</p>
            </div>
          ) : payments.length === 0 ? (
            <div style={styles.emptyState}>
              <CreditCard size={36} color="#222" />
              <p style={styles.emptyText}>No payments recorded yet.</p>
            </div>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} style={styles.paymentCard}>
                <div style={styles.paymentIconBox}>
                  {getMethodIcon(payment.method)}
                </div>
                <div style={styles.paymentInfo}>
                  <h3 style={styles.paymentName}>{payment.client_name}</h3>
                  <p style={styles.paymentNote}>{payment.notes || "No notes"}</p>
                </div>
                <div style={styles.paymentRight}>
                  <span style={{
                    ...styles.typeBadge,
                    background: `${getTypeColor(payment.type)}15`,
                    color: getTypeColor(payment.type),
                    border: `1px solid ${getTypeColor(payment.type)}30`,
                  }}>
                    {payment.type}
                  </span>
                  <p style={styles.paymentAmount}>${parseFloat(payment.amount).toFixed(2)}</p>
                  <p style={styles.paymentDate}>
                    {new Date(payment.paid_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric"
                    })}
                  </p>
                </div>
              </div>
            ))
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
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" },
  summaryCard: { background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "20px 24px" },
  summaryIcon: { marginBottom: "12px" },
  summaryLabel: { color: "#6b6b6b", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px 0" },
  summaryValue: { color: "#f5f5f5", fontSize: "24px", fontWeight: "600", margin: 0, fontFamily: "'Playfair Display', serif" },
  form: { display: "flex", flexDirection: "column", gap: "20px", maxWidth: "700px" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  field: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "12px", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px" },
  inputWrapper: { position: "relative" },
  inputIcon: { position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" },
  input: { width: "100%", padding: "12px 16px 12px 40px", background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "8px", color: "#f5f5f5", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" },
  button: { padding: "13px", background: "#c9974a", border: "none", borderRadius: "8px", color: "#0a0a0a", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  message: { color: "#c9974a", fontSize: "13px", textAlign: "center", margin: 0 },
  paymentsList: { display: "flex", flexDirection: "column", gap: "12px" },
  paymentCard: { display: "flex", alignItems: "center", gap: "20px", background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "20px 24px" },
  paymentIconBox: { width: "44px", height: "44px", borderRadius: "10px", background: "#141416", border: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  paymentInfo: { flex: 1 },
  paymentName: { color: "#f5f5f5", fontSize: "16px", margin: "0 0 4px 0", fontWeight: "500" },
  paymentNote: { color: "#6b6b6b", fontSize: "13px", margin: 0 },
  paymentRight: { textAlign: "right" },
  typeBadge: { display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" },
  paymentAmount: { color: "#f5f5f5", fontSize: "20px", fontWeight: "600", margin: "0 0 2px 0", fontFamily: "'Playfair Display', serif" },
  paymentDate: { color: "#6b6b6b", fontSize: "12px", margin: 0 },
  emptyState: { background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "60px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" },
  emptyText: { color: "#5c5c5c", fontSize: "14px", margin: 0 },
}