import { useState, useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "../supabase"
import { CalendarDays, Mail, User, CheckCircle, Eraser } from "lucide-react"
import logo from "../assets/logo.png"

const emptyAnswers = {
  blood_thinner: false, skin_condition: false,
  allergies: false, allergies_detail: "",
  pregnant: false, diabetes: false, heart_condition: false,
  age_verified: false, design_approved: false,
  aftercare_acknowledged: false, photo_consent: false,
}

function CheckBox({ name, label, required, checked, onChange }) {
  return (
    <label style={styles.checkboxLabel}>
      <input type="checkbox" name={name} checked={checked} onChange={onChange} style={styles.checkbox} />
      <span style={styles.checkboxText}>
        {label} {required && <span style={{ color: "#8b1a1a" }}>*</span>}
      </span>
    </label>
  )
}

export default function SignConsentForm() {
  const { token } = useParams()
  const [status, setStatus] = useState("loading") // loading | invalid | ready | submitting | done
  const [formData, setFormData] = useState(null)
  const [answers, setAnswers] = useState(emptyAnswers)
  const [hasSignature, setHasSignature] = useState(false)
  const [message, setMessage] = useState("")
  const canvasRef = useRef(null)
  const drawing = useRef(false)

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_consent_form_by_token", { p_token: token })
      if (error || !data || data.length === 0) {
        setStatus("invalid")
        return
      }
      const row = data[0]
      setFormData(row)
      // Health history may be pre-filled by the artist and is editable here.
      // Consent + signature fields always start blank — this is the client's
      // own action, regardless of anything a 'sent' row might otherwise carry
      // (the DB also enforces this via a CHECK constraint on the table).
      setAnswers({
        blood_thinner: row.blood_thinner ?? false,
        skin_condition: row.skin_condition ?? false,
        allergies: row.allergies ?? false,
        allergies_detail: row.allergies_detail ?? "",
        pregnant: row.pregnant ?? false,
        diabetes: row.diabetes ?? false,
        heart_condition: row.heart_condition ?? false,
        age_verified: false,
        design_approved: false,
        aftercare_acknowledged: false,
        photo_consent: false,
      })
      setStatus("ready")
    })()
  }, [token])

  const handleAnswerChange = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value
    setAnswers((a) => ({ ...a, [e.target.name]: value }))
  }

  // The canvas's drawing-buffer resolution (width/height attributes) must
  // match its rendered CSS size * devicePixelRatio, or pointer coordinates
  // (computed in CSS-pixel space via getBoundingClientRect) drift from where
  // strokes actually land. Re-measured on mount and on resize/orientation
  // change, since the canvas is fluid-width on phones. A resize clears any
  // in-progress signature rather than risk silently distorting it.
  useEffect(() => {
    if (!formData) return
    const canvas = canvasRef.current
    if (!canvas) return

    const setupCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      const ctx = canvas.getContext("2d")
      ctx.scale(dpr, dpr)
      setHasSignature(false)
    }

    setupCanvas()
    window.addEventListener("resize", setupCanvas)
    window.addEventListener("orientationchange", setupCanvas)
    return () => {
      window.removeEventListener("resize", setupCanvas)
      window.removeEventListener("orientationchange", setupCanvas)
    }
  }, [formData])

  const getCanvasPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const startDraw = (e) => {
    drawing.current = true
    const { x, y } = getCanvasPoint(e)
    const ctx = canvasRef.current.getContext("2d")
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const moveDraw = (e) => {
    if (!drawing.current) return
    const { x, y } = getCanvasPoint(e)
    const ctx = canvasRef.current.getContext("2d")
    ctx.lineTo(x, y)
    ctx.strokeStyle = "#f5f5f5"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.stroke()
    if (!hasSignature) setHasSignature(true)
  }

  const endDraw = () => { drawing.current = false }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    setHasSignature(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!answers.age_verified || !answers.design_approved || !answers.aftercare_acknowledged) {
      setMessage("Please confirm age, design approval and aftercare acknowledgement.")
      return
    }
    if (!hasSignature) {
      setMessage("Please sign using your finger or mouse before submitting.")
      return
    }
    setStatus("submitting")
    setMessage("")
    const signatureData = canvasRef.current.toDataURL("image/png")
    const { data, error } = await supabase.rpc("sign_consent_form", {
      p_token: token,
      p_blood_thinner: answers.blood_thinner,
      p_skin_condition: answers.skin_condition,
      p_allergies: answers.allergies,
      p_allergies_detail: answers.allergies_detail,
      p_pregnant: answers.pregnant,
      p_diabetes: answers.diabetes,
      p_heart_condition: answers.heart_condition,
      p_age_verified: answers.age_verified,
      p_design_approved: answers.design_approved,
      p_aftercare_acknowledged: answers.aftercare_acknowledged,
      p_photo_consent: answers.photo_consent,
      p_signature_data: signatureData,
    })
    if (error || !data) {
      setStatus("ready")
      setMessage("This link is no longer valid. It may have already been used.")
      return
    }
    setStatus("done")
  }

  return (
    <div style={styles.page} className="vlt-full-height vlt-sign-page">
      <div style={styles.brandRow}>
        <img src={logo} alt="Vaulted" style={styles.logo} />
        <span style={styles.brandName}>Vaulted</span>
      </div>

      {status === "loading" && (
        <div style={styles.card} className="vlt-sign-card">
          <p style={styles.loadingText}>Loading your consent form…</p>
        </div>
      )}

      {status === "invalid" && (
        <div style={styles.card} className="vlt-sign-card">
          <h2 style={styles.title}>Link no longer valid</h2>
          <p style={styles.sub}>This signing link is invalid, expired, or has already been used. Please contact your artist for a new link.</p>
        </div>
      )}

      {status === "done" && (
        <div style={styles.card} className="vlt-sign-card">
          <CheckCircle size={40} color="#2d6a4f" />
          <h2 style={{ ...styles.title, marginTop: "16px" }}>Signed successfully</h2>
          <p style={styles.sub}>Thank you — your consent form has been submitted to your artist.</p>
        </div>
      )}

      {(status === "ready" || status === "submitting") && formData && (
        <form style={styles.card} className="vlt-sign-card" onSubmit={handleSubmit}>
          <h2 style={styles.title}>Consent & Health Declaration</h2>
          <p style={styles.sub}>Please review carefully and sign below.</p>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Client Details</h3>
            <div style={styles.readRow}><User size={14} color="#6b6b6b" /> {formData.client_name}</div>
            <div style={styles.readRow}><Mail size={14} color="#6b6b6b" /> {formData.client_email}</div>
            <div style={styles.readRow}><CalendarDays size={14} color="#6b6b6b" /> {formData.date}</div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Medical History</h3>
            <p style={styles.sectionSub}>Check all conditions that apply</p>
            <div style={styles.checkboxGrid} className="vlt-form-grid">
              <CheckBox name="blood_thinner" label="Takes blood thinners" checked={answers.blood_thinner} onChange={handleAnswerChange} />
              <CheckBox name="skin_condition" label="Has skin condition" checked={answers.skin_condition} onChange={handleAnswerChange} />
              <CheckBox name="allergies" label="Has allergies" checked={answers.allergies} onChange={handleAnswerChange} />
              <CheckBox name="pregnant" label="Is pregnant" checked={answers.pregnant} onChange={handleAnswerChange} />
              <CheckBox name="diabetes" label="Has diabetes" checked={answers.diabetes} onChange={handleAnswerChange} />
              <CheckBox name="heart_condition" label="Has heart condition" checked={answers.heart_condition} onChange={handleAnswerChange} />
            </div>
            {answers.allergies && (
              <input
                style={{ ...styles.input, marginTop: "12px" }}
                name="allergies_detail"
                placeholder="Describe allergies..."
                value={answers.allergies_detail}
                onChange={handleAnswerChange}
              />
            )}
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Client Consent</h3>
            <p style={styles.sectionSub}>Required fields must be checked to proceed</p>
            <div style={styles.consentList}>
              <CheckBox name="age_verified" label="I confirm I am 18 years or older" required checked={answers.age_verified} onChange={handleAnswerChange} />
              <CheckBox name="design_approved" label="I have reviewed and approved the design" required checked={answers.design_approved} onChange={handleAnswerChange} />
              <CheckBox name="aftercare_acknowledged" label="I have read and understood aftercare instructions" required checked={answers.aftercare_acknowledged} onChange={handleAnswerChange} />
              <CheckBox name="photo_consent" label="I consent to photos being used for portfolio purposes" checked={answers.photo_consent} onChange={handleAnswerChange} />
            </div>
          </div>

          <div style={styles.section}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={styles.sectionTitle}>Signature *</h3>
              <button type="button" style={styles.clearBtn} onClick={clearSignature}>
                <Eraser size={13} /> Clear
              </button>
            </div>
            <canvas
              ref={canvasRef}
              style={styles.canvas}
              onPointerDown={startDraw}
              onPointerMove={moveDraw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
            />
            <p style={styles.sectionSub}>Sign using your finger, stylus, or mouse above.</p>
          </div>

          <button type="submit" style={styles.button} disabled={status === "submitting"}>
            {status === "submitting" ? "Submitting..." : "Submit Signed Form"}
          </button>

          {message && <p style={styles.message}>{message}</p>}
        </form>
      )}
    </div>
  )
}

const styles = {
  page: {
    background: "#0a0a0a", fontFamily: "'DM Sans', sans-serif",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  brandRow: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" },
  logo: { width: "32px", height: "32px", objectFit: "cover", borderRadius: "50%", border: "1px solid #1e1e1e" },
  brandName: { fontFamily: "'Playfair Display', serif", color: "#f5f5f5", fontSize: "20px", letterSpacing: "1px" },
  card: {
    width: "100%", maxWidth: "640px", background: "#0d0d0d", border: "1px solid #1a1a1a",
    borderRadius: "16px", display: "flex", flexDirection: "column", gap: "24px",
    boxSizing: "border-box",
  },
  loadingText: { color: "#6b6b6b", fontSize: "14px", textAlign: "center", margin: 0 },
  title: { fontFamily: "'Playfair Display', serif", color: "#f5f5f5", fontSize: "26px", margin: 0, fontWeight: "600" },
  sub: { color: "#6b6b6b", fontSize: "14px", margin: "-16px 0 0 0", lineHeight: "1.6" },
  section: { background: "#0f0f10", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" },
  sectionTitle: { fontFamily: "'Playfair Display', serif", color: "#f5f5f5", fontSize: "16px", margin: 0, fontWeight: "400" },
  sectionSub: { color: "#6b6b6b", fontSize: "12px", margin: 0 },
  readRow: { display: "flex", alignItems: "center", gap: "8px", color: "#ccc", fontSize: "14px", overflowWrap: "anywhere" },
  checkboxGrid: { display: "grid", gap: "12px" },
  consentList: { display: "flex", flexDirection: "column", gap: "12px" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" },
  checkbox: { width: "16px", height: "16px", cursor: "pointer", accentColor: "#c9974a" },
  checkboxText: { color: "#888", fontSize: "14px" },
  input: { width: "100%", padding: "12px 16px", background: "#141416", border: "1px solid #1a1a1a", borderRadius: "8px", color: "#f5f5f5", fontSize: "16px", outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" },
  canvas: { width: "100%", height: "160px", background: "#141416", border: "1px solid #1a1a1a", borderRadius: "8px", touchAction: "none", cursor: "crosshair" },
  clearBtn: { display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "1px solid #1e1e1e", borderRadius: "6px", padding: "6px 10px", color: "#6b6b6b", fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  button: { padding: "14px", background: "#c9974a", border: "none", borderRadius: "8px", color: "#0a0a0a", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  message: { color: "#8b1a1a", fontSize: "13px", textAlign: "center", margin: 0 },
}
