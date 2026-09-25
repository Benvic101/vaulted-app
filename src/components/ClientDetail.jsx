import { useState, useEffect, useRef } from "react"
import { supabase } from "../supabase"
import ListError from "./ListError"
import { parseLocalDate } from '../utils/dateHelpers';

import {
  User, Mail, Phone, FileText, ArrowLeft, Pencil, Trash2,
  CalendarDays, Clock, CreditCard, CheckSquare,
  Clock as ClockIcon, Image as ImageIcon, TrendingUp, Wallet,
} from "lucide-react"

const getBookingStatusColor = (status) => {
  if (status === "upcoming") return "var(--accent-gold)"
  if (status === "completed") return "var(--success-primary)"
  if (status === "cancelled") return "var(--danger-primary)"
  return "var(--accent-gold)"
}

const getPaymentTypeColor = (type) => {
  if (type === "deposit") return "var(--accent-gold)"
  if (type === "final") return "var(--success-primary)"
  if (type === "tip") return "var(--info-primary)"
  return "var(--accent-gold)"
}

export default function ClientDetail({ client, onBack, onEdit, onDeleted }) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [bookings, setBookings] = useState([])
  const [payments, setPayments] = useState([])
  const [forms, setForms] = useState([])
  const [message, setMessage] = useState("")

  const loadRelated = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setLoading(true)
    setLoadError(null)

    // Three independent queries fired together — related-data pull for one
    // client's detail page, not a chain of dependent calls. Promise.all
    // keeps wall-clock time to the slowest single query, and failure in
    // one table doesn't block the other two from rendering.
    const [bookingsRes, paymentsRes, formsRes] = await Promise.all([
      supabase.from("bookings").select("*").eq("artist_id", user.id).eq("client_id", client.id).order("date", { ascending: false }),
      supabase.from("payments").select("*").eq("artist_id", user.id).eq("client_id", client.id).order("paid_at", { ascending: false }),
      supabase.from("consent_forms").select("*").eq("artist_id", user.id).eq("client_id", client.id).order("date", { ascending: false }),
    ])

    if (!isMountedRef.current) return

    // Surface the first failure in the UI; the others still log and
    // their data (if any) still renders — a partial load beats a blank page.
    const firstError = bookingsRes.error || paymentsRes.error || formsRes.error
    if (firstError) {
      console.error("Client detail fetch error:", firstError)
      setLoadError(firstError.message)
    }
    if (bookingsRes.error) console.error("Client detail bookings fetch error:", bookingsRes.error)
    if (paymentsRes.error) console.error("Client detail payments fetch error:", paymentsRes.error)
    if (formsRes.error) console.error("Client detail consent forms fetch error:", formsRes.error)

    setBookings(bookingsRes.data || [])
    setPayments(paymentsRes.data || [])
    setForms(formsRes.data || [])
    setLoading(false)
  }

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    loadRelated()
    return () => { isMountedRef.current = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id])

  const handleDelete = async () => {
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
    onDeleted()
  }

  const totalSpent = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
  const upcomingBooking = bookings
    .filter((b) => b.status === "upcoming")
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0]
  const lastVisit = bookings
    .filter((b) => b.status === "completed")
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
  const signedForms = forms.filter((f) => f.status !== "sent").length
  const pendingForms = forms.filter((f) => f.status === "sent").length

  const summaryCards = [
    { label: "Total Bookings", value: bookings.length, icon: <CalendarDays size={18} /> },
    {
      label: "Upcoming Booking",
      value: upcomingBooking
        ? parseLocalDate(upcomingBooking.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "None scheduled",
      icon: <ClockIcon size={18} />,
    },
    { label: "Total Payments", value: payments.length, icon: <CreditCard size={18} /> },
    { label: "Total Spent", value: `$${totalSpent.toFixed(2)}`, icon: <TrendingUp size={18} />, accent: "var(--success-primary)" },
    {
      label: "Consent Forms",
      value: forms.length,
      sub: pendingForms > 0 ? `${signedForms} signed · ${pendingForms} pending` : forms.length > 0 ? "All signed" : null,
      icon: <FileText size={18} />,
    },
    {
      label: "Last Visit",
      value: lastVisit
        ? parseLocalDate(lastVisit.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "No visits yet",
      icon: <CheckSquare size={18} />,
    },
  ]

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <button type="button" style={styles.backBtn} onClick={onBack}>
          <ArrowLeft size={15} /> Back to Clients
        </button>
        <div style={styles.headerRow} className="vlt-header-row">
          <div style={styles.headerLeft}>
            <div style={styles.avatar}>{client.name.charAt(0).toUpperCase()}</div>
            <div>
              <h1 style={styles.name}>{client.name}</h1>
              <div style={styles.metaRow}>
                <span style={styles.metaItem}><Mail size={13} color="var(--text-tertiary)" /> {client.email}</span>
                {client.phone && <span style={styles.metaItem}><Phone size={13} color="var(--text-tertiary)" /> {client.phone}</span>}
              </div>
              {client.notes && <p style={styles.notes}>{client.notes}</p>}
            </div>
          </div>
          <div style={styles.headerActions}>
            <button type="button" style={styles.iconBtnOutline} aria-label={`Edit client ${client.name}`} onClick={onEdit}>
              <Pencil size={14} color="var(--text-secondary)" />
            </button>
            <button type="button" style={styles.iconBtnOutline} aria-label={`Delete client ${client.name}`} onClick={handleDelete}>
              <Trash2 size={14} color="var(--danger-primary)" />
            </button>
          </div>
        </div>
        {message && <p style={styles.message}>{message}</p>}
      </div>

      <div style={styles.divider} />

      <p style={styles.legacyNote}>
        Showing activity linked to this client record. Bookings, payments, or consent forms created before
        the client picker existed (or entered as free text) may not appear here.
      </p>

      {loading ? (
        <div style={styles.emptyState}>
          <User size={36} color="var(--text-muted)" />
          <p style={styles.emptyText}>Loading client history…</p>
        </div>
      ) : loadError ? (
        <ListError message={"Couldn't load client history — " + loadError} onRetry={loadRelated} />
      ) : (
        <>
          {/* Relationship Summary */}
          <div style={styles.summaryGrid} className="vlt-summary-grid">
            {summaryCards.map((card) => (
              <div key={card.label} style={styles.summaryCard}>
                <div style={{ ...styles.summaryIcon, color: card.accent || "var(--accent-gold)" }}>{card.icon}</div>
                <p style={styles.summaryValue}>{card.value}</p>
                <p style={styles.summaryLabel}>{card.label}</p>
                {card.sub && <p style={styles.summarySub}>{card.sub}</p>}
              </div>
            ))}
          </div>

          {/* Bookings */}
          <h2 style={styles.sectionTitle}>Bookings</h2>
          {bookings.length === 0 ? (
            <div style={styles.emptyState}>
              <CalendarDays size={32} color="var(--text-tertiary)" />
              <p style={styles.emptyText}>No bookings for this client yet.</p>
            </div>
          ) : (
            <div style={styles.list}>
              {bookings.map((b) => (
                <div key={b.id} style={styles.row} className="vlt-card-row">
                  <div style={styles.rowDateBox}>
                    <span style={styles.rowDay}>{parseLocalDate(b.date).toLocaleDateString("en-US", { day: "numeric" })}</span>
                    <span style={styles.rowMonth}>{parseLocalDate(b.date).toLocaleDateString("en-US", { month: "short" })}</span>
                  </div>
                  <div style={styles.rowInfo}>
                    <h3 style={styles.rowTitle}>{b.session_type}</h3>
                    <p style={styles.rowMeta}>
                      <Clock size={12} color="var(--text-tertiary)" style={{ verticalAlign: "-2px", marginRight: "4px" }} />
                      {b.time}{b.notes ? ` · ${b.notes}` : ""}
                    </p>
                  </div>
                  <div style={styles.rowRight} className="vlt-card-right">
                    <span style={{
                      ...styles.statusBadge,
                      background: `${getBookingStatusColor(b.status)}15`,
                      color: getBookingStatusColor(b.status),
                      border: `1px solid ${getBookingStatusColor(b.status)}30`,
                    }}>
                      {b.status}
                    </span>
                    <p style={styles.rowPrice}>${b.price}</p>
                    <p style={styles.rowSub}>Deposit: ${b.deposit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payments */}
          <h2 style={styles.sectionTitle}>Payments</h2>
          {payments.length === 0 ? (
            <div style={styles.emptyState}>
              <CreditCard size={32} color="var(--text-tertiary)" />
              <p style={styles.emptyText}>No payments recorded for this client yet.</p>
            </div>
          ) : (
            <>
              <div style={styles.totalsRow}>
                <Wallet size={13} color="var(--text-tertiary)" />
                <span style={styles.totalsText}>${totalSpent.toFixed(2)} total across {payments.length} payment{payments.length === 1 ? "" : "s"}</span>
              </div>
              <div style={styles.list}>
                {payments.map((p) => (
                  <div key={p.id} style={styles.row} className="vlt-card-row">
                    <div style={styles.rowInfo}>
                      <h3 style={styles.rowTitle}>${parseFloat(p.amount).toFixed(2)}</h3>
                      <p style={styles.rowMeta}>{p.method} {p.notes ? `· ${p.notes}` : ""}</p>
                    </div>
                    <div style={styles.rowRight} className="vlt-card-right">
                      <span style={{
                        ...styles.statusBadge,
                        background: `${getPaymentTypeColor(p.type)}15`,
                        color: getPaymentTypeColor(p.type),
                        border: `1px solid ${getPaymentTypeColor(p.type)}30`,
                      }}>
                        {p.type}
                      </span>
                      <p style={styles.rowSub}>
                        {new Date(p.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Consent Forms */}
          <h2 style={styles.sectionTitle}>Consent Forms</h2>
          {forms.length === 0 ? (
            <div style={styles.emptyState}>
              <FileText size={32} color="var(--text-tertiary)" />
              <p style={styles.emptyText}>No consent forms for this client yet.</p>
            </div>
          ) : (
            <div style={styles.list}>
              {forms.map((f) => (
                <div key={f.id} style={styles.row} className="vlt-card-row">
                  <div style={styles.rowInfo}>
                    <h3 style={styles.rowTitle}>{parseLocalDate(f.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</h3>
                    <p style={styles.rowMeta}>{f.client_email}</p>
                  </div>
                  <div style={styles.rowRight} className="vlt-card-right">
                    {f.status === "sent" ? (
                      <span style={styles.sentBadge}><ClockIcon size={11} /> Awaiting Signature</span>
                    ) : (
                      <span style={styles.signedBadge}><CheckSquare size={11} /> Signed</span>
                    )}
                    {f.edited_at && (
                      <span style={styles.editedBadge}>
                        Edited {new Date(f.edited_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                    {f.signed_at && (
                      <p style={styles.rowSub}>
                        {new Date(f.signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Portfolio — placeholder: portfolio_items has no client link in the schema yet */}
          <h2 style={styles.sectionTitle}>Portfolio</h2>
          <div style={styles.emptyState}>
            <ImageIcon size={32} color="var(--text-tertiary)" />
            <p style={styles.emptyText}>
              Portfolio pieces aren't linked to individual clients yet — this section will populate
              once that relationship exists.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  header: { marginBottom: "8px" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", color: "var(--text-tertiary)", fontSize: "13px", cursor: "pointer", padding: 0, marginBottom: "20px", fontFamily: "'DM Sans', sans-serif" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  headerLeft: { display: "flex", gap: "20px", alignItems: "flex-start" },
  avatar: { width: "56px", height: "56px", borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dark))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: "600", color: "var(--text-on-accent)", flexShrink: 0, fontFamily: "'Playfair Display', serif" },
  name: { fontFamily: "'Playfair Display', serif", fontSize: "28px", color: "var(--text-primary)", margin: "0 0 8px 0", fontWeight: "600" },
  metaRow: { display: "flex", gap: "16px", flexWrap: "wrap" },
  metaItem: { display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "13px" },
  notes: { color: "var(--text-muted)", fontSize: "13px", margin: "10px 0 0 0", fontStyle: "italic", maxWidth: "480px" },
  headerActions: { display: "flex", gap: "8px" },
  iconBtnOutline: { background: "transparent", border: "1px solid var(--border-secondary)", padding: "8px", cursor: "pointer", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" },
  message: { color: "var(--accent-gold)", fontSize: "13px", margin: "12px 0 0 0" },
  divider: { height: "1px", background: "var(--border-primary)", margin: "24px 0" },
  legacyNote: { color: "var(--text-muted)", fontSize: "12px", margin: "0 0 32px 0", lineHeight: "1.6", maxWidth: "620px" },
  summaryGrid: { display: "grid", gap: "16px", marginBottom: "48px" },
  summaryCard: { background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", borderRadius: "12px", padding: "20px 24px" },
  summaryIcon: { marginBottom: "12px" },
  summaryValue: { color: "var(--text-primary)", fontSize: "22px", fontWeight: "600", margin: "0 0 6px 0", fontFamily: "'Playfair Display', serif" },
  summaryLabel: { color: "var(--text-tertiary)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 },
  summarySub: { color: "var(--text-muted)", fontSize: "11px", margin: "6px 0 0 0" },
  sectionTitle: { fontFamily: "'Playfair Display', serif", fontSize: "18px", color: "var(--text-primary)", fontWeight: "400", margin: "0 0 20px 0" },
  list: { display: "flex", flexDirection: "column", gap: "12px", marginBottom: "48px" },
  row: { display: "flex", gap: "20px", background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", borderRadius: "12px", padding: "18px 22px" },
  rowDateBox: { display: "flex", flexDirection: "column", alignItems: "center", background: "var(--warning-bg-subtle)", border: "1px solid var(--warning-border-subtle)", borderRadius: "10px", padding: "10px 14px", minWidth: "50px" },
  rowDay: { color: "var(--accent-gold)", fontSize: "18px", fontWeight: "600", fontFamily: "'Playfair Display', serif" },
  rowMonth: { color: "var(--text-muted)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px" },
  rowInfo: { flex: 1 },
  rowTitle: { color: "var(--text-primary)", fontSize: "15px", margin: "0 0 4px 0", fontWeight: "500" },
  rowMeta: { color: "var(--text-tertiary)", fontSize: "13px", margin: 0 },
  rowRight: {},
  rowPrice: { color: "var(--text-primary)", fontSize: "17px", fontWeight: "600", margin: "0 0 2px 0", fontFamily: "'Playfair Display', serif" },
  rowSub: { color: "var(--text-tertiary)", fontSize: "12px", margin: 0 },
  statusBadge: { display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" },
  signedBadge: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: "var(--success-bg)", color: "var(--success-primary)", border: "1px solid var(--success-border)", marginBottom: "8px" },
  sentBadge: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: "var(--warning-bg)", color: "var(--warning-primary)", border: "1px solid var(--warning-border)", marginBottom: "8px" },
  editedBadge: { display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: "600", background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-secondary)", marginBottom: "8px" },
  totalsRow: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" },
  totalsText: { color: "var(--text-secondary)", fontSize: "13px" },
  emptyState: { background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", borderRadius: "12px", padding: "40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", marginBottom: "48px" },
  emptyText: { color: "var(--text-muted)", fontSize: "13px", margin: 0, maxWidth: "420px" },
}
