import { useState, useEffect, useCallback } from 'react'

export default function EventLogModal({ open, onClose, event: ev, token, authUser, onToggleStatus, onShowQR, qrRefreshHash, onRefreshQR }) {
  const [attendees, setAttendees] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const API_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '')

  const formatSGT = (dateString) => {
    if (!dateString) return '--:--';
    // SQLite returns "YYYY-MM-DD HH:MM:SS" in UTC. Append Z to force UTC parsing.
    const safeDateString = dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z';
    const d = new Date(safeDateString);
    if (isNaN(d.getTime())) return '--:--';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Singapore',
      hour12: false, hour: '2-digit', minute: '2-digit',
      month: '2-digit', day: '2-digit', year: 'numeric'
    }).formatToParts(d);
    let hh, mm, mo, dd, yy;
    for (const p of parts) {
      if (p.type === 'hour') hh = p.value === '24' ? '00' : p.value;
      if (p.type === 'minute') mm = p.value;
      if (p.type === 'month') mo = p.value;
      if (p.type === 'day') dd = p.value;
      if (p.type === 'year') yy = p.value;
    }
    return `${hh}:${mm} // ${mo}/${dd}/${yy}`;
  };

  const loadAttendees = useCallback(() => {
    if (!ev?.id || !token) return
    setLoading(true)
    setError('')
    
    fetch(`${API_URL}/api/events/${ev.id}/logs`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'Failed to load attendance logs.')
        setAttendees(data)
      })
      .catch((e) => setError(e.message || 'Could not load attendance logs.'))
      .finally(() => setLoading(false))
  }, [ev?.id, token])

  useEffect(() => {
    if (!open || !ev) return
    loadAttendees()
  }, [open, ev?.id, loadAttendees])

  if (!open || !ev) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-3 py-6 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl shadow-xl overflow-hidden my-4 bg-slate-900 border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 shrink-0 border-b border-slate-700 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-1 text-cyan-400">
              Attendance Event Log
            </p>
            <h2 className="text-lg font-bold text-white">
              {ev.title}
            </h2>
            <p className="text-xs mt-2 text-slate-400">
              {ev.date} {ev.time ? `at ${ev.time}` : ''}
              {' · '}
              {ev.location || '—'}
              {' · '}
              <span className="capitalize">Status: {ev.status}</span>
            </p>
            <p className="text-xs mt-1 text-slate-400">
              Total Recorded Attendees: {ev.attendees || attendees.length}
            </p>
          </div>
          
          <div className="flex gap-2 flex-wrap items-start">
            {authUser?.role === 'admin' && ev.status !== 'completed' && (
              <button 
                onClick={() => onToggleStatus(ev)} 
                className={`px-3 py-1.5 text-white text-[10px] uppercase font-bold tracking-wider rounded-lg shadow-sm transition-colors ${ev.status === 'upcoming' ? 'bg-cyan-700 hover:bg-cyan-600' : 'bg-amber-700 hover:bg-amber-600'}`}
              >
                {ev.status === 'upcoming' ? 'Start Event' : 'End Event'}
              </button>
            )}
            
            {ev.status === 'active' && (
              <button 
                onClick={() => { onClose(); onShowQR(ev); }} 
                className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-[10px] uppercase font-bold tracking-wider rounded-lg shadow-sm transition-colors"
              >
                Show QR Code
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-3 px-3 py-2 rounded-lg text-xs bg-red-900/30 text-red-400 border border-red-800">
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-auto px-5 py-5">
          {ev.status === 'active' && (
            <div className="mb-6 flex flex-col items-center p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-lg max-w-sm mx-auto transition-all">
              <div className="bg-white p-3 rounded-xl mb-4 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                <img 
                  src={`${API_URL}/api/events/${ev.id}/qr?h=${qrRefreshHash}`} 
                  alt="Event QR Code" 
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
              </div>
              {authUser?.role === 'admin' && (
                <button onClick={() => onRefreshQR(ev.id)} className="mb-3 px-4 py-2 bg-amber-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-amber-600 transition-colors w-full">
                  Refresh QR
                </button>
              )}
              <p className="text-white font-bold text-base text-center uppercase tracking-widest">
                Scan to Register
              </p>
              <p className="text-slate-400 text-xs text-center mt-1">
                Point your phone's camera at this QR code
              </p>
            </div>
          )}

          {loading ? (
            <p className="text-sm py-8 text-center text-slate-400">Loading…</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/50">
                    {['Name', 'Timestamp', 'Status'].map((h) => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-semibold uppercase text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {attendees.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-3 font-medium text-white">{a.userName}</td>
                      <td className="px-3 py-3 text-xs tabular-nums text-slate-400 font-mono tracking-wide text-cyan-400/80">
                        {formatSGT(a.timestamp)}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider bg-green-900/40 text-green-400 border border-green-800">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {attendees.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center text-sm text-slate-500">
                        No attendees have recorded their attendance yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-5 py-4 shrink-0 flex justify-end border-t border-slate-700 bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
