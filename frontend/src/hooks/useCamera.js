import { useRef, useState, useEffect, useCallback } from 'react'
import jsQR from 'jsqr'

/**
 * useCamera — manages camera stream + jsQR decode loop.
 *
 * @param {(qrHash: string) => void} onQrCode  — callback when a QR code is decoded
 * @param {boolean} active                     — set false to pause the loop (e.g. overlay showing)
 *
 * Returns: { videoRef, canvasRef, isReady, error, startCamera, stopCamera }
 */
export function useCamera(onQrCode, active = true) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const animRef   = useRef(null)

  const [isReady, setIsReady] = useState(false)
  const [error,   setError]   = useState('')

  // ── Decode loop ──────────────────────────────────────────────────────────
  const loop = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(loop)
      return
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })

    if (code?.data) {
      onQrCode(code.data)
    }

    animRef.current = requestAnimationFrame(loop)
  }, [onQrCode])

  // ── Start camera ─────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError('')
    setIsReady(false)

    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }

    const getUserMediaCompat = () => {
      if (typeof navigator === 'undefined') return null
      if (navigator.mediaDevices?.getUserMedia) {
        return (c) => navigator.mediaDevices.getUserMedia(c)
      }
      const legacy =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia
      if (!legacy) return null
      return (c) =>
        new Promise((resolve, reject) => {
          legacy.call(navigator, c, resolve, reject)
        })
    }

    try {
      if (!window.isSecureContext) {
        const host = typeof window !== 'undefined' ? window.location.host : ''
        setError(
          'Camera needs a secure page. Open this app with https://' +
            (host ? ` (e.g. https://${host})` : '') +
            ' — same address as now but with https. On iPhone, tap “Show Details” then visit the site and allow the certificate once.',
        )
        return
      }

      const gum = getUserMediaCompat()
      if (!gum) {
        setError(
          'Camera API is not available in this browser. Try Safari/Chrome, or use https:// on your network IP.',
        )
        return
      }

      const stream = await gum({
        video: {
          facingMode: { ideal: 'environment' },
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', true)  // required on iOS
        await videoRef.current.play()
        setIsReady(true)
      }
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access and reload.')
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.')
      } else {
        setError(`Camera error: ${err.message}`)
      }
    }
  }, [])

  // ── Stop camera ──────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setIsReady(false)
  }, [])

  // ── Auto-start on mount, auto-stop on unmount ─────────────────────────────
  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  // ── Start/stop decode loop based on isReady + active ─────────────────────
  useEffect(() => {
    if (isReady && active) {
      animRef.current = requestAnimationFrame(loop)
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [isReady, active, loop])

  return { videoRef, canvasRef, isReady, error, startCamera, stopCamera }
}
