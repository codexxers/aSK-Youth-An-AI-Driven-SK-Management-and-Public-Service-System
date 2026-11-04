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
  }, [ev?.id, token, API_URL])

  useEffect(() => {
    if (!open || !ev) return
    loadAttendees()
  }, [open, ev?.id, loadAttendees])

  if (!open || !ev) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-3 py-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden my-4 bg-white border-2 border-slate-300 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 shrink-0 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono font-bold tracking-widest uppercase mb-1 text-blue-600">
              Attendance Event Log
            </p>
            <h2 className="text-lg font-display font-bold text-slate-900">
              {ev.title}
            </h2>
            <p className="text-xs mt-2 text-slate-600">
              {ev.date} {ev.time ? `at ${ev.time}` : ''}
              {' · '}
              {ev.location || '—'}
              {' · '}
              <span className="capitalize font-semibold text-slate-800">Status: {ev.status}</span>
            </p>
            <p className="text-xs mt-1 font-mono text-slate-500">
              Total Recorded Attendees: <span className="font-bold text-blue-700">{ev.attendees || attendees.length}</span>
            </p>
          </div>
          
          <div className="flex gap-2 flex-wrap items-start">
            {authUser?.role === 'admin' && ev.status !== 'completed' && (
              <button 
                onClick={() => onToggleStatus(ev)} 
                className={`px-3 py-1.5 text-white text-[10px] uppercase font-bold tracking-wider rounded-xl shadow-sm transition-all active:scale-95 ${
                  ev.status === 'upcoming' 
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500' 
                    : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                {ev.status === 'upcoming' ? 'Start Event' : 'End Event'}
              </button>
            )}
            
            {ev.status === 'active' && (
              <button 
                onClick={() => { onClose(); onShowQR(ev); }} 
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] uppercase font-bold tracking-wider rounded-xl shadow-sm transition-all active:scale-95"
              >
                Show QR Code
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-3 px-3 py-2 rounded-xl text-xs bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-auto px-5 py-5">
          {ev.status === 'active' && (
            <div className="mb-6 flex flex-col items-center p-6 bg-slate-50 rounded-2xl border-2 border-slate-200 shadow-sm max-w-sm mx-auto transition-all">
              <div className="bg-white p-3 rounded-xl mb-4 border-2 border-slate-200 shadow-md">
                <img 
                  src={`${API_URL}/api/events/${ev.id}/qr?token=${encodeURIComponent(token || '')}&h=${qrRefreshHash}`} 
                  alt="Event QR Code" 
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
              </div>
              {authUser?.role === 'admin' && (
                <button 
                  onClick={() => onRefreshQR(ev.id)} 
                  className="mb-3 px-4 py-2 bg-amber-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-amber-500 transition-colors w-full shadow-sm"
                >
                  Refresh QR
                </button>
              )}
              <p className="text-slate-900 font-display font-bold text-base text-center uppercase tracking-widest">
                Scan to Register
              </p>
              <p className="text-slate-500 text-xs text-center mt-1">
                Point your phone's camera at this QR code
              </p>
            </div>
          )}

          {loading ? (
            <p className="text-sm py-8 text-center text-slate-500">Loading…</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border-2 border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    {['Name', 'Timestamp', 'Status'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-display font-bold uppercase tracking-wider text-slate-600">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendees.map((a) => (
                    <tr key={a.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{a.userName}</td>
                      <td className="px-4 py-3 text-xs tabular-nums text-slate-600 font-mono tracking-wide">
                        {formatSGT(a.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {attendees.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">
                        No attendees have recorded their attendance yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-5 py-4 shrink-0 flex justify-end border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
