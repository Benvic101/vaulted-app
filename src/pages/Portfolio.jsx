import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { Upload, Trash2, Image as ImageIcon } from "lucide-react"

const CATEGORIES = ["All", "Traditional", "Realism", "Blackwork", "Fine Line", "Japanese", "Other"]

export default function Portfolio() {
  const [items, setItems] = useState([])
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

      if (isMounted && data) setItems(data)
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

  const handleDelete = async (id) => {
    const { error } = await supabase.from("portfolio_items").delete().eq("id", id)
    if (!error) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const filteredItems = filter === "All" ? items : items.filter((item) => item.category === filter)

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <p style={styles.headerSub}>Showcase your work</p>
        <h1 style={styles.headerTitle}>Portfolio</h1>
      </div>

      <div style={styles.divider} />

      <div style={styles.uploadSection}>
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
          <button style={styles.button} onClick={handleUpload} disabled={uploading}>
            <Upload size={16} /> {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
        {message && <p style={styles.message}>{message}</p>}
      </div>

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

      {filteredItems.length === 0 ? (
        <div style={styles.empty}>
          <ImageIcon size={32} color="#333" />
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
                <button style={styles.deleteButton} onClick={() => handleDelete(item.id)}>
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
  container: { padding: "48px 52px", fontFamily: "'DM Sans', sans-serif", color: "#f5f5f5", minHeight: "100vh", background: "#0a0a0a" },
  header: { marginBottom: "24px" },
  headerSub: { color: "#444", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 6px 0" },
  headerTitle: { fontFamily: "'Playfair Display', serif", fontSize: "32px", margin: 0, fontWeight: "600" },
  divider: { height: "1px", background: "#1a1a1a", marginBottom: "32px" },
  uploadSection: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "24px", marginBottom: "32px" },
  sectionTitle: { fontFamily: "'Playfair Display', serif", fontSize: "16px", margin: "0 0 16px 0", fontWeight: "400" },
  uploadRow: { display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" },
  fileInput: { color: "#888", fontSize: "13px" },
  select: { padding: "10px", background: "#111", border: "1px solid #1a1a1a", borderRadius: "8px", color: "#f5f5f5", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" },
  captionInput: { flex: 1, minWidth: "180px", padding: "10px 14px", background: "#111", border: "1px solid #1a1a1a", borderRadius: "8px", color: "#f5f5f5", fontSize: "13px", outline: "none", fontFamily: "'DM Sans', sans-serif" },
  button: { display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", background: "#d4a843", border: "none", borderRadius: "8px", color: "#0a0a0a", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  message: { color: "#d4a843", fontSize: "13px", marginTop: "12px", marginBottom: 0 },
  filterRow: { display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" },
  filter: { padding: "8px 14px", background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "20px", color: "#666", fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  filterActive: { padding: "8px 14px", background: "#d4a843", border: "1px solid #d4a843", borderRadius: "20px", color: "#0a0a0a", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" },
  card: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "12px", overflow: "hidden" },
  image: { width: "100%", height: "220px", objectFit: "cover", display: "block" },
  cardFooter: { padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  cardCategory: { color: "#d4a843", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px 0" },
  cardCaption: { color: "#888", fontSize: "13px", margin: 0 },
  deleteButton: { background: "transparent", border: "none", cursor: "pointer", padding: "4px" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "60px 0", color: "#444" },
  emptyText: { fontSize: "14px", margin: 0 },
}