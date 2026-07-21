import { useState, useEffect, useRef } from "react"
import { supabase } from "../supabase"
import { FileText, Mail, CalendarDays, Plus, ArrowLeft, CheckSquare, Send, Link2, Copy, Check, Clock } from "lucide-react"
import ClientPicker from "../components/ClientPicker"
import * as layout from "../styles/layout"

const emptyForm = {
  client_id: null, client_name: "", client_email: "", date: "",
  blood_thinner: false, skin_condition: false,
  allergies: false, allergies_detail: "",
  pregnant: false, diabetes: false, heart_condition: false,
  age_verified: false, design_approved: false,
  aftercare_acknowledged: false, photo_consent: false,
}

const emptySendForm = { client_id: null, client_name: "", client_email: "", date: "" }

export default function ConsentForms() {
  const [view, setView] = useState("list")
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [form, setForm] = useState(emptyForm)
  const [sendForm, setSendForm] = useState(emptySendForm)
  const [sendLoading, setSendLoading] = useState(false)
  const [sendMessage, setSendMessage] = useState("")
  const [sentLink, setSentLink] = useState("")
  const [sentClientName, setSentClientName] = useState("")
  // idle | copied | manual | failed — one state so the three non-idle
  // outcomes (copied, fell back to manual-select, failed entirely) are
  // mutually exclusive and each gets distinct feedback.
  const [copyState, setCopyState] = useState("idle")
  const linkTextRef = useRef(null)

  useEffect(() => { fetchForms() }, [])

  const fetchForms = async () => {
    setListLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from("consent_forms")
      .select("*")
      .eq("artist_id", user.id)
    if (!error) setForms(data)
    setListLoading(false)
  }

  const handleChange = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  const handleSubmit = async () => {
    if (!form.client_name || !form.client_email || !form.date) {
      setMessage("Please fill in client name, email and date.")
      return
    }
    if (!form.age_verified || !form.design_approved || !form.aftercare_acknowledged) {
      setMessage("Client must verify age, approve design and acknowledge aftercare.")
      return
    }
    setLoading(true)
    setMessage("")
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("consent_forms").insert([{
      ...form, artist_id: user.id, signed_at: new Date().toISOString(), status: "signed",
    }])
    if (error) {
      setMessage("Error: " + error.message)
    } else {
      setMessage("Consent form saved!")
      setForm(emptyForm)
      fetchForms()
      setTimeout(() => setView("list"), 1500)
    }
    setLoading(false)
  }

  const openSend = () => {
    setSendForm(emptySendForm)
    setSendMessage("")
    setSentLink("")
    setSentClientName("")
    setCopyState("idle")
    setView("send")
  }

  const backToListFromSend = () => {
    setSendForm(emptySendForm)
    setSendMessage("")
    setSentLink("")
    setSentClientName("")
    setCopyState("idle")
    setForm(emptyForm)
    setView("list")
  }

  const handleSendForSignature = async (e) => {
    e.preventDefault()
    if (!sendForm.client_name || !sendForm.client_email || !sendForm.date) {
      setSendMessage("Please fill in client, email and appointment date.")
      return
    }
    setSendLoading(true)
    setSendMessage("")
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from("consent_forms").insert([{
      client_id: sendForm.client_id,
      client_name: sendForm.client_name,
      client_email: sendForm.client_email,
      date: sendForm.date,
      artist_id: user.id,
      status: "sent",
      sent_at: new Date().toISOString(),
    }]).select("sign_token").single()
    setSendLoading(false)
    if (error || !data) {
      console.error("Send for signature error:", error)
      setSendMessage("Error: " + (error?.message ?? "could not create form"))
      return
    }
    setSentClientName(sendForm.client_name)
    setSentLink(`${window.location.origin}/sign/${data.sign_token}`)
    fetchForms()
  }

  // Send the New Form's client details + health history to the client for
  // final approval. The four consent/signature fields are hardcoded blank
  // here — never read from `form` state — because the client must
  // personally check these and sign; the DB CHECK constraint backs this up.
  const handleSendPrefilled = async () => {
    if (!form.client_name || !form.client_email || !form.date) {
      setMessage("Please fill in client name, email and date.")
      return
    }
    setLoading(true)
    setMessage("")
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from("consent_forms").insert([{
      client_id: form.client_id,
      client_name: form.client_name,
      client_email: form.client_email,
      date: form.date,
      blood_thinner: form.blood_thinner,
      skin_condition: form.skin_condition,
      allergies: form.allergies,
      allergies_detail: form.allergies_detail,
      pregnant: form.pregnant,
      diabetes: form.diabetes,
      heart_condition: form.heart_condition,
      age_verified: false,
      design_approved: false,
      aftercare_acknowledged: false,
      photo_consent: false,
      artist_id: user.id,
      status: "sent",
      sent_at: new Date().toISOString(),
    }]).select("sign_token").single()
    setLoading(false)
    if (error || !data) {
      console.error("Send for final approval error:", error)
      setMessage("Error: " + (error?.message ?? "could not create form"))
      return
    }
    setSentClientName(form.client_name)
    setSentLink(`${window.location.origin}/sign/${data.sign_token}`)
    fetchForms()
    setView("send")
  }

  // Tiered copy. Tier 1: async Clipboard API — secure contexts (HTTPS or
  // localhost) only; guarded rather than trusted because some browsers
  // expose the object but reject on insecure origins. Tier 2: deprecated-
  // but-still-working execCommand('copy') on a hidden textarea, which does
  // work over plain-HTTP LAN (e.g. phone testing against a dev server) as
  // long as it runs inside this click handler; its boolean return is
  // checked explicitly since it reports failure by returning false, not by
  // throwing. Tier 3: pre-select the visible link text so the artist only
  // has to long-press/Ctrl+C. Each tier's outcome sets distinct feedback —
  // never silent.
  const copySentLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(sentLink)
        setCopyState("copied")
        setTimeout(() => setCopyState("idle"), 2000)
        return
      }
      const textarea = document.createElement("textarea")
      textarea.value = sentLink
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const ok = document.execCommand("copy")
      document.body.removeChild(textarea)
      if (ok) {
        setCopyState("copied")
        setTimeout(() => setCopyState("idle"), 2000)
        return
      }
    } catch {
      // fall through to manual-select below
    }
    // Manual-select tier: highlight the full URL for the user. The span is
    // ellipsis-truncated, so the highlight shows on the clipped portion,
    // but the selection (and anything copied from it) is the full link.
    try {
      const range = document.createRange()
      range.selectNodeContents(linkTextRef.current)
      const selection = window.getSelection()
      selection.removeAllRanges()
      selection.addRange(range)
      setCopyState("manual")
    } catch {
      setCopyState("failed")
    }
  }

  const CheckBox = ({ name, label, required }) => (
    <label style={styles.checkboxLabel}>
      <input
        type="checkbox"
        name={name}
        checked={form[name]}
        onChange={handleChange}
        style={styles.checkbox}
      />
      <span style={styles.checkboxText}>
        {label} {required && <span style={{ color: "#8b1a1a" }}>*</span>}
      </span>
    </label>
  )

  return (
    <div style={styles.container} className="vlt-page-shell">
      <div style={styles.header} className="vlt-header-row">
        <div>
          <p style={styles.headerSub}>Digital health & consent declarations</p>
          <h1 style={styles.headerTitle}>Consent Forms</h1>
        </div>
        {view === "list" ? (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button style={styles.newBtnOutline} onClick={openSend}>
              <Send size={16} /> Send for Signature
            </button>
            <button style={styles.newBtn} onClick={() => setView("form")}>
              <Plus size={16} /> New Form
            </button>
          </div>
        ) : (
          <button
            style={styles.newBtn}
            onClick={() => (view === "form" ? setView("list") : backToListFromSend())}
          >
            <ArrowLeft size={16} /> Back to List
          </button>
        )}
      </div>

      <div style={styles.divider} />

      {view === "send" && (
        <div style={styles.form}>
          {!sentLink ? (
            <form style={{ display: "flex", flexDirection: "column", gap: "24px" }} onSubmit={handleSendForSignature}>
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Send for Client Signature</h3>
                <p style={styles.sectionSub}>
                  The client will review the health &amp; consent questions and sign on their own device.
                  You don't need to fill those in yourself.
                </p>
                <div style={styles.field}>
                  <label style={styles.label}>Client *</label>
                  <ClientPicker
                    value={sendForm.client_id ? { id: sendForm.client_id, name: sendForm.client_name } : null}
                    onChange={(c) => setSendForm((f) => ({
                      ...f,
                      client_id: c?.id ?? null,
                      client_name: c?.name ?? "",
                      client_email: c?.email && !f.client_email ? c.email : f.client_email,
                    }))}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Client Email *</label>
                  <div style={styles.inputWrapper}>
                    <Mail size={15} color="#6b6b6b" style={styles.inputIcon} />
                    <input
                      style={styles.input}
                      placeholder="email@example.com"
                      value={sendForm.client_email}
                      onChange={(e) => setSendForm((f) => ({ ...f, client_email: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Appointment Date *</label>
                  <div style={styles.inputWrapper}>
                    <CalendarDays size={15} color="#6b6b6b" style={styles.inputIcon} />
                    <input
                      style={styles.input}
                      type="date"
                      value={sendForm.date}
                      onChange={(e) => setSendForm((f) => ({ ...f, date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" style={styles.button} disabled={sendLoading}>
                {sendLoading ? "Creating link..." : "Create Signing Link"}
              </button>
              {sendMessage && <p style={styles.message}>{sendMessage}</p>}
            </form>
          ) : (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Link ready</h3>
              <p style={styles.sectionSub}>
                Share this link with {sentClientName} however you'd like (text, email, etc).
                It can only be used once.
              </p>
              <div style={styles.linkRow}>
                <Link2 size={15} color="#6b6b6b" style={{ flexShrink: 0 }} />
                <span ref={linkTextRef} style={styles.linkText}>{sentLink}</span>
                <button type="button" style={styles.copyBtn} onClick={copySentLink}>
                  {copyState === "copied" ? <Check size={14} /> : <Copy size={14} />}
                  {copyState === "copied" ? "Copied" : "Copy"}
                </button>
              </div>
              {copyState === "manual" && (
                <p style={styles.copyManualText}>
                  Automatic copy isn't available here — the link is selected above, long-press (or Ctrl+C) to copy it.
                </p>
              )}
              {copyState === "failed" && (
                <p style={styles.copyErrorText}>
                  Couldn't copy. Please select the link above and copy it manually.
                </p>
              )}
              <button type="button" style={styles.button} onClick={backToListFromSend}>
                Done
              </button>
            </div>
          )}
        </div>
      )}

      {view === "form" && (
        <form style={styles.form} onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>

          {/* Client Details */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Client Details</h3>
            <div style={styles.formGrid} className="vlt-form-grid">
              <div style={styles.field}>
                <label style={styles.label}>Client *</label>
                <ClientPicker
                  value={form.client_id ? { id: form.client_id, name: form.client_name } : null}
                  onChange={(c) => setForm((f) => ({
                    ...f,
                    client_id: c?.id ?? null,
                    client_name: c?.name ?? "",
                    client_email: c?.email && !f.client_email ? c.email : f.client_email,
                  }))}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Email *</label>
                <div style={styles.inputWrapper}>
                  <Mail size={15} color="#6b6b6b" style={styles.inputIcon} />
                  <input style={styles.input} name="client_email" placeholder="email@example.com" value={form.client_email} onChange={handleChange} />
                </div>
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Appointment Date *</label>
              <div style={styles.inputWrapper}>
                <CalendarDays size={15} color="#6b6b6b" style={styles.inputIcon} />
                <input style={styles.input} name="date" type="date" value={form.date} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Medical History */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Medical History</h3>
            <p style={styles.sectionSub}>Check all conditions that apply</p>
            <div style={styles.checkboxGrid} className="vlt-form-grid">
              <CheckBox name="blood_thinner" label="Takes blood thinners" />
              <CheckBox name="skin_condition" label="Has skin condition" />
              <CheckBox name="allergies" label="Has allergies" />
              <CheckBox name="pregnant" label="Is pregnant" />
              <CheckBox name="diabetes" label="Has diabetes" />
              <CheckBox name="heart_condition" label="Has heart condition" />
            </div>
            {form.allergies && (
              <div style={{ ...styles.field, marginTop: "16px" }}>
                <label style={styles.label}>Allergy Details</label>
                <input style={{ ...styles.input, paddingLeft: "16px" }} name="allergies_detail" placeholder="Describe allergies..." value={form.allergies_detail} onChange={handleChange} />
              </div>
            )}
          </div>

          {/* Consent */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Client Consent</h3>
            <p style={styles.sectionSub}>
              Required fields must be checked to proceed. If sent for final approval instead,
              the client will re-confirm these themselves — checking them here has no effect on that path.
            </p>
            <div style={styles.consentList}>
              <CheckBox name="age_verified" label="I confirm I am 18 years or older" required />
              <CheckBox name="design_approved" label="I have reviewed and approved the design" required />
              <CheckBox name="aftercare_acknowledged" label="I have read and understood aftercare instructions" required />
              <CheckBox name="photo_consent" label="I consent to photos being used for portfolio purposes" />
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit" style={{ ...styles.button, flex: 1 }} disabled={loading}>
              {loading ? "Saving..." : "Save Consent Form"}
            </button>
            <button
              type="button"
              style={{ ...styles.buttonOutline, flex: 1 }}
              disabled={loading}
              onClick={handleSendPrefilled}
            >
              {loading ? "Sending..." : "Send to Client for Final Approval"}
            </button>
          </div>
          {message && <p style={styles.message}>{message}</p>}
        </form>
      )}

      {view === "list" && (
        <div>
          {listLoading ? (
            <div style={styles.emptyState}>
              <FileText size={36} color="#5c5c5c" />
              <p style={styles.emptyText}>Loading consent forms…</p>
            </div>
          ) : forms.length === 0 ? (
            <div style={styles.emptyState}>
              <FileText size={36} color="#222" />
              <p style={styles.emptyText}>No consent forms yet. Create your first one!</p>
            </div>
          ) : (
            <div style={styles.formsList}>
              {forms.map((f) => (
                <div key={f.id} style={styles.formCard} className="vlt-card-row">
                  <div style={styles.formIconBox}>
                    <FileText size={20} color="#c9974a" />
                  </div>
                  <div style={styles.formInfo}>
                    <h3 style={styles.formName}>{f.client_name}</h3>
                    <div style={styles.formMeta}>
                      <span style={styles.formMetaItem}><Mail size={12} color="#6b6b6b" /> {f.client_email}</span>
                      <span style={styles.formMetaItem}><CalendarDays size={12} color="#6b6b6b" /> {f.date}</span>
                    </div>
                  </div>
                  <div style={styles.formRight} className="vlt-card-right">
                    {f.status === "sent" ? (
                      <span style={styles.sentBadge}>
                        <Clock size={12} /> Awaiting Signature
                      </span>
                    ) : (
                      <span style={styles.signedBadge}>
                        <CheckSquare size={12} /> Signed
                      </span>
                    )}
                    {f.signed_at && (
                      <p style={styles.formDate}>
                        {new Date(f.signed_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric"
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: layout.container,
  // alignItems intentionally omitted — owned by the `.vlt-header-row` CSS
  // class since it must actually change value on mobile (flex-end desktop
  // to flex-start once the row stacks), unlike layout.header's fixed value.
  header: { display: "flex", justifyContent: "space-between", marginBottom: "24px" },
  headerSub: layout.headerSub,
  headerTitle: layout.headerTitle,
  newBtn: layout.newBtn,
  newBtnOutline: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: "8px", color: "#f5f5f5", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  divider: layout.divider,
  form: { display: "flex", flexDirection: "column", gap: "24px", maxWidth: "700px" },
  section: { background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" },
  sectionTitle: { fontFamily: "'Playfair Display', serif", color: "#f5f5f5", fontSize: "16px", margin: 0, fontWeight: "400" },
  sectionSub: { color: "#6b6b6b", fontSize: "12px", margin: 0 },
  formGrid: layout.formGrid,
  field: layout.field,
  label: layout.label,
  inputWrapper: layout.inputWrapper,
  inputIcon: layout.inputIcon,
  input: { ...layout.input, background: "#141416" },
  checkboxGrid: { display: "grid", gap: "12px" },
  consentList: { display: "flex", flexDirection: "column", gap: "12px" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" },
  checkbox: { width: "16px", height: "16px", cursor: "pointer", accentColor: "#c9974a" },
  checkboxText: { color: "#888", fontSize: "14px" },
  button: layout.button,
  buttonOutline: { padding: "13px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: "8px", color: "#f5f5f5", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  message: layout.message,
  emptyState: layout.emptyState,
  emptyText: layout.emptyText,
  formsList: { display: "flex", flexDirection: "column", gap: "12px" },
  formCard: { display: "flex", gap: "20px", background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "20px 24px" },
  formIconBox: { width: "44px", height: "44px", borderRadius: "10px", background: "rgba(201,151,74,0.05)", border: "1px solid rgba(201,151,74,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  formInfo: { flex: 1 },
  formName: { color: "#f5f5f5", fontSize: "16px", margin: "0 0 8px 0", fontWeight: "500" },
  formMeta: { display: "flex", gap: "16px" },
  formMetaItem: { display: "flex", alignItems: "center", gap: "6px", color: "#6b6b6b", fontSize: "13px" },
  formRight: {},
  signedBadge: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: "rgba(45,106,79,0.15)", color: "#2d6a4f", border: "1px solid rgba(45,106,79,0.2)", marginBottom: "8px" },
  sentBadge: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: "rgba(201,151,74,0.12)", color: "#c9974a", border: "1px solid rgba(201,151,74,0.25)", marginBottom: "8px" },
  formDate: { color: "#6b6b6b", fontSize: "12px", margin: 0 },
  linkRow: { display: "flex", alignItems: "center", gap: "10px", background: "#141416", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "12px 16px" },
  linkText: { flex: 1, minWidth: 0, color: "#ccc", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  copyBtn: { display: "flex", alignItems: "center", gap: "6px", background: "#c9974a", border: "none", borderRadius: "6px", padding: "8px 12px", color: "#0a0a0a", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", flexShrink: 0 },
  copyManualText: { color: "#c9974a", fontSize: "12px", margin: "-4px 0 0 0", lineHeight: "1.5" },
  copyErrorText: { color: "#8b1a1a", fontSize: "12px", margin: "-4px 0 0 0", lineHeight: "1.5" },
}