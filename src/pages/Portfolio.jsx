import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { Upload, Trash2, Image as ImageIcon } from "lucide-react"
import * as layout from "../styles/layout"
import ConfirmDialog from "../components/ConfirmDialog"
import ListError from "../components/ListError"
import withTimeout from "../utils/withTimeout"

const CATEGORIES = ["All", "Traditional", "Realism", "Blackwork", "Fine Line", "Japanese", "Other"]

export default function Portfolio() {
  const [items, setItems] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(null)
  const [filter, setFilter] = useState("All")
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [category, setCategory] = useState("Traditional")
  const [caption, setCaption] = useState("")
  const [itemToDelete, setItemToDelete] = useState(null)
  const [file, setFile] = useState(null)

  const fetchItems = async (isMounted = { current: true }) => {
    // getSession reads local storage — no network round-trip, so it can't
    // hang when offline (getUser() pings /auth/v1/user and would stall
    // forever ahead of the wrapped query below).
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!isMounted.current) return
    setListLoading(true)
    setListError(null)
    if (!user) {
      setListLoading(false)
      return
    }
    const { data, error } = await withTimeout(
      supabase
        .from("portfolio_items")
        .select("*")
        .eq("artist_id", user.id)
        .order("created_at", { ascending: false }),
      15000,
      "Loading portfolio"
    )

    if (isMounted.current !== false) {
      if (error) {
        console.error("Portfolio fetch error:", error)
        setListError(error.message)
      } else {
        setItems(data || [])
      }
      setListLoading(false)
    }
  }

  useEffect(() => {
    const isMounted = { current: true }
    fetchItems(isMounted)
    return () => { isMounted.current = false }
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

  const confirmDelete = (item) => {
  setItemToDelete(item)
}

const handleDelete = async () => {
  const item = itemToDelete
  setItemToDelete(null)

  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from("portfolio_items")
    .delete()
    .eq("id", item.id)
    .eq("artist_id", user.id)
    .select()

  if (error) {
    console.error("Portfolio delete error:", error)
    setMessage("Delete error: " + error.message)
    return
  }
  if (!data || data.length === 0) {
    console.error("Portfolio delete affected 0 rows", { id: item.id, artist_id: user.id })
    setMessage("Delete failed — no matching row (check DELETE RLS policy).")
    return
  }

  // DB row is gone — now safe to remove the storage file
  const marker = "/portfolio/"
  const idx = item.image_url.indexOf(marker)
  const storagePath = idx >= 0 ? item.image_url.slice(idx + marker.length) : null
  if (storagePath) {
    const { error: storageError } = await supabase.storage.from("portfolio").remove([storagePath])
    if (storageError) {
      console.error("Portfolio storage cleanup error:", storageError)
      // DB row is already gone — don't block the UI on cleanup, but tell
      // the user so the orphaned file can be cleaned up in Supabase later.
      setMessage("Deleted, but its image file couldn't be removed from storage (" + storageError.message + "). It can be cleaned up in the Supabase dashboard.")
    }
  }

  setItems((prev) => prev.filter((i) => i.id !== item.id))
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
      {message && <p style={styles.message}>{message}</p>}

      {listLoading ? (
        <div style={styles.empty}>
          <ImageIcon size={32} color="var(--text-muted)" />
          <p style={styles.emptyText}>Loading portfolio…</p>
        </div>
      ) : listError ? (
        <ListError message={"Couldn't load portfolio — " + listError} onRetry={fetchItems} />
      ) : filteredItems.length === 0 ? (
        <div style={styles.empty}>
          <ImageIcon size={32} color="var(--text-muted)" />
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
                <button style={styles.deleteButton} className="vlt-icon-btn" onClick={() => confirmDelete(item)}>
                  <Trash2 size={14} color="var(--danger-primary)" />
                </button>
              </div>
            </div>
          ))}
        </div>
            )}

      <ConfirmDialog
        open={!!itemToDelete}
        title={itemToDelete ? `Delete this ${itemToDelete.category.toLowerCase()} piece?` : ""}
        message={itemToDelete?.caption ? `"${itemToDelete.caption}" — this cannot be undone.` : "This cannot be undone."}
        danger
        onConfirm={handleDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  )
}

const styles = {
  container: layout.container,
  header: { marginBottom: "24px" },
  headerSub: layout.headerSub,
  headerTitle: layout.headerTitle,
  divider: { height: "1px", background: "var(--border-primary)", marginBottom: "32px" },
  uploadSection: { background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", borderRadius: "12px", padding: "24px", marginBottom: "32px" },
  sectionTitle: { fontFamily: "'Playfair Display', serif", fontSize: "16px", margin: "0 0 16px 0", fontWeight: "400" },
  uploadRow: { display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" },
  fileInput: { color: "var(--text-secondary)", fontSize: "13px" },
  select: { padding: "10px", background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "16px", fontFamily: "'DM Sans', sans-serif" },
  captionInput: { flex: 1, minWidth: "180px", padding: "10px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "16px", outline: "none", fontFamily: "'DM Sans', sans-serif" },
  button: { display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", background: "var(--accent-gold)", border: "none", borderRadius: "8px", color: "var(--text-on-accent)", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  message: { color: "var(--accent-gold)", fontSize: "13px", marginTop: "12px", marginBottom: 0 },
  filterRow: { display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" },
  filter: { padding: "8px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", borderRadius: "20px", color: "var(--text-tertiary)", fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  filterActive: { padding: "8px 14px", background: "var(--accent-gold)", border: "1px solid var(--accent-gold)", borderRadius: "20px", color: "var(--text-on-accent)", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" },
  card: { background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", borderRadius: "12px", overflow: "hidden" },
  image: { width: "100%", height: "220px", objectFit: "cover", display: "block" },
  cardFooter: { padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  cardCategory: { color: "var(--accent-gold)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px 0" },
  cardCaption: { color: "var(--text-secondary)", fontSize: "13px", margin: 0 },
  deleteButton: layout.iconBtn,
  empty: { display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "60px 0", color: "var(--text-tertiary)" },
  emptyText: { fontSize: "14px", margin: 0 },
}