import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { CreditCard, User, DollarSign, Plus, ArrowLeft, TrendingUp, Wallet, Receipt, Pencil, Trash2 } from "lucide-react"
import ClientPicker from "../components/ClientPicker"
import * as layout from "../styles/layout"

const emptyForm = { client_id: null, client_name: "", amount: "", type: "deposit", method: "cash", notes: "" }

export default function Payments() {
  const [view, setView] = useState("list")
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

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

  const openEdit = (payment) => {
    setEditingId(payment.id)
    setForm({
      client_id: payment.client_id ?? null,
      client_name: payment.client_name ?? "",
      amount: payment.amount != null ? String(payment.amount) : "",
      type: payment.type ?? "deposit",
      method: payment.method ?? "cash",
      notes: payment.notes ?? "",
    })
    setMessage("")
    setView("form")
  }

  const handleDelete = async (payment) => {
    if (!window.confirm(`Delete payment of $${parseFloat(payment.amount || 0).toFixed(2)} from ${payment.client_name}? This cannot be undone.`)) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from("payments")
      .delete()
      .eq("id", payment.id)
      .eq("artist_id", user.id)
      .select()
    if (error) {
      console.error("Payment delete error:", error)
      setMessage("Delete error: " + error.message)
      return
    }
    if (!data || data.length === 0) {
      console.error("Payment delete affected 0 rows", { id: payment.id, artist_id: user.id })
      setMessage("Delete failed — no matching row (check DELETE RLS policy).")
      return
    }
    setPayments((prev) => prev.filter((p) => p.id !== payment.id))
  }

  const handleSubmit = async () => {
    if (!form.client_name || !form.amount) {
      setMessage("Please fill in client name and amount.")
      return
    }
    setLoading(true)
    setMessage("")
    const { data: { user } } = await supabase.auth.getUser()

    if (editingId != null) {
      const { data, error } = await supabase
        .from("payments")
        .update({
          client_id: form.client_id,
          client_name: form.client_name,
          amount: parseFloat(form.amount),
          type: form.type,
          method: form.method,
          notes: form.notes,
        })
        .eq("id", editingId)
        .eq("artist_id", user.id)
        .select()
      if (error) {
        console.error("Payment update error:", error)
        setMessage("Error: " + error.message)
      } else if (!data || data.length === 0) {
        console.error("Payment update affected 0 rows", { editingId, artist_id: user.id })
        setMessage("Update failed — no matching row (check UPDATE RLS policy).")
      } else {
        setMessage("Payment updated!")
        fetchPayments()
        setTimeout(() => backToList(), 1500)
      }
    } else {
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
        setForm(emptyForm)
        fetchPayments()
        setTimeout(() => backToList(), 1500)
      }
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
    <div style={styles.container} className="vlt-page-shell">
      <div style={styles.header}>
        <div>
          <p style={styles.headerSub}>Track your revenue and transactions</p>
          <h1 style={styles.headerTitle}>Payments</h1>
        </div>
        <button
          style={styles.newBtn}
          onClick={() => (view === "list" ? openNew() : backToList())}
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
        <div style={styles.summaryGrid} className="vlt-kpi-grid">
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
            <label style={styles.label}>Client *</label>
            <ClientPicker
              value={form.client_id ? { id: form.client_id, name: form.client_name } : null}
              onChange={(c) => setForm((f) => ({
                ...f,
                client_id: c?.id ?? null,
                client_name: c?.name ?? "",
              }))}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Amount ($) *</label>
            <div style={styles.inputWrapper}>
              <DollarSign size={15} color="#6b6b6b" style={styles.inputIcon} />
              <input style={styles.input} name="amount" type="number" placeholder="e.g. 150" value={form.amount} onChange={handleChange} />
            </div>
          </div>
          <div style={styles.formGrid} className="vlt-form-grid">
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
            {loading ? "Saving..." : editingId ? "Save Changes" : "Record Payment"}
          </button>
          {message && <p style={styles.message}>{message}</p>}
        </form>
      )}

      {/* List */}
      {view === "list" && (
        <div style={styles.paymentsList}>
          {message && <p style={{ ...styles.message, textAlign: "left" }}>{message}</p>}
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
              <div key={payment.id} style={styles.paymentCard} className="vlt-card-row">
                <div style={styles.paymentIconBox}>
                  {getMethodIcon(payment.method)}
                </div>
                <div style={styles.paymentInfo}>
                  <h3 style={styles.paymentName}>{payment.client_name}</h3>
                  <p style={styles.paymentNote}>{payment.notes || "No notes"}</p>
                </div>
                <div style={styles.paymentRight} className="vlt-card-right">
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

                <div style={styles.rowActions} className="vlt-card-actions">
                  <button
                    type="button"
                    style={styles.iconBtn}
                    className="vlt-icon-btn"
                    aria-label={`Edit payment from ${payment.client_name}`}
                    onClick={() => openEdit(payment)}
                  >
                    <Pencil size={14} color="#8a8a8a" />
                  </button>
                  <button
                    type="button"
                    style={styles.iconBtn}
                    className="vlt-icon-btn"
                    aria-label={`Delete payment from ${payment.client_name}`}
                    onClick={() => handleDelete(payment)}
                  >
                    <Trash2 size={14} color="#8b1a1a" />
                  </button>
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
  container: layout.container,
  header: layout.header,
  headerSub: layout.headerSub,
  headerTitle: layout.headerTitle,
  newBtn: layout.newBtn,
  divider: layout.divider,
  summaryGrid: { display: "grid", gap: "16px", marginBottom: "32px" },
  summaryCard: { background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "20px 24px" },
  summaryIcon: { marginBottom: "12px" },
  summaryLabel: { color: "#6b6b6b", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px 0" },
  summaryValue: { color: "#f5f5f5", fontSize: "24px", fontWeight: "600", margin: 0, fontFamily: "'Playfair Display', serif" },
  form: { display: "flex", flexDirection: "column", gap: "20px", maxWidth: "700px" },
  formGrid: layout.formGrid,
  field: layout.field,
  label: layout.label,
  inputWrapper: layout.inputWrapper,
  inputIcon: layout.inputIcon,
  input: { ...layout.input, background: "#0f0f10" },
  button: layout.button,
  message: layout.message,
  paymentsList: { display: "flex", flexDirection: "column", gap: "12px" },
  paymentCard: { display: "flex", gap: "20px", background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "20px 24px" },
  paymentIconBox: { width: "44px", height: "44px", borderRadius: "10px", background: "#141416", border: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  paymentInfo: { flex: 1 },
  paymentName: { color: "#f5f5f5", fontSize: "16px", margin: "0 0 4px 0", fontWeight: "500" },
  paymentNote: { color: "#6b6b6b", fontSize: "13px", margin: 0 },
  paymentRight: {},
  typeBadge: { display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" },
  paymentAmount: { color: "#f5f5f5", fontSize: "20px", fontWeight: "600", margin: "0 0 2px 0", fontFamily: "'Playfair Display', serif" },
  paymentDate: { color: "#6b6b6b", fontSize: "12px", margin: 0 },
  emptyState: layout.emptyState,
  emptyText: layout.emptyText,
  rowActions: layout.rowActions,
  iconBtn: layout.iconBtn,
}