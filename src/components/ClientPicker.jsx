import { useState, useEffect, useRef } from "react"
import { supabase } from "../supabase"
import { User, Plus } from "lucide-react"

/**
 * Searchable client picker with inline "add new" flow.
 *
 * Props:
 *   value    — selected client { id, name } or null
 *   onChange — called with the full client { id, name, email } on select,
 *              or null when the user clears/edits the field
 *   placeholder, autoFocus — passthrough
 *
 * Fetches the artist's clients once on mount and filters client-side —
 * the client list per artist is small and this keeps typing latency-free.
 */
export default function ClientPicker({ value, onChange, placeholder = "Search or add client…", autoFocus = false }) {
  const [query, setQuery] = useState(value?.name ?? "")
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState([])
  const [highlight, setHighlight] = useState(0)
  const [creating, setCreating] = useState(false)
  const wrapRef = useRef(null)

  // Load clients for this artist once.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from("clients")
        .select("id, name, email")
        .eq("artist_id", user.id)
        .order("name", { ascending: true })
      setClients(data || [])
    })()
  }, [])

  // Sync local query when the parent swaps in a different selected value
  // (e.g. openEdit preloading an existing booking's client).
  useEffect(() => {
    setQuery(value?.name ?? "")
  }, [value?.id])

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const q = query.trim().toLowerCase()
  const matches = q
    ? clients.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8)
    : clients.slice(0, 8)
  const exact = clients.find((c) => c.name.toLowerCase() === q)
  const showAdd = q.length > 0 && !exact

  const selectClient = (c) => {
    onChange({ id: c.id, name: c.name, email: c.email ?? null })
    setQuery(c.name)
    setOpen(false)
  }

  const createAndSelect = async () => {
    const name = query.trim()
    if (!name || creating) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from("clients")
      .insert([{ name, artist_id: user.id }])
      .select("id, name, email")
      .single()
    setCreating(false)
    if (!error && data) {
      setClients((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      selectClient(data)
    }
  }

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown") { setOpen(true); setHighlight(0) }
      return
    }
    const total = matches.length + (showAdd ? 1 : 0)
    if (total === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault(); setHighlight((h) => Math.min(h + 1, total - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (highlight < matches.length) selectClient(matches[highlight])
      else if (showAdd) createAndSelect()
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} style={styles.wrap}>
      <div style={styles.inputWrapper}>
        <User size={15} color="#6b6b6b" style={styles.inputIcon} />
        <input
          style={styles.input}
          placeholder={placeholder}
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setHighlight(0)
            // Typing invalidates any prior selection — parent should clear client_id.
            if (value) onChange(null)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && (matches.length > 0 || showAdd) && (
        <div style={styles.dropdown}>
          {matches.map((c, i) => (
            <div
              key={c.id}
              style={{ ...styles.option, background: i === highlight ? "#181818" : "transparent" }}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => { e.preventDefault(); selectClient(c) }}
            >
              <div style={styles.avatar}>{c.name.charAt(0).toUpperCase()}</div>
              <div style={styles.optionText}>
                <div style={styles.optionName}>{c.name}</div>
                {c.email && <div style={styles.optionSub}>{c.email}</div>}
              </div>
            </div>
          ))}
          {showAdd && (
            <div
              style={{ ...styles.addRow, background: highlight === matches.length ? "#181818" : "transparent" }}
              onMouseEnter={() => setHighlight(matches.length)}
              onMouseDown={(e) => { e.preventDefault(); createAndSelect() }}
            >
              <Plus size={14} color="#c9974a" />
              <span style={styles.addText}>
                {creating ? "Adding…" : <>Add <span style={styles.addQuoted}>&ldquo;{query.trim()}&rdquo;</span> as new client</>}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  wrap: { position: "relative" },
  inputWrapper: { position: "relative" },
  inputIcon: { position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" },
  input: {
    width: "100%", padding: "12px 16px 12px 40px", background: "#0f0f10",
    border: "1px solid #1a1a1a", borderRadius: "8px", color: "#f5f5f5",
    fontSize: "16px", outline: "none", boxSizing: "border-box",
    fontFamily: "'DM Sans', sans-serif",
  },
  dropdown: {
    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
    background: "#0f0f10", border: "1px solid #1e1e1e", borderRadius: "8px",
    padding: "4px", zIndex: 20, maxHeight: "320px", overflowY: "auto",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  },
  option: {
    display: "flex", alignItems: "center", gap: "12px",
    padding: "10px 12px", borderRadius: "6px", cursor: "pointer",
  },
  avatar: {
    width: "28px", height: "28px", borderRadius: "50%",
    background: "linear-gradient(135deg, #c9974a, #a07830)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "12px", fontWeight: "600", color: "#0a0a0a", flexShrink: 0,
    fontFamily: "'Playfair Display', serif",
  },
  optionText: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
  optionName: { color: "#f5f5f5", fontSize: "14px" },
  optionSub: { color: "#6b6b6b", fontSize: "12px" },
  addRow: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 12px", borderRadius: "6px", cursor: "pointer",
    borderTop: "1px solid #1a1a1a", marginTop: "2px",
  },
  addText: { color: "#c9974a", fontSize: "13px" },
  addQuoted: { color: "#f5f5f5" },
}
