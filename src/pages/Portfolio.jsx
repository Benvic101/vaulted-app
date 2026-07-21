import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { Upload, Trash2, Image as ImageIcon } from "lucide-react"
import * as layout from "../styles/layout"

const CATEGORIES = ["All", "Traditional", "Realism", "Blackwork", "Fine Line", "Japanese", "Other"]

export default function Portfolio() {
  const [items, setItems] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [filter, setFilter] = useState("All")
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [category, setCategory] = useState("Traditional")
  const [caption, setCaption] = useState("")
  const [file, setFile] = useState(null)

  useEffect(() => {
    let isMounted = true

    const loadItems = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("artist_id", user.id)
        .order("created_at", { ascending: false })

      if (isMounted) {
        setItems(data || [])
        setListLoading(false)
      }
    }

    loadItems()
    return () => { isMounted = false }
  }, [])

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please choose an image first.")
      return
    }
    setUploading(true)
    setMessage("")

    const { data: { user } } = await supabase.auth.getUser()
    const fileExt = file.name.split(".").pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from("portfolio")
      .upload(fileName, file)

    if (uploadError) {
      setMessage("Upload error: " + uploadError.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from("portfolio")
      .getPublicUrl(fileName)

    const { error: insertError } = await supabase
      .from("portfolio_items")
      .insert([{
        artist_id: user.id,
        image_url: urlData.publicUrl,
        category: category,
        caption: caption,
      }])

    if (insertError) {
      setMessage("Save error: " + insertError.message)
    } else {
      setMessage("Uploaded!")
      setFile(null)
      setCaption("")
      const { data } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("artist_id", user.id)
        .order("created_at", { ascending: false })
      setItems(data || [])
    }
    setUploading(false)
  }

  const handleDelete = async (item) => {
    if (!window.confirm("Delete this piece? This cannot be undone.")) return

    const marker = "/portfolio/"
    const idx = item.image_url.indexOf(marker)
    const storagePath = idx >= 0 ? item.image_url.slice(idx + marker.length) : null

    if (storagePath) {
      await supabase.storage.from("portfolio").remove([storagePath])
    }

    const { error } = await supabase.from("portfolio_items").delete().eq("id", item.id)
    if (!error) {
      setItems(items.filter((i) => i.id !== item.id))
    }
  }

  const filteredItems = filter === "All" ? items : items.filter((item) => item.category === filter)

  return (
    <div style={styles.container} className="vlt-page-shell">
      <div style={styles.header}>
        <p style={styles.headerSub}>Showcase your work</p>
        <h1 style={styles.headerTitle}>Portfolio</h1>
      </div>

      <div style={styles.divider} />

      <form style={styles.uploadSection} onSubmit={(e) => { e.preventDefault(); handleUpload() }}>
        <h3 style={styles.sectionTitle}>Add New Piece</h3>
        <div style={styles.uploadRow}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
            style={styles.fileInput}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.select}>
            {CATEGORIES.filter((c) => c !== "All").map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            style={styles.captionInput}
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button type="submit" style={styles.button} disabled={uploading}>
            <Upload size={16} /> {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
        {message && <p style={styles.message}>{message}</p>}
      </form>

      <div style={styles.filterRow}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            style={filter === c ? styles.filterActive : styles.filter}
            onClick={() => setFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {listLoading ? (
        <div style={styles.empty}>
          <ImageIcon size={32} color="#5c5c5c" />
          <p style={styles.emptyText}>Loading portfolio…</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={styles.empty}>
          <ImageIcon size={32} color="#5c5c5c" />
          <p style={styles.emptyText}>No pieces yet in this category.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredItems.map((item) => (
            <div key={item.id} style={styles.card}>
              <img src={item.image_url} alt={item.caption || "Tattoo"} style={styles.image} />
              <div style={styles.cardFooter}>
                <div>
                  <p style={styles.cardCategory}>{item.category}</p>
                  {item.caption && <p style={styles.cardCaption}>{item.caption}</p>}
                </div>
                <button style={styles.deleteButton} className="vlt-icon-btn" onClick={() => handleDelete(item)}>
                  <Trash2 size={14} color="#8b1a1a" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: layout.container,
  header: { marginBottom: "24px" },
  headerSub: layout.headerSub,
  headerTitle: layout.headerTitle,
  divider: { height: "1px", background: "#1a1a1a", marginBottom: "32px" },
  uploadSection: { background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "24px", marginBottom: "32px" },
  sectionTitle: { fontFamily: "'Playfair Display', serif", fontSize: "16px", margin: "0 0 16px 0", fontWeight: "400" },
  uploadRow: { display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" },
  fileInput: { color: "#888", fontSize: "13px" },
  select: { padding: "10px", background: "#141416", border: "1px solid #1a1a1a", borderRadius: "8px", color: "#f5f5f5", fontSize: "16px", fontFamily: "'DM Sans', sans-serif" },
  captionInput: { flex: 1, minWidth: "180px", padding: "10px 14px", background: "#141416", border: "1px solid #1a1a1a", borderRadius: "8px", color: "#f5f5f5", fontSize: "16px", outline: "none", fontFamily: "'DM Sans', sans-serif" },
  button: { display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", background: "#c9974a", border: "none", borderRadius: "8px", color: "#0a0a0a", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  message: { color: "#c9974a", fontSize: "13px", marginTop: "12px", marginBottom: 0 },
  filterRow: { display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" },
  filter: { padding: "8px 14px", background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "20px", color: "#666", fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  filterActive: { padding: "8px 14px", background: "#c9974a", border: "1px solid #c9974a", borderRadius: "20px", color: "#0a0a0a", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" },
  card: { background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "12px", overflow: "hidden" },
  image: { width: "100%", height: "220px", objectFit: "cover", display: "block" },
  cardFooter: { padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  cardCategory: { color: "#c9974a", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px 0" },
  cardCaption: { color: "#888", fontSize: "13px", margin: 0 },
  deleteButton: layout.iconBtn,
  empty: { display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "60px 0", color: "#6b6b6b" },
  emptyText: { fontSize: "14px", margin: 0 },
}