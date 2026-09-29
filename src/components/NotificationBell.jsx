import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { supabase } from "../supabase"
import { Bell, CalendarDays, FileText, MailX, AlertTriangle, CheckCheck } from "lucide-react"
import withTimeout from "../utils/withTimeout"

// Mission 14, Phase 2: in-app notification bell + panel.
//
// Freshness (agreed): fetch on mount and when the tab regains focus. No
// Supabase Realtime for now.
//
// The component is fully self-contained: the caller only places it. It reads
// its own auth (getSession — local, can't hang), fetches with withTimeout,
// and navigates via the onPage callback (the shell has no router — Dashboard
// owns activePage).
//
// Theme: every color is a token, so light and dark both work unchanged.

const TYPE_ICONS = {
  consent_signed: { icon: FileText, color: "var(--success-primary)" },
  booking_upcoming: { icon: CalendarDays, color: "var(--accent-gold)" },
  reminder_failed: { icon: MailX, color: "var(--danger-primary)" },
}

function relativeTime(iso) {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const mins = Math.floor((Date.now() - then) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function NotificationBell({ onPage }) {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const panelRef = useRef(null)
  const bellWrapRef = useRef(null)
  const bellBtnRef = useRef(null)
  // Panel coordinates. The panel renders in a portal to document.body with
  // position: fixed, so no ancestor (the fixed sidebar, overflow rules,
  // z-index stacking) can clip or bury it. Computed from the bell button's
  // rect on open and on resize/scroll-of-window, clamped to stay inside the
  // viewport with an 8px margin.
  const [panelPos, setPanelPos] = useState(null)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    // getSession reads local storage — no network round-trip, so it can't
    // hang when offline (same reasoning as every list page, Mission 12).
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) {
      setError("You're not signed in.")
      setLoading(false)
      return
    }
    const { data, error: fetchError } = await withTimeout(
      supabase
        .from("notifications")
        .select("*")
        .eq("artist_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      15000,
      "Loading notifications"
    )
    if (fetchError) {
      console.error("Notifications fetch error:", fetchError)
      setError(fetchError.message)
    } else {
      setNotifications(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchNotifications()
    // Refresh when the tab regains focus — the cron runs daily server-side,
    // so the freshest source of new rows is the artist returning to the app.
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchNotifications()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [fetchNotifications])

  // Close the panel on any click outside it (desktop dropdown behavior).
  // Clicks on the bell button itself are ignored — the button's own onClick
  // toggles, and since the panel is portaled to document.body it is no longer
  // spatially "outside" in a way the old wrapper check covered; without this
  // guard, a mousedown on the bell would close the panel before the click's
  // toggle ran (open→close→open churn or instant close).
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          bellBtnRef.current && !bellBtnRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  // Position the panel from the bell button's viewport rect. useLayoutEffect
  // so the first portal paint already has coordinates (no one-frame flash at
  // 0,0). Fixed positioning + viewport clamping with an 8px margin keeps the
  // panel fully on-screen regardless of where the bell sits — the sidebar bell
  // hugs the left viewport edge, where plain right:0 anchoring would push the
  // panel off-screen (the original bug). Recomputed on resize; window scroll
  // doesn't apply to the fixed sidebar, but recompute anyway for safety.
  const updatePanelPos = useCallback(() => {
    const rect = bellBtnRef.current?.getBoundingClientRect()
    if (!rect) return
    const margin = 8
    const width = Math.min(340, window.innerWidth - margin * 2)
    let left = rect.right - width
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin))
    let top = rect.bottom + 8
    const maxTop = window.innerHeight - Math.min(420, window.innerHeight - margin * 2) - margin
    top = Math.max(margin, Math.min(top, maxTop))
    setPanelPos({ left, top, width })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePanelPos()
    window.addEventListener("resize", updatePanelPos)
    return () => window.removeEventListener("resize", updatePanelPos)
  }, [open, updatePanelPos])

  const unreadCount = notifications.filter((n) => !n.read_at).length

  const markRead = async (n) => {
    if (n.read_at) return
    // Optimistic: the row must leave the unread set immediately — this click
    // is also navigation away, so a slow round-trip would leave a stale badge.
    setNotifications((list) =>
      list.map((item) => (item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item))
    )
    const { data: { session } } = await supabase.auth.getSession()
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", n.id)
      .eq("artist_id", session?.user?.id)
    if (updateError) {
      console.error("Mark notification read failed:", updateError)
      fetchNotifications() // revert to server truth on failure
    }
  }

  const markAllRead = async () => {
    setNotifications((list) =>
      list.map((item) => (item.read_at ? item : { ...item, read_at: new Date().toISOString() }))
    )
    const { data: { session } } = await supabase.auth.getSession()
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("artist_id", session?.user?.id)
      .is("read_at", null)
    if (updateError) {
      console.error("Mark all read failed:", updateError)
      fetchNotifications()
    }
  }

  // Where a notification takes the artist. The shell's activePage values are
  // the lowercase nav labels ("bookings", "clients", "consent forms").
  const targetPage = (n) => {
    if (n.entity_type === "booking") return "bookings"
    if (n.entity_type === "consent_form") return "consent forms"
    if (n.entity_type === "reminder") return "bookings"
    return null
  }

  const handleItemClick = (n) => {
    markRead(n)
    setOpen(false)
    const page = targetPage(n)
    if (page && onPage) onPage(page)
  }

  return (
    <div ref={bellWrapRef} style={styles.wrap} className="vlt-notif-wrap">
      <button
        type="button"
        ref={bellBtnRef}
        style={styles.bellBtn}
        className="vlt-icon-btn vlt-notif-bell"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o)
          if (!open) fetchNotifications()
        }}
      >
        <Bell size={18} color="var(--text-secondary)" />
        {unreadCount > 0 && (
          <span style={styles.badge} className="vlt-notif-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && panelPos && createPortal(
        <div
          ref={panelRef}
          style={{ ...styles.panel, left: panelPos.left, top: panelPos.top, width: panelPos.width }}
          className="vlt-notif-panel"
          role="dialog"
          aria-label="Notifications"
        >
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Notifications</span>
            {unreadCount > 0 && (
              <button type="button" style={styles.markAllBtn} onClick={markAllRead}>
                <CheckCheck size={13} /> Mark all as read
              </button>
            )}
          </div>
          <div style={styles.panelBody} className="vlt-notif-body">
            {loading && notifications.length === 0 ? (
              <p style={styles.emptyText}>Loading…</p>
            ) : error ? (
              <div style={styles.errorBox}>
                <AlertTriangle size={16} color="var(--danger-secondary)" style={{ flexShrink: 0 }} />
                <p style={styles.errorText}>Couldn't load notifications — {error}</p>
                <button type="button" style={styles.retryBtn} onClick={fetchNotifications}>Try again</button>
              </div>
            ) : notifications.length === 0 ? (
              <p style={styles.emptyText}>You're all caught up — no notifications yet.</p>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_ICONS[n.type] || TYPE_ICONS.consent_signed
                const Icon = meta.icon
                return (
                  <button
                    key={n.id}
                    type="button"
                    style={{
                      ...styles.item,
                      background: n.read_at ? "transparent" : "var(--warning-bg)",
                    }}
                    onClick={() => handleItemClick(n)}
                  >
                    <span style={{ ...styles.itemIcon, color: meta.color }}>
                      <Icon size={16} />
                    </span>
                    <span style={styles.itemContent}>
                      <span style={styles.itemTitleRow}>
                        <span style={{ ...styles.itemTitle, fontWeight: n.read_at ? 500 : 600 }}>{n.title}</span>
                        {!n.read_at && <span style={styles.unreadDot} />}
                      </span>
                      {n.body && <span style={styles.itemBody}>{n.body}</span>}
                      <span style={styles.itemTime}>{relativeTime(n.created_at)}</span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const styles = {
  wrap: { position: "relative", display: "inline-block" },
  bellBtn: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    background: "transparent",
    border: "1px solid var(--border-tertiary)",
    borderRadius: "8px",
    cursor: "pointer",
  },
  badge: {
    position: "absolute",
    top: "-6px",
    right: "-6px",
    minWidth: "17px",
    height: "17px",
    padding: "0 4px",
    borderRadius: "9px",
    background: "var(--accent-gold)",
    color: "var(--text-on-accent)",
    fontSize: "10px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    boxSizing: "border-box",
  },
  panel: {
    // Position/size are set inline from panelPos (computed from the bell
    // button's rect, viewport-clamped) — the component renders in a portal
    // to document.body with position: fixed so no sidebar clipping/stacking
    // can affect it.
    position: "fixed",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-primary)",
    borderRadius: "12px",
    boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
    overflow: "hidden",
    zIndex: 60,
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    borderBottom: "1px solid var(--border-primary)",
  },
  panelTitle: {
    color: "var(--text-primary)",
    fontSize: "13px",
    fontWeight: "600",
    fontFamily: "'DM Sans', sans-serif",
  },
  markAllBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    background: "transparent",
    border: "none",
    color: "var(--accent-gold)",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    padding: 0,
  },
  panelBody: {
    maxHeight: "380px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
  item: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    width: "100%",
    padding: "14px 16px",
    border: "none",
    borderBottom: "1px solid var(--border-primary)",
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  itemIcon: { flexShrink: 0, marginTop: "1px" },
  itemContent: { display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 },
  itemTitleRow: { display: "flex", alignItems: "center", gap: "6px" },
  itemTitle: {
    color: "var(--text-primary)",
    fontSize: "13px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  unreadDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "var(--accent-gold)",
    flexShrink: 0,
  },
  itemBody: {
    color: "var(--text-secondary)",
    fontSize: "12px",
    lineHeight: 1.5,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  itemTime: { color: "var(--text-muted)", fontSize: "11px" },
  emptyText: {
    color: "var(--text-tertiary)",
    fontSize: "13px",
    textAlign: "center",
    padding: "28px 16px",
    margin: 0,
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    padding: "16px",
  },
  errorText: {
    color: "var(--danger-secondary)",
    fontSize: "12px",
    margin: 0,
    flex: 1,
    minWidth: "160px",
    lineHeight: 1.5,
  },
  retryBtn: {
    background: "transparent",
    border: "1px solid var(--danger-border)",
    borderRadius: "6px",
    padding: "5px 10px",
    color: "var(--danger-secondary)",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    flexShrink: 0,
  },
}
