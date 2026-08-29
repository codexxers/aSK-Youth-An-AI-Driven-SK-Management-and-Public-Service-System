import { useState, useEffect, useRef, useCallback } from 'react'

const OVERLAY = {
  success:  { bg: '#1f7434', color: '#ffffff', icon: '✓' },
  duplicate: { bg: '#f1b523', color: '#0a0a0a', icon: '⚠' },
  error:   { bg: '#cc2222', color: '#ffffff', icon: '✗' },
}

function ResultOverlay({ result, onDismiss }) {
  if (!result) return null
  const style = OVERLAY[result.status] ?? OVERLAY.error
  return (
    <div
      role="status"
      aria-live="assertive"
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        backgroundColor: style.bg, color: style.color,
        cursor: 'pointer', userSelect: 'none', transition: 'opacity 0.15s ease',
      }}
    >
      <span style={{ fontSize: '5rem', lineHeight: 1, fontWeight: 900 }}>{style.icon}</span>
      {result.status === 'success' && (
        <p style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: '1rem', textAlign: 'center', padding: '0 1.5rem' }}>
          Successfully Recorded!
        </p>
      )}
      {result.status === 'duplicate' && (
        <>
          <p style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: '1rem', textAlign: 'center', padding: '0 1.5rem' }}>
            Already Recorded
          </p>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.85 }}>{result.message}</p>
        </>
      )}
      {result.status === 'error' && (
        <>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '1rem', textAlign: 'center' }}>Error</p>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.85, padding: '0 1.5rem', textAlign: 'center' }}>{result.message}</p>
        </>
      )}
      <p style={{ fontSize: '0.75rem', marginTop: '2rem', opacity: 0.55 }}>Tap to dismiss</p>
    </div>
  )
}

export default function ScanAttendance({ authUser }) {
  const token = sessionStorage.getItem('askyouth_token') || localStorage.getItem('askyouth_token')
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [facingMode, setFacingMode] = useState('environment')

  // Youth (formerly guest) Form State
  const [youthFormVisible, setYouthFormVisible] = useState(false)
  const [scannedEventId, setScannedEventId] = useState(null)
  const [scannedToken, setScannedToken] = useState(null)
  const [youthData, setYouthData] = useState({ first_name: '', mi: '', last_name: '', suffix: '', gender: 'Male', address: '' })

  const lastScanned = useRef(0)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const animRef = useRef(null)
  const [isReady, setIsReady] = useState(false)

  const overlayActive = result !== null || youthFormVisible

  // Auto-dismiss overlay after 2.5 seconds
  useEffect(() => {
    if (!result) return
    const t = setTimeout(() => setResult(null), 2500)
    return () => clearTimeout(t)
  }, [result])

  const handleScan = useCallback(async (code) => {
    if (!code || submitting || overlayActive || youthFormVisible) return
    const now = Date.now()
    if (now - lastScanned.current < 3000) return

    let eventId
    let scanToken = null
    if (code.startsWith('http')) {
      try {
        const url = new URL(code)
        eventId = url.searchParams.get('scan')
        scanToken = url.searchParams.get('t')
      } catch (e) {}
    } else {
      try {
        const payload = JSON.parse(code)
        if (payload.type === 'askyouth_attendance') {
           eventId = payload.eventId
           scanToken = payload.t
        }
      } catch (e) {}
    }

    if (!eventId) {
      setResult({ status: 'error', message: 'Unrecognized Event QR Code.' })
      return
    }

    lastScanned.current = now

    // Youth device-level duplicate check
    if (!authUser || authUser?.isGuest || authUser?.role === 'youth') {
      try {
        const localScans = JSON.parse(localStorage.getItem('askyouth_youth_scans') || '[]')
        if (localScans.some(s => String(s.eventId) === String(eventId))) {
          setResult({ status: 'duplicate', message: 'You have already recorded your attendance on this device.' })
          return
        }
      } catch (e) {}
      setScannedEventId(eventId)
      setScannedToken(scanToken)
      setYouthFormVisible(true)
      return
    }

    submitAttendance(eventId, { t: scanToken })
  }, [submitting, overlayActive, youthFormVisible, authUser])

  // QR decode loop
  const loop = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(loop)
      return
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    import('jsqr').then((mod) => {
      const jsQR = mod.default || mod;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })
      if (code?.data) handleScan(code.data)
    }).catch(console.error).finally(() => {
      animRef.current = requestAnimationFrame(loop)
    })
  }, [handleScan])

  const startCamera = useCallback(async (facing = facingMode) => {
    setCameraError('')
    setIsReady(false)
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())

    if (!window.isSecureContext) {
      setCameraError('Camera requires a secure (HTTPS) connection.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera API not available. Try Chrome or Safari over HTTPS.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', true)
        await videoRef.current.play()
        setIsReady(true)
      }
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access and reload.')
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.')
      } else {
        setCameraError(`Camera error: ${err.message}`)
      }
    }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setIsReady(false)
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

  // Handle Deep Link on Mount — works with or without auth token
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const scanParam = urlParams.get('scan')
    const tParam    = urlParams.get('t')
    if (scanParam && !overlayActive && !youthFormVisible) {
      window.history.replaceState({}, document.title, window.location.pathname)
      if (!authUser || authUser?.isGuest || authUser?.role === 'youth') {
        // Guest path: show form immediately
        setScannedEventId(scanParam)
        setScannedToken(tParam)
        setYouthFormVisible(true)
      } else {
        // Authenticated officer/admin: scan directly
        handleScan(window.location.href)
      }
    }
  }, [])  // run once on mount

  const submitAttendance = async (eventId, extraData = {}) => {
    setSubmitting(true)
    setYouthFormVisible(false)
    const API_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '')
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`
      
      const res = await fetch(`${API_URL}/api/events/scan`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ eventId, ...extraData }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ status: 'error', message: data.error || 'Failed to scan.' })
      } else {
        if (data.status === 'success' && (authUser?.isGuest || authUser?.role === 'youth')) {
          const localScans = JSON.parse(localStorage.getItem('askyouth_youth_scans') || '[]')
          localScans.push({ eventId })
          localStorage.setItem('askyouth_youth_scans', JSON.stringify(localScans))
        }
        setResult({ status: data.status, message: data.message, timestamp: data.timestamp })
      }
    } catch (err) {
      setResult({ status: 'error', message: 'Network error. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleYouthSubmit = (e) => {
    e.preventDefault()
    if (!youthData.first_name || !youthData.last_name) return
    submitAttendance(scannedEventId, { ...youthData, t: scannedToken })
  }

  if (cameraError) {
    return (
      <main style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh', paddingTop: 'calc(var(--navbar-h) + 2rem)' }}>
        <div className="max-w-md mx-auto px-4 text-center mt-12">
          <p className="text-xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>Camera Unavailable</p>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>{cameraError}</p>
          <button onClick={() => startCamera(facingMode)} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-sm">
            Retry
          </button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh', paddingTop: 'calc(var(--navbar-h) + 2rem)' }}>
      <ResultOverlay result={result} onDismiss={() => setResult(null)} />

      {/* Youth Details Form Overlay */}
      {youthFormVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Youth Check-In</h2>
            <p className="text-sm text-slate-400 mb-5">Please fill in your details to record your attendance.</p>
            <form onSubmit={handleYouthSubmit} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">First Name</label>
                  <input required value={youthData.first_name} onChange={e => setYouthData({...youthData, first_name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500" placeholder="Juan" />
                </div>
                <div className="w-20">
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">M.I.</label>
                  <input value={youthData.mi} onChange={e => setYouthData({...youthData, mi: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500" placeholder="P" maxLength="2" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Last Name</label>
                  <input required value={youthData.last_name} onChange={e => setYouthData({...youthData, last_name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500" placeholder="Dela Cruz" />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Suffix</label>
                  <input value={youthData.suffix} onChange={e => setYouthData({...youthData, suffix: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500" placeholder="Jr." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Gender</label>
                <select value={youthData.gender} onChange={e => setYouthData({...youthData, gender: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Address</label>
                <input required value={youthData.address} onChange={e => setYouthData({...youthData, address: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500" placeholder="123 Street, Brgy. Concepcion Dos" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setYouthFormVisible(false)} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white font-semibold">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold shadow-lg">Submit Attendance</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 pb-12">
        <h1 className="text-2xl font-black mb-2 text-center" style={{ color: 'var(--color-text)', fontFamily: "'DM Sans Display', 'DM Sans', sans-serif" }}>
          Scan Attendance
        </h1>
        <p className="text-sm text-center mb-8" style={{ color: 'var(--color-text-muted)' }}>
          Point your camera at the Event QR code shown by the SK Officer.
        </p>

        <div
          className="relative mx-auto overflow-hidden rounded-3xl"
          style={{ width: '100%', maxWidth: 400, aspectRatio: '3/4', backgroundColor: '#000', boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}
        >
          {/* Hidden canvas for QR decoding */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Target Box Overlay */}
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div
              className="w-3/4 aspect-square rounded-2xl"
              style={{ border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 0 0 4000px rgba(0,0,0,0.4)' }}
            />
          </div>

          {!isReady && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-cyan-400 font-mono tracking-widest">LOADING CAMERA...</span>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              filter: overlayActive ? 'blur(8px) brightness(0.6)' : 'none',
              transition: 'filter 0.2s ease',
            }}
          />
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setFacingMode(f => (f === 'environment' ? 'user' : 'environment'))}
            className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-transform active:scale-95"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            🔄 Flip Camera
          </button>
        </div>
      </div>
    </main>
  )
}
