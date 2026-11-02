import React, { useState, useEffect } from 'react'

/**
 * Intelligent status screen for cold starts (Render free tier) and offline states.
 * Replaces the confusing "tunnel is asleep" blocker with clear cold-start awareness,
 * automatic continuous retry, live timer, and a direct link to the login screen.
 */
export default function ChatbotInactivePage({
  status = 'warming', // 'warming' | 'down'
  onRetry,
  isRetrying,
  apiBase,
  elapsedSeconds = 0,
  onBypass
}) {
  const [countdown, setCountdown] = useState(6)
  const isWarming = status === 'warming'
  const displayUrl = apiBase || 'https://askyouth-backend.onrender.com'

  // Countdown timer for automatic re-check when in down state
  useEffect(() => {
    if (isWarming || isRetrying) return
    setCountdown(6)
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          if (onRetry) onRetry()
          return 6
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isWarming, isRetrying, onRetry])

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center px-6 py-12 bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-noise-dark opacity-30 pointer-events-none" aria-hidden />
      <div className="absolute top-[-25%] left-[-15%] w-[60%] h-[60%] bg-blue-600/15 blur-[140px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-[-25%] right-[-15%] w-[60%] h-[60%] bg-cyan-500/15 blur-[140px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />

      <div className="relative z-10 max-w-lg w-full text-center space-y-6">

        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3">
          <img src="/ASKYOUTH.LOGO.png" alt="aSKYOUTH Logo" className="w-9 h-9 object-contain drop-shadow" />
          <span className="font-display font-black text-xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500">
            aSK//YOUTH.AI
          </span>
        </div>

        {/* Dynamic Center Pulse Graphic */}
        <div className="flex items-center justify-center pt-2 pb-1">
          <div className="relative flex items-center justify-center">
            {isWarming ? (
              <>
                <span className="absolute inline-flex h-24 w-24 rounded-full bg-cyan-500/20 animate-ping" style={{ animationDuration: '2.5s' }} />
                <span className="absolute inline-flex h-16 w-16 rounded-full bg-blue-500/30 animate-pulse" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.35)]">
                  <svg className="w-8 h-8 text-cyan-400 animate-spin" fill="none" viewBox="0 0 24 24" style={{ animationDuration: '3s' }}>
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              </>
            ) : (
              <>
                <span className="absolute inline-flex h-20 w-20 rounded-full bg-amber-500/15 animate-ping" style={{ animationDuration: '2.8s' }} />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                  <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Headings & Descriptive Copy */}
        <div className="space-y-3">
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isWarming ? 'Waking Up Cloud Backend…' : 'Server Reconnecting…'}
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
            {isWarming ? (
              <>
                Render free-tier instances sleep when idle. Awakening backend services and vector database…
                <span className="block mt-2 font-mono text-xs text-cyan-300/90 font-medium">
                  {elapsedSeconds > 0 ? `Elapsed: ${elapsedSeconds}s (typically takes 25–45s)` : 'Establishing connection…'}
                </span>
              </>
            ) : (
              <>
                The server took longer than expected to respond. It may still be finishing its boot cycle.
                <span className="block mt-2 font-mono text-xs text-amber-300/80">
                  Auto-retrying in {countdown}s…
                </span>
              </>
            )}
          </p>
        </div>

        {/* Live Target Endpoint Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-400 max-w-full truncate shadow-inner">
          <span className={`w-2 h-2 rounded-full ${isWarming ? 'bg-cyan-400 animate-ping' : 'bg-amber-400'}`} />
          <span className="truncate">
            Target: <span className="text-cyan-300">{displayUrl}</span>
          </span>
        </div>

        {/* Progress Bar for Warming */}
        {isWarming && (
          <div className="w-full max-w-xs mx-auto">
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]"
                style={{
                  width: `${Math.min(95, Math.max(15, (elapsedSeconds / 40) * 100))}%`,
                  transition: 'width 1s ease'
                }}
              />
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-display font-bold uppercase tracking-wider transition-all duration-200 shadow-lg shadow-cyan-900/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isRetrying ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Pinging Server…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Ping Now
              </>
            )}
          </button>

          {onBypass && (
            <button
              type="button"
              onClick={onBypass}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-display font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer"
            >
              Continue to Login →
            </button>
          )}
        </div>

        {/* Troubleshooting Collapsible */}
        <details className="text-left pt-2">
          <summary className="cursor-pointer text-center text-xs font-mono text-slate-500 hover:text-cyan-400 transition-colors select-none list-none flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5 transform transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
            System Diagnostics
          </summary>
          <div className="mt-3 p-4 bg-slate-900/70 border border-slate-800 rounded-xl text-left space-y-2">
            <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
              If the server does not respond within 60 seconds:
            </p>
            <ul className="text-[11px] font-mono text-slate-400 space-y-1 list-disc list-inside">
              <li>Check your Render Dashboard to ensure the service is <span className="text-green-400 font-bold">Live</span>.</li>
              <li>Free-tier instances spin down after 15 minutes of inactivity.</li>
              <li>Verify <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded">VITE_BACKEND_URL</code> in Vercel settings matches your Render URL.</li>
            </ul>
          </div>
        </details>

      </div>
    </div>
  )
}
