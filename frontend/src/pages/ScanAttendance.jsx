import { useState, useEffect, useRef, useCallback } from 'react'
import jsQR from 'jsqr'

// ─── Status overlay ────────────────────────────────────────────────────────────
const OVERLAY_STYLES = {
  success:   { bg: '#059669', color: '#ffffff', icon: '✓', label: 'Attendance Recorded!' },
  duplicate: { bg: '#d97706', color: '#ffffff', icon: '⚠', label: 'Already Recorded' },
  error:     { bg: '#dc2626', color: '#ffffff', icon: '✗', label: 'Error' },
}

function ResultOverlay({ result, onDismiss }) {
  if (!result) return null
  const s = OVERLAY_STYLES[result.status] ?? OVERLAY_STYLES.error
  return (
    <div
      role="status"
      aria-live="assertive"
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: s.bg, color: s.color, cursor: 'pointer', userSelect: 'none',
      }}
    >
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '3.5rem', fontWeight: 900, lineHeight: 1,
        boxShadow: '0 0 0 20px rgba(255,255,255,0.08)',
        marginBottom: '1.5rem',
      }}>
        {s.icon}
      </div>
      <p style={{ fontSize: '1.6rem', fontWeight: 900, textAlign: 'center', padding: '0 2rem', marginBottom: '0.5rem' }}>
        {s.label}
      </p>
      {result.message && (
        <p style={{ fontSize: '0.95rem', opacity: 0.85, textAlign: 'center', padding: '0 2rem', maxWidth: 360 }}>
          {result.message}
        </p>
      )}
      <p style={{ fontSize: '0.75rem', marginTop: '2.5rem', opacity: 0.55 }}>Tap to dismiss</p>
    </div>
  )
}

// ─── Corner bracket scan frame (no laser line) ───────────────────────────────────
function ScanFrame({ scanning }) {
  const color = scanning ? '#22d3ee' : 'rgba(255,255,255,0.5)'
  const corners = [
    { top: 0, left: 0, borderTop: `3px solid ${color}`, borderLeft: `3px solid ${color}`, borderRadius: '12px 0 0 0' },
    { top: 0, right: 0, borderTop: `3px solid ${color}`, borderRight: `3px solid ${color}`, borderRadius: '0 12px 0 0' },
    { bottom: 0, left: 0, borderBottom: `3px solid ${color}`, borderLeft: `3px solid ${color}`, borderRadius: '0 0 0 12px' },
    { bottom: 0, right: 0, borderBottom: `3px solid ${color}`, borderRight: `3px solid ${color}`, borderRadius: '0 0 12px 0' },
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {corners.map((style, i) => (
        <div key={i} style={{ position: 'absolute', width: 32, height: 32, transition: 'border-color 0.3s', ...style }} />
      ))}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function ScanAttendance({ authUser }) {
  const token = sessionStorage.getItem('askyouth_token') || localStorage.getItem('askyouth_token')
  const API_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '')

  const [result, setResult]               = useState(null)
  const [submitting, setSubmitting]       = useState(false)
  const [cameraError, setCameraError]     = useState('')
  const [facingMode, setFacingMode]       = useState('environment')
  const [isReady, setIsReady]             = useState(false)
  const [scanStatus, setScanStatus]       = useState('idle') // idle | scanning | found

  // Capture mode — freeze frame and decode from still
  const [captureSnapshot, setCaptureSnapshot] = useState(null) // base64 image URL
  const [captureResult, setCaptureResult]     = useState(null) // 'found' | 'notfound'
  const captureCanvasRef = useRef(null)

  // Youth form
  const [youthFormVisible, setYouthFormVisible] = useState(false)
  const [scannedEventId, setScannedEventId]     = useState(null)
  const [youthData, setYouthData] = useState({
    first_name: '', mi: '', last_name: '', suffix: '', gender: 'Male', address: ''
  })

  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const animRef     = useRef(null)
  const lastScanned = useRef(0)
  const overlayActive = result !== null || youthFormVisible

  // Auto-dismiss overlay
  useEffect(() => {
    if (!result) return
    const t = setTimeout(() => setResult(null), 3000)
    return () => clearTimeout(t)
  }, [result])

  // ── Image preprocessing for better QR detection ──────────────────────────────
  const preprocessCanvas = (ctx, w, h) => {
    const imgData = ctx.getImageData(0, 0, w, h)
    const d = imgData.data
    for (let i = 0; i < d.length; i += 4) {
      // Grayscale
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      // Contrast boost: stretch contrast
      const boosted = Math.min(255, Math.max(0, (gray - 128) * 1.5 + 128))
      d[i] = d[i + 1] = d[i + 2] = boosted
    }
    ctx.putImageData(imgData, 0, 0)
    return ctx.getImageData(0, 0, w, h)
  }

  // ── Handle decoded QR code ────────────────────────────────────────────────────
  const handleScan = useCallback(async (code) => {
    if (!code || submitting || overlayActive || youthFormVisible) return
    const now = Date.now()
    if (now - lastScanned.current < 3000) return

    let eventId
    try {
      if (code.startsWith('http')) {
        eventId = new URL(code).searchParams.get('scan')
      } else {
        const payload = JSON.parse(code)
        if (payload.type === 'askyouth_attendance') eventId = payload.eventId
      }
    } catch {}

    if (!eventId) {
      setResult({ status: 'error', message: 'Unrecognized QR Code. Please scan an official SK event QR.' })
      return
    }

    lastScanned.current = now
    setScanStatus('found')
    setTimeout(() => setScanStatus('scanning'), 2000)

    // Youth duplicate check (device-level)
    if (!token || authUser?.role === 'youth' || authUser?.isGuest) {
      try {
        const localScans = JSON.parse(localStorage.getItem('askyouth_youth_scans') || '[]')
        if (localScans.some(s => String(s.eventId) === String(eventId))) {
          setResult({ status: 'duplicate', message: 'You have already recorded your attendance for this event on this device.' })
          return
        }
      } catch {}
      setScannedEventId(eventId)
      setYouthFormVisible(true)
      return
    }

    submitAttendance(eventId, {})
  }, [submitting, overlayActive, youthFormVisible, token, authUser])

  // ── Capture: freeze frame → decode QR from still image ────────────────────
  const handleCapture = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !isReady) return

    // Freeze frame into capture canvas
    const w = video.videoWidth || 640
    const h = video.videoHeight || 480
    canvas.width  = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(video, 0, 0, w, h)

    // Save frozen image as preview
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setCaptureSnapshot(dataUrl)

    // Try raw decode
    let code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' })
    // Try preprocessed if raw fails
    if (!code?.data) {
      const processed = preprocessCanvas(ctx, w, h)
      code = jsQR(processed.data, w, h, { inversionAttempts: 'attemptBoth' })
    }

    if (code?.data) {
      setCaptureResult('found')
      // Short delay so user sees the Found badge, then proceed
      setTimeout(() => {
        setCaptureSnapshot(null)
        setCaptureResult(null)
        handleScan(code.data)
      }, 900)
    } else {
      setCaptureResult('notfound')
    }
  }, [isReady, handleScan, preprocessCanvas])

  const dismissCapture = () => {
    setCaptureSnapshot(null)
    setCaptureResult(null)
  }

  // ── QR decode loop ─────────────────────────────────────────────────────────────
  const loop = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) { animRef.current = requestAnimationFrame(loop); return }
    if (video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(loop); return
    }

    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) { animRef.current = requestAnimationFrame(loop); return }

    canvas.width  = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(video, 0, 0, w, h)

    // Try raw first, then preprocessed for better hits in low-light
    let code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' })
    if (!code?.data) {
      const processed = preprocessCanvas(ctx, w, h)
      code = jsQR(processed.data, w, h, { inversionAttempts: 'attemptBoth' })
    }

    if (code?.data) {
      handleScan(code.data)
    }

    animRef.current = requestAnimationFrame(loop)
  }, [handleScan])

  // ── Camera management ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async (facing = facingMode) => {
    setCameraError('')
    setIsReady(false)
    setScanStatus('idle')
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())

    if (!window.isSecureContext) {
      setCameraError('Camera requires HTTPS. Please access this page over a secure connection.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera API not available. Please use Chrome or Safari over HTTPS.')
      return
    }

    try {
      // Request highest resolution for better QR detection
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: 'continuous',
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.setAttribute('autoplay', 'true')
        await videoRef.current.play()
        setIsReady(true)
        setScanStatus('scanning')
      }
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings and reload.')
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found. Please connect a camera and try again.')
      } else if (err.name === 'OverconstrainedError') {
        // Retry with basic constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing },
            audio: false,
          })
          streamRef.current = fallbackStream
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream
            videoRef.current.setAttribute('playsinline', 'true')
            await videoRef.current.play()
            setIsReady(true)
            setScanStatus('scanning')
          }
        } catch (fallbackErr) {
          setCameraError(`Camera error: ${fallbackErr.message}`)
        }
      } else {
        setCameraError(`Camera error: ${err.message}`)
      }
    }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setIsReady(false)
    setScanStatus('idle')
  }, [])

  useEffect(() => {
    startCamera(facingMode)
    return () => stopCamera()
  }, [facingMode])

  useEffect(() => {
    if (isReady && !overlayActive) {
      animRef.current = requestAnimationFrame(loop)
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [isReady, overlayActive, loop])

  // Deep-link on mount
  useEffect(() => {
    const scanParam = new URLSearchParams(window.location.search).get('scan')
    if (scanParam && !overlayActive && !youthFormVisible) {
      handleScan(window.location.href)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [token])

  // ── Submit attendance ──────────────────────────────────────────────────────────
  const submitAttendance = async (eventId, extraData = {}) => {
    setSubmitting(true)
    setYouthFormVisible(false)
    try {
      const res = await fetch(`${API_URL}/api/events/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ eventId, ...extraData }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ status: 'error', message: data.error || 'Failed to record attendance.' })
      } else {
        if (data.status === 'success' && (authUser?.isGuest || authUser?.role === 'youth')) {
          const localScans = JSON.parse(localStorage.getItem('askyouth_youth_scans') || '[]')
          localScans.push({ eventId })
          localStorage.setItem('askyouth_youth_scans', JSON.stringify(localScans))
        }
        setResult({ status: data.status, message: data.message })
      }
    } catch {
      setResult({ status: 'error', message: 'Network error. Check your connection and try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleYouthSubmit = (e) => {
    e.preventDefault()
    if (!youthData.first_name.trim() || !youthData.last_name.trim()) return
    submitAttendance(scannedEventId, youthData)
  }

  // ── Camera error screen ────────────────────────────────────────────────────────
  if (cameraError) {
    return (
      <main style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
          <h2 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.75rem' }}>Camera Unavailable</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>{cameraError}</p>
          <button
            onClick={() => startCamera(facingMode)}
            style={{
              padding: '0.75rem 2rem', background: '#0891b2', color: '#fff',
              border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '0.95rem',
              cursor: 'pointer', transition: 'background 0.2s',
            }}
          >
            Retry Camera
          </button>
        </div>
      </main>
    )
  }

  // ── Main render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <main style={{ minHeight: '100vh', background: '#0f172a', paddingTop: '1.5rem', paddingBottom: '3rem' }}>
        <ResultOverlay result={result} onDismiss={() => setResult(null)} />

        {/* Youth Details Form */}
        {youthFormVisible && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}>
            <div style={{
              background: '#1e293b', border: '1px solid #334155', borderRadius: 20,
              width: '100%', maxWidth: 440, padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 40, height: 40, background: '#0891b2', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>✅</div>
                <div>
                  <h2 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>QR Code Detected!</h2>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>Fill in your details to complete attendance</p>
                </div>
              </div>
              <div style={{ height: 1, background: '#334155', margin: '1.25rem 0' }} />
              <form onSubmit={handleYouthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>First Name *</label>
                    <input required value={youthData.first_name}
                      onChange={e => setYouthData({...youthData, first_name: e.target.value})}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '0.6rem 0.8rem', color: '#f1f5f9', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                      placeholder="Juan" />
                  </div>
                  <div style={{ width: 70 }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>M.I.</label>
                    <input value={youthData.mi} maxLength={2}
                      onChange={e => setYouthData({...youthData, mi: e.target.value})}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '0.6rem 0.8rem', color: '#f1f5f9', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                      placeholder="P" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Last Name *</label>
                    <input required value={youthData.last_name}
                      onChange={e => setYouthData({...youthData, last_name: e.target.value})}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '0.6rem 0.8rem', color: '#f1f5f9', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                      placeholder="Dela Cruz" />
                  </div>
                  <div style={{ width: 80 }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Suffix</label>
                    <input value={youthData.suffix}
                      onChange={e => setYouthData({...youthData, suffix: e.target.value})}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '0.6rem 0.8rem', color: '#f1f5f9', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                      placeholder="Jr." />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Gender</label>
                  <select value={youthData.gender}
                    onChange={e => setYouthData({...youthData, gender: e.target.value})}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '0.6rem 0.8rem', color: '#f1f5f9', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Address *</label>
                  <input required value={youthData.address}
                    onChange={e => setYouthData({...youthData, address: e.target.value})}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '0.6rem 0.8rem', color: '#f1f5f9', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="123 St., Brgy. Concepcion Dos" />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setYouthFormVisible(false)}
                    style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid #334155', borderRadius: 12, color: '#94a3b8', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    style={{ flex: 2, padding: '0.75rem', background: submitting ? '#0e7490' : '#0891b2', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
                    {submitting ? 'Recording...' : 'Submit Attendance →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ textAlign: 'center', padding: '0 1rem 1.25rem' }}>
          <h1 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.5rem', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>
            📷 QR Attendance Scanner
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
            Face your camera at the QR code — it scans automatically, or tap <strong style={{ color: '#38bdf8' }}>Capture</strong> to snap and decode.
          </p>
        </div>

        {/* Scanner viewport */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 1rem' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 380, aspectRatio: '1/1', borderRadius: 24, overflow: 'hidden', background: '#000', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>

            {/* Hidden decode canvas */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* ── Capture preview overlay ── */}
            {captureSnapshot && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: '#000' }}>
                <img src={captureSnapshot} alt="Captured frame" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {/* Result badge */}
                {captureResult && (
                  <div style={{
                    position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                    background: captureResult === 'found' ? 'rgba(5,150,105,0.95)' : 'rgba(220,38,38,0.95)',
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${captureResult === 'found' ? '#10b981' : '#f87171'}`,
                    borderRadius: 20, padding: '0.4rem 1.1rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 40,
                  }}>
                    <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                      {captureResult === 'found' ? '✓ QR Found — Processing…' : '✗ No QR Found'}
                    </span>
                  </div>
                )}
                {captureResult === 'notfound' && (
                  <button
                    onClick={dismissCapture}
                    style={{
                      position: 'absolute', top: 12, right: 12, zIndex: 50,
                      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
                      border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10,
                      color: '#fff', fontSize: '0.78rem', fontWeight: 700,
                      padding: '0.35rem 0.8rem', cursor: 'pointer',
                    }}
                  >
                    ✕ Try Again
                  </button>
                )}
              </div>
            )}

            {/* Video feed */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%', objectFit: 'cover',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                filter: overlayActive ? 'blur(6px) brightness(0.5)' : 'none',
                transition: 'filter 0.25s ease',
                display: captureSnapshot ? 'none' : 'block',
              }}
            />

            {/* Dark vignette overlay */}
            {!captureSnapshot && (
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(circle at center, transparent 38%, rgba(0,0,0,0.65) 100%)',
              }} />
            )}

            {/* Scan frame with corner brackets */}
            {!captureSnapshot && (
              <div style={{ position: 'absolute', inset: '15%', borderRadius: 16, overflow: 'visible' }}>
                <ScanFrame scanning={scanStatus === 'scanning'} />
              </div>
            )}

            {/* Loading state */}
            {!isReady && !cameraError && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', zIndex: 20 }}>
                <div style={{ width: 36, height: 36, border: '3px solid #22d3ee', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: '#22d3ee', fontSize: '0.75rem', fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Starting Camera…</span>
              </div>
            )}

            {/* Scan status badge (live mode only) */}
            {isReady && !captureSnapshot && (
              <div style={{
                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                background: scanStatus === 'found' ? 'rgba(5, 150, 105, 0.9)' : 'rgba(8, 145, 178, 0.85)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${scanStatus === 'found' ? '#10b981' : '#22d3ee'}`,
                borderRadius: 20, padding: '0.35rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 20,
                transition: 'background 0.3s, border-color 0.3s',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: scanStatus === 'found' ? '#10b981' : '#22d3ee',
                  boxShadow: `0 0 6px ${scanStatus === 'found' ? '#10b981' : '#22d3ee'}`,
                  animation: scanStatus === 'scanning' ? 'pulse-ring 1s ease-out infinite' : 'none',
                }} />
                <span style={{ color: '#fff', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {scanStatus === 'found' ? 'QR Detected!' : 'Scanning…'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem', gap: '0.75rem', padding: '0 1rem', flexWrap: 'wrap' }}>
          {/* Capture button */}
          <button
            onClick={handleCapture}
            disabled={!isReady || !!captureSnapshot}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.85rem 1.75rem',
              background: isReady && !captureSnapshot
                ? 'linear-gradient(135deg, #0891b2, #0e7490)'
                : '#1e293b',
              border: `1px solid ${isReady && !captureSnapshot ? '#22d3ee' : '#334155'}`,
              borderRadius: 14, color: isReady && !captureSnapshot ? '#fff' : '#475569',
              fontSize: '0.9rem', fontWeight: 700, cursor: isReady && !captureSnapshot ? 'pointer' : 'not-allowed',
              boxShadow: isReady && !captureSnapshot ? '0 0 20px rgba(8,145,178,0.3)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4"/>
              <path d="M20.94 13A8.001 8.001 0 1111 3.06"/>
              <path strokeLinecap="round" d="M8 3H5a2 2 0 00-2 2v3"/>
              <path strokeLinecap="round" d="M16 3h3a2 2 0 012 2v3"/>
              <path strokeLinecap="round" d="M8 21H5a2 2 0 01-2-2v-3"/>
              <path strokeLinecap="round" d="M16 21h3a2 2 0 002-2v-3"/>
            </svg>
            Capture
          </button>

          {/* Flip camera button */}
          <button
            onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.85rem 1.5rem',
              background: '#1e293b', border: '1px solid #334155', borderRadius: 14,
              color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
              transition: 'background 0.2s, border-color 0.2s',
            }}
          >
            🔄 Flip Camera
          </button>
        </div>

        {/* Instruction hint */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', padding: '0 1.5rem' }}>
          <p style={{ color: '#334155', fontSize: '0.78rem', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
            The scanner detects QR codes automatically. If scanning is slow, align the QR in the frame and tap <strong style={{ color: '#38bdf8' }}>Capture</strong> for an instant snapshot decode.
          </p>
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
}
