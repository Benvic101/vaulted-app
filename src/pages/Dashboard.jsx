import { useEffect, useState } from "react"
import { supabase } from "../supabase"
import Bookings from "./Bookings"
import Clients from "./Clients"
import ConsentForms from "./ConsentForms"
import Payments from "./Payments"
import {
  LayoutDashboard, CalendarDays, Users, FileText,
  Image, CreditCard, Settings, LogOut, TrendingUp
} from "lucide-react"

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [activePage, setActivePage] = useState("dashboard")
  const [stats, setStats] = useState({
    totalClients: 0,
    bookingsThisWeek: 0,
    revenueThisMonth: 0,
    pendingConsents: 0,
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) fetchStats(data.user.id)
    })
  }, [])

  const fetchStats = async (artistId) => {
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

    setStats({
      totalClients: clientCount || 0,
      bookingsThisWeek: bookingCount || 0,
      revenueThisMonth: revenue,
      pendingConsents: consentCount || 0,
    })
  }

  const navItems = [
    { icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { icon: <CalendarDays size={18} />, label: "Bookings" },
    { icon: <Users size={18} />, label: "Clients" },
    { icon: <FileText size={18} />, label: "Consent Forms" },
    { icon: <Image size={18} />, label: "Portfolio" },
    { icon: <CreditCard size={18} />, label: "Payments" },
    { icon: <Settings size={18} />, label: "Settings" },
  ]

  const statCards = [
    { label: "Total Clients", value: stats.totalClients, icon: <Users size={20} />, color: "#d4a843" },
    { label: "Bookings This Week", value: stats.bookingsThisWeek, icon: <CalendarDays size={20} />, color: "#d4a843" },
    { label: "Revenue This Month", value: `$${stats.revenueThisMonth.toFixed(2)}`, icon: <TrendingUp size={20} />, color: "#2d6a4f" },
    { label: "Consent Forms Signed", value: stats.pendingConsents, icon: <FileText size={20} />, color: "#8b1a1a" },
  ]

  const quickActions = [
    { label: "New Booking", icon: <CalendarDays size={24} />, color: "#d4a843", page: "bookings" },
    { label: "Add Client", icon: <Users size={24} />, color: "#4c9ac9", page: "clients" },
    { label: "Consent Forms", icon: <FileText size={24} />, color: "#8b1a1a", page: "consent forms" },
    { label: "Payments", icon: <CreditCard size={24} />, color: "#2d6a4f", page: "payments" },
  ]

  return (
    <div style={styles.container}>

      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarBrand}>
          <span style={styles.sidebarLogo}>◈</span>
          <h2 style={styles.sidebarTitle}>Vaulted</h2>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => {
            const isActive = activePage === item.label.toLowerCase()
            return (
              <div
                key={item.label}
                style={{
                  ...styles.navItem,
                  background: isActive ? "rgba(212,168,67,0.1)" : "transparent",
                  borderLeft: isActive ? "2px solid #d4a843" : "2px solid transparent",
                  color: isActive ? "#d4a843" : "#555",
                }}
                onClick={() => setActivePage(item.label.toLowerCase())}
              >
                {item.icon}
                <span style={styles.navLabel}>{item.label}</span>
              </div>
            )
          })}
        </nav>

        <div
          style={styles.logoutBtn}
          onClick={() => supabase.auth.signOut()}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </div>
      </div>

      {/* Main */}
      <div style={styles.main}>
        {activePage === "bookings" && <Bookings />}
        {activePage === "clients" && <Clients />}
        {activePage === "consent forms" && <ConsentForms />}
        {activePage === "payments" && <Payments />}

        {activePage === "dashboard" && (
          <>
            {/* Header */}
            <div style={styles.header}>
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

            {/* Stat Cards */}
            <div style={styles.statsGrid}>
              {statCards.map((stat) => (
                <div key={stat.label} style={styles.statCard}>
                  <div style={{ ...styles.statIconBox, color: stat.color }}>
                    {stat.icon}
                  </div>
                  <div style={styles.statValue}>{stat.value}</div>
                  <div style={styles.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <h2 style={styles.sectionTitle}>Quick Actions</h2>
            <div style={styles.actionsGrid}>
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

            {/* Today's Appointments */}
            <h2 style={styles.sectionTitle}>Today's Appointments</h2>
            <TodayAppointments artistId={user?.id} />
          </>
        )}
      </div>
    </div>
  )
}

function TodayAppointments({ artistId }) {
  const [appointments, setAppointments] = useState([])

  useEffect(() => {
    if (!artistId) return
    const today = new Date().toISOString().split("T")[0]
    supabase
      .from("bookings")
      .select("*")
      .eq("artist_id", artistId)
      .eq("date", today)
      .then(({ data }) => setAppointments(data || []))
  }, [artistId])

  if (appointments.length === 0) {
    return (
      <div style={styles.emptyState}>
        <CalendarDays size={32} color="#333" />
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
    minHeight: "100vh",
    background: "#0a0a0a",
    fontFamily: "'DM Sans', sans-serif",
  },
  sidebar: {
    width: "240px",
    background: "#0d0d0d",
    borderRight: "1px solid #1a1a1a",
    display: "flex",
    flexDirection: "column",
    padding: "32px 0",
    position: "fixed",
    height: "100vh",
  },
  sidebarBrand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "0 24px",
    marginBottom: "48px",
  },
  sidebarLogo: {
    color: "#d4a843",
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
  },
  navLabel: { fontSize: "14px" },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 24px",
    color: "#444",
    cursor: "pointer",
    fontSize: "14px",
    borderTop: "1px solid #1a1a1a",
    marginTop: "auto",
  },
  main: {
    marginLeft: "240px",
    flex: 1,
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
    color: "#444",
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
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "48px",
  },
  statCard: {
    background: "#0d0d0d",
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
    color: "#444",
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
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "48px",
  },
  actionCard: {
    background: "#0d0d0d",
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
    background: "#0d0d0d",
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
    color: "#333",
    fontSize: "14px",
    margin: 0,
  },
  aptCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: "#0d0d0d",
    border: "1px solid #1a1a1a",
    borderRadius: "12px",
    padding: "16px 20px",
  },
  aptTime: {
    color: "#d4a843",
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
    color: "#444",
    fontSize: "13px",
    margin: 0,
  },
  aptPrice: {
    color: "#f5f5f5",
    fontSize: "16px",
    fontWeight: "600",
  },
}