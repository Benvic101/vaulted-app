import { useEffect, useState } from "react"
import { supabase } from "../supabase"
import logo from "../assets/logo.png"
import Bookings from "./Bookings"
import Clients from "./Clients"
import ConsentForms from "./ConsentForms"
import Payments from "./Payments"
import Settings from "./Settings"
import Portfolio from "./Portfolio"
import {
  LayoutDashboard, CalendarDays, Users, FileText,
  Image, CreditCard, SettingsIcon, LogOut, TrendingUp, Menu, X
} from "lucide-react"

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [activePage, setActivePage] = useState("dashboard")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalClients: 0,
    bookingsThisWeek: 0,
    revenueThisMonth: 0,
    consentForms: 0,
  })

    const fetchStats = async (artistId) => {
    setStatsLoading(true)
    const { count: clientCount } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("artist_id", artistId)

    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const { count: bookingCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("artist_id", artistId)
      .gte("date", weekStart.toISOString().split("T")[0])

    const monthStart = new Date()
    monthStart.setDate(1)
    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("artist_id", artistId)
      .gte("paid_at", monthStart.toISOString())

    const revenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0

    const { count: consentCount } = await supabase
      .from("consent_forms")
      .select("*", { count: "exact", head: true })
      .eq("artist_id", artistId)
      .gte("signed_at", monthStart.toISOString())

    setStats({
      totalClients: clientCount || 0,
      bookingsThisWeek: bookingCount || 0,
      revenueThisMonth: revenue,
      consentForms: consentCount || 0,
    })
    setStatsLoading(false)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [])

  useEffect(() => {
    if (activePage === "dashboard" && user?.id) {
      fetchStats(user.id)
    }
  }, [activePage, user?.id])


  const navItems = [
    { icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { icon: <CalendarDays size={18} />, label: "Bookings" },
    { icon: <Users size={18} />, label: "Clients" },
    { icon: <FileText size={18} />, label: "Consent Forms" },
    { icon: <Image size={18} />, label: "Portfolio" },
    { icon: <CreditCard size={18} />, label: "Payments" },
    { icon: <SettingsIcon size={18} />, label: "Settings" },
  ]

  const statCards = [
    { label: "Total Clients", value: stats.totalClients, icon: <Users size={20} />, color: "#c9974a" },
    { label: "Bookings This Week", value: stats.bookingsThisWeek, icon: <CalendarDays size={20} />, color: "#c9974a" },
    { label: "Revenue This Month", value: `$${stats.revenueThisMonth.toFixed(2)}`, icon: <TrendingUp size={20} />, color: "#2d6a4f" },
    { label: "Forms Signed This Month", value: stats.consentForms, icon: <FileText size={20} />, color: "#8b1a1a" },
  ]

  const quickActions = [
    { label: "New Booking", icon: <CalendarDays size={24} />, color: "#c9974a", page: "bookings" },
    { label: "Add Client", icon: <Users size={24} />, color: "#4c9ac9", page: "clients" },
    { label: "Consent Forms", icon: <FileText size={24} />, color: "#8b1a1a", page: "consent forms" },
    { label: "Payments", icon: <CreditCard size={24} />, color: "#2d6a4f", page: "payments" },
  ]

  const closeDrawer = () => setDrawerOpen(false)

  return (
    <div style={styles.container} className="vlt-full-height">

      {/* Mobile top bar — hidden above the mobile breakpoint via CSS */}
      <div style={styles.mobileTopbar} className="vlt-mobile-topbar">
        <button
          type="button"
          style={styles.hamburgerBtn}
          aria-label={drawerOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={drawerOpen}
          aria-controls="vlt-sidebar-nav"
          onClick={() => setDrawerOpen((open) => !open)}
        >
          {drawerOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <img
          src={logo}
          alt="Vaulted"
          style={{ width: "26px", height: "26px", objectFit: "cover", borderRadius: "50%", border: "1px solid #1e1e1e" }}
        />
        <h2 style={styles.mobileTopbarTitle}>Vaulted</h2>
      </div>

      {/* Scrim — only rendered visually on mobile while the drawer is open */}
      <div
        className={`vlt-drawer-overlay${drawerOpen ? " vlt-drawer-overlay-visible" : ""}`}
        onClick={closeDrawer}
      />

      {/* Sidebar — permanent on desktop, icon rail on tablet, off-canvas drawer on mobile */}
      <div
        id="vlt-sidebar-nav"
        style={styles.sidebar}
        className={`vlt-sidebar${drawerOpen ? " vlt-sidebar-open" : ""}`}
      >
        <div style={styles.sidebarBrand}>
          <img
  src={logo}
  alt="Vaulted"
  style={{
    width: "32px",
    height: "32px",
    objectFit: "cover",
    borderRadius: "50%",
    border: "1px solid #1e1e1e",
  }}
/>
          <h2 style={styles.sidebarTitle}>Vaulted</h2>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => {
            const isActive = activePage === item.label.toLowerCase()
            return (
              <button
                key={item.label}
                type="button"
                aria-current={isActive ? "page" : undefined}
                style={{
                  ...styles.navItem,
                  background: isActive ? "rgba(201,151,74,0.1)" : "transparent",
                  borderLeft: isActive ? "2px solid #c9974a" : "2px solid transparent",
                  color: isActive ? "#c9974a" : "#555",
                }}
                onClick={() => {
                  setActivePage(item.label.toLowerCase())
                  closeDrawer()
                }}
              >
                {item.icon}
                <span style={styles.navLabel} className="vlt-sidebar-label">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <button
          type="button"
          style={styles.logoutBtn}
          onClick={() => supabase.auth.signOut()}
        >
          <LogOut size={16} />
          <span className="vlt-sidebar-label">Logout</span>
        </button>
      </div>

      {/* Main */}
      <div style={styles.main} className="vlt-main">
        {/* Mobile-only spacer pushes content below the fixed top bar without
            touching main's own padding property (avoids any inline/class
            override collision on the same property). Lives inside main,
            stacked in normal block flow above the page content — main
            itself has no flex-direction, so this sits above, not beside. */}
        <div className="vlt-mobile-topbar-spacer" />
        {activePage === "bookings" && <Bookings />}
        {activePage === "clients" && <Clients />}
        {activePage === "consent forms" && <ConsentForms />}
        {activePage === "payments" && <Payments />}
        {activePage === "settings" && <Settings />}
        {activePage === "portfolio" && <Portfolio />}

        {activePage === "dashboard" && (
          <>
            {/* Header */}
            <div style={styles.header} className="vlt-dashboard-header">
              <div>
                <p style={styles.headerGreeting}>Good day,</p>
                <h1 style={styles.headerTitle}>{user?.email?.split("@")[0]}</h1>
              </div>
              <div style={styles.headerDate}>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long", year: "numeric",
                  month: "long", day: "numeric",
                })}
              </div>
            </div>

            {/* Divider */}
            <div style={styles.divider} />

            {/* Reorderable content: on mobile, Today's Appointments moves to
                the top (see .vlt-order-* in index.css); desktop/tablet keep
                the original KPIs -> Quick Actions -> Appointments order. */}
            <div className="vlt-dashboard-content">
              <div className="vlt-order-stats">
                <div style={styles.statsGrid} className="vlt-kpi-grid">
                  {statCards.map((stat) => (
                    <div key={stat.label} style={styles.statCard}>
                      <div style={{ ...styles.statIconBox, color: stat.color }}>
                        {stat.icon}
                      </div>
                      <div style={styles.statValue}>
                        {statsLoading ? <span style={styles.statValueSkeleton}>—</span> : stat.value}
                      </div>
                      <div style={styles.statLabel}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="vlt-order-actions">
                <h2 style={styles.sectionTitle}>Quick Actions</h2>
                <div style={styles.actionsGrid} className="vlt-action-grid">
                  {quickActions.map((action) => (
                    <div
                      key={action.label}
                      style={{ ...styles.actionCard, borderTop: `3px solid ${action.color}` }}
                      onClick={() => setActivePage(action.page)}
                    >
                      <div style={{ color: action.color, marginBottom: "12px" }}>
                        {action.icon}
                      </div>
                      <div style={styles.actionLabel}>{action.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="vlt-order-appointments" style={{ marginBottom: "48px" }}>
                <h2 style={styles.sectionTitle}>Today's Appointments</h2>
                <TodayAppointments artistId={user?.id} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TodayAppointments({ artistId }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!artistId) return
    setLoading(true)
    const today = new Date().toISOString().split("T")[0]
    supabase
      .from("bookings")
      .select("*")
      .eq("artist_id", artistId)
      .eq("date", today)
      .then(({ data }) => {
        setAppointments(data || [])
        setLoading(false)
      })
  }, [artistId])

  if (loading) {
    return (
      <div style={styles.emptyState}>
        <CalendarDays size={32} color="#5c5c5c" />
        <p style={styles.emptyText}>Loading appointments…</p>
      </div>
    )
  }

  if (appointments.length === 0) {
    return (
      <div style={styles.emptyState}>
        <CalendarDays size={32} color="#5c5c5c" />
        <p style={styles.emptyText}>No appointments today. Enjoy the rest!</p>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {appointments.map((apt) => (
        <div key={apt.id} style={styles.aptCard}>
          <div style={styles.aptTime}>{apt.time}</div>
          <div style={styles.aptInfo}>
            <p style={styles.aptName}>{apt.client_name}</p>
            <p style={styles.aptType}>{apt.session_type}</p>
          </div>
          <div style={styles.aptPrice}>${apt.price}</div>
        </div>
      ))}
    </div>
  )
}

const styles = {
  container: {
    display: "flex",
    background: "#0a0a0a",
    fontFamily: "'DM Sans', sans-serif",
  },
  sidebar: {
    background: "#0f0f10",
    borderRight: "1px solid #1a1a1a",
    display: "flex",
    flexDirection: "column",
    padding: "32px 0",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 40,
  },
  mobileTopbar: {
    background: "#0f0f10",
    borderBottom: "1px solid #1a1a1a",
    gap: "12px",
    padding: "0 16px",
  },
  mobileTopbarTitle: {
    fontFamily: "'Playfair Display', serif",
    color: "#f5f5f5",
    fontSize: "16px",
    margin: 0,
    letterSpacing: "1px",
  },
  hamburgerBtn: {
    background: "transparent",
    border: "none",
    color: "#f5f5f5",
    padding: "10px",
    margin: "0 -6px 0 -10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarBrand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "0 24px",
    marginBottom: "48px",
  },
  sidebarLogo: {
    color: "#c9974a",
    fontSize: "20px",
  },
  sidebarTitle: {
    fontFamily: "'Playfair Display', serif",
    color: "#f5f5f5",
    fontSize: "18px",
    margin: 0,
    letterSpacing: "1px",
  },
  nav: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    padding: "0 12px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "11px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
    fontSize: "14px",
    border: "none",
    width: "100%",
    textAlign: "left",
    fontFamily: "'DM Sans', sans-serif",
  },
  navLabel: { fontSize: "14px" },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 24px",
    color: "#6b6b6b",
    cursor: "pointer",
    fontSize: "14px",
    borderTop: "1px solid #1a1a1a",
    borderLeft: "none",
    borderRight: "none",
    borderBottom: "none",
    marginTop: "auto",
    background: "transparent",
    width: "100%",
    textAlign: "left",
    fontFamily: "'DM Sans', sans-serif",
  },
  main: {
    flex: 1,
    // min-width: 0 overrides the flex-item default of `auto`, which would
    // otherwise let any long unbreakable content (e.g. a signing URL on the
    // Consent Forms page) dictate main's minimum width and force page-level
    // horizontal overflow on phones. With 0, main always caps at the
    // viewport and inner truncation (ellipsis) can actually engage.
    minWidth: 0,
    padding: "48px 52px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
  },
  headerGreeting: {
    color: "#555",
    fontSize: "13px",
    margin: "0 0 4px 0",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  headerTitle: {
    fontFamily: "'Playfair Display', serif",
    color: "#f5f5f5",
    fontSize: "32px",
    margin: 0,
    textTransform: "capitalize",
  },
  headerDate: {
    color: "#6b6b6b",
    fontSize: "13px",
    marginTop: "8px",
  },
  divider: {
    height: "1px",
    background: "#1a1a1a",
    marginBottom: "40px",
  },
  statsGrid: {
    display: "grid",
    gap: "16px",
    marginBottom: "48px",
  },
  statCard: {
    background: "#0f0f10",
    border: "1px solid #1a1a1a",
    borderRadius: "12px",
    padding: "24px",
  },
  statIconBox: {
    marginBottom: "16px",
  },
  statValue: {
    color: "#f5f5f5",
    fontSize: "28px",
    fontWeight: "600",
    marginBottom: "6px",
    fontFamily: "'Playfair Display', serif",
  },
  statLabel: {
    color: "#6b6b6b",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  sectionTitle: {
    fontFamily: "'Playfair Display', serif",
    color: "#f5f5f5",
    fontSize: "18px",
    marginBottom: "20px",
    fontWeight: "400",
  },
  actionsGrid: {
    display: "grid",
    gap: "16px",
    marginBottom: "48px",
  },
  actionCard: {
    background: "#0f0f10",
    border: "1px solid #1a1a1a",
    borderRadius: "12px",
    padding: "24px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  actionLabel: {
    color: "#888",
    fontSize: "13px",
  },
  emptyState: {
    background: "#0f0f10",
    border: "1px solid #1a1a1a",
    borderRadius: "12px",
    padding: "48px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  emptyText: {
    color: "#5c5c5c",
    fontSize: "14px",
    margin: 0,
  },
  aptCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: "#0f0f10",
    border: "1px solid #1a1a1a",
    borderRadius: "12px",
    padding: "16px 20px",
  },
  aptTime: {
    color: "#c9974a",
    fontSize: "13px",
    fontWeight: "600",
    minWidth: "70px",
  },
  aptInfo: { flex: 1 },
  aptName: {
    color: "#f5f5f5",
    fontSize: "15px",
    margin: "0 0 4px 0",
  },
  aptType: {
    color: "#6b6b6b",
    fontSize: "13px",
    margin: 0,
  },
  aptPrice: {
    color: "#f5f5f5",
    fontSize: "16px",
    fontWeight: "600",
  },
}