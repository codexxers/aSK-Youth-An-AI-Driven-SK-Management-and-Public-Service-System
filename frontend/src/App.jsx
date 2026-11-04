import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import Plot from 'react-plotly.js'

import EventLogModal from './components/EventLogModal'
import ScanAttendance from './pages/ScanAttendance'
import CommitteeSelect from './components/CommitteeSelect'
import CommitteeBadge, { getCommitteeLabel } from './components/CommitteeBadge'

const DEFAULT_PROD_API = 'https://askyouth-backend.onrender.com';
const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = (import.meta.env.VITE_BACKEND_URL || (isLocal ? 'http://localhost:3001' : DEFAULT_PROD_API)).replace(/\/$/, '');

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



// ---------------------------------------------------------------------------
// ExportResponseButton — Phase 5 Feature 1
// Appears on every completed assistant message. Exports reply as DOCX or PDF
// using the existing /api/export/document endpoint.
// ---------------------------------------------------------------------------
function ExportResponseButton({ messageContent, hasOfficialDocument, officialDocTitle, officialDocContent, authHeaders }) {
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!showPopup) return;
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)) {
        setShowPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopup]);

  const doExport = async (format) => {
    try {
      const body = hasOfficialDocument
        ? { title: officialDocTitle, content: officialDocContent, format }
        : { title: 'AI Assistant Response', content: messageContent, format, isPlainReply: true };

      const res = await fetch(`${API_BASE}/api/export/document`, {
        method: 'POST',
        headers: authHeaders ? authHeaders({ 'Content-Type': 'application/json' }) : { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Export failed.' }));
        alert(`Export failed: ${err.error || res.statusText}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = (hasOfficialDocument ? officialDocTitle : 'AI_Assistant_Response')
        .replace(/[^a-z0-9\s]/gi, '').trim().replace(/\s+/g, '_') || 'document';
      a.href = url;
      a.download = `${safeName}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export error: ${err.message}`);
    }
    setShowPopup(false);
  };

  return (
    <div className="relative inline-flex">
      <div className="group/export relative">
        <button
          ref={buttonRef}
          onClick={() => setShowPopup(!showPopup)}
          className="p-1.5 rounded-lg text-slate-600 hover:text-black hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer"
          aria-label="Export Response"
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            <path d="M12 3v12" />
            <path d="M8 7l4-4 4 4" />
          </svg>
        </button>
        {!showPopup && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-mono tracking-wide rounded-md whitespace-nowrap opacity-0 group-hover/export:opacity-100 transition-opacity delay-150 pointer-events-none border border-slate-700 shadow-lg">
            Export Response
          </div>
        )}
      </div>

      {showPopup && (
        <div ref={popupRef} className="absolute bottom-full left-0 mb-2 w-[200px] bg-white border-2 border-slate-300 rounded-xl shadow-2xl p-3 z-50">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-mono font-bold text-slate-900 tracking-wide">Export as...</span>
            <button onClick={() => setShowPopup(false)} className="text-slate-400 hover:text-black transition-colors cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => doExport('docx')}
              className="flex items-center gap-2 px-3 py-2 text-xs font-mono font-bold tracking-wider rounded-lg bg-blue-50 border border-blue-300 text-blue-800 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
            >
              📄 Export to DOCX
            </button>
            <button
              onClick={() => doExport('pdf')}
              className="flex items-center gap-2 px-3 py-2 text-xs font-mono font-bold tracking-wider rounded-lg bg-cyan-50 border border-cyan-300 text-cyan-900 hover:bg-cyan-600 hover:text-white transition-all cursor-pointer"
            >
              🖨️ Export to PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EventsAnalyticsModule — Phase C: Full CRUD + Analytics + Document Import
// ---------------------------------------------------------------------------
const EVENT_CATEGORIES = ['sports', 'seminar', 'scholarship', 'assembly', 'community', 'livelihood', 'general', 'cultural', 'health', 'others'];
const EMPTY_EVENT_FORM = { title: '', description: '', committee: 'general', category: 'general', category_other_label: '', date: '', time: '', location: '', organizer: '', status: 'upcoming', requirements: '', contact: '', attendees: 0, male_count: 0, female_count: 0, staff_count: '', budget_allotted: '' };

function EventFormModal({ event, onClose, onSaved, authHeaders, authUser }) {
  const isEdit = !!event;
  const isCommitteeUser = authUser?.role === 'committee';
  const defaultCommittee = isCommitteeUser ? (authUser?.committee || '') : (event?.committee || 'general');
  const [form, setForm] = useState(isEdit ? {
    ...EMPTY_EVENT_FORM,
    ...event,
    committee: event.committee || defaultCommittee,
    staff_count: event.staff_count ?? '',
    budget_allotted: event.budget_allotted ?? ''
  } : {
    ...EMPTY_EVENT_FORM,
    committee: defaultCommittee
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  // Document import state
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importBanner, setImportBanner] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true); setImportBanner(null); setError(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await fetch(`${API_BASE}/api/events/parse-document`, { method: 'POST', headers: authHeaders ? authHeaders() : {}, body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Extraction failed.');
      const data = await res.json();
      const ex = data.extracted || {};
      setForm(p => {
        const u = { ...p };
        for (const [k, v] of Object.entries(ex)) { if (v !== null && v !== undefined && v !== '') u[k] = v; }
        return u;
      });
      setImportBanner('Fields extracted — please review before saving.');
    } catch (e) { setError(e.message); }
    finally { setImporting(false); }
  };

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const assignedCommittee = isCommitteeUser ? authUser?.committee : (form.committee || 'general');
      const body = {
        ...form,
        committee: assignedCommittee,
        attendees: parseInt(form.attendees) || 0,
        male_count: parseInt(form.male_count) || 0,
        female_count: parseInt(form.female_count) || 0,
        staff_count: form.staff_count === '' ? null : parseInt(form.staff_count) || 0,
        budget_allotted: form.budget_allotted === '' ? null : parseFloat(form.budget_allotted) || 0
      };
      const url = isEdit ? `${API_BASE}/api/events/${event.id}` : `${API_BASE}/api/events`;
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders ? authHeaders({ 'Content-Type': 'application/json' }) : { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Save failed.');
      }
      onSaved();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const inputCls = "w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-blue-600 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none transition-all shadow-sm";
  const labelCls = "text-xs font-mono font-bold text-slate-700 mb-1 block uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white border-2 border-slate-300 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-slate-900" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-display font-bold text-slate-900 mb-4 tracking-wide">{isEdit ? 'Edit Event' : 'Add New Event'}</h2>

        {/* Document Import */}
        {!isEdit && (
          <div className="mb-5 border-2 border-dashed border-blue-200 rounded-xl p-4 bg-blue-50/50">
            <p className="text-xs text-blue-900 mb-2 font-bold flex items-center gap-1.5">
              <span>📄</span> Import from Document (optional)
            </p>
            <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
              <input type="file" accept=".pdf,.docx,.jpg,.jpeg,.png,.tiff,.tif,.webp,.txt,.csv" onChange={e => setImportFile(e.target.files?.[0] || null)} className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 flex-1 cursor-pointer" />
              <button onClick={handleImport} disabled={!importFile || importing} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl whitespace-nowrap shadow-sm transition-all cursor-pointer">
                {importing ? '⏳ Extracting...' : 'Extract'}
              </button>
            </div>
            {importBanner && <p className="text-xs text-amber-700 font-semibold mt-2">⚠️ {importBanner}</p>}
          </div>
        )}

        {error && <p className="text-red-600 text-xs mb-3 bg-red-50 border border-red-200 rounded-xl p-2.5 font-medium">{error}</p>}

        {/* Form grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="col-span-1 sm:col-span-2">
            <label className={labelCls}>Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} />
          </div>

          {/* Committee Access Scope */}
          {isCommitteeUser ? (
            <div className="col-span-1 sm:col-span-2 bg-blue-50/70 border-2 border-blue-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 block">Assigned Committee Scope</span>
                <span className="text-xs font-bold text-blue-950">{getCommitteeLabel(authUser?.committee)}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 font-semibold">Auto-tagged</span>
            </div>
          ) : (
            <div className="col-span-1 sm:col-span-2">
              <label className={labelCls}>Committee Scope</label>
              <CommitteeSelect
                apiBase={API_BASE}
                includeGeneral={true}
                value={form.committee || 'general'}
                onChange={e => set('committee', e.target.value)}
                required
              />
            </div>
          )}

          <div><label className={labelCls}>Category</label><select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls}>{EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className={labelCls}>Status</label><select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}><option value="upcoming">Upcoming</option><option value="completed">Completed</option></select></div>
          {form.category === 'others' && (
            <div className="col-span-1 sm:col-span-2"><label className={labelCls}>Specify Category</label><input value={form.category_other_label || ''} onChange={e => set('category_other_label', e.target.value)} placeholder="e.g. Blood Donation" className={inputCls} /></div>
          )}
          <div><label className={labelCls}>Date</label><input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Time</label><input type="time" value={form.time} onChange={e => set('time', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Location</label><input value={form.location} onChange={e => set('location', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Organizer</label><input value={form.organizer} onChange={e => set('organizer', e.target.value)} className={inputCls} /></div>
          <div className="col-span-1 sm:col-span-2"><label className={labelCls}>Description</label><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={inputCls} /></div>
          <div className="col-span-1 sm:col-span-2"><label className={labelCls}>Requirements</label><input value={form.requirements} onChange={e => set('requirements', e.target.value)} className={inputCls} /></div>
          <div className="col-span-1 sm:col-span-2"><label className={labelCls}>Contact</label><input value={form.contact} onChange={e => set('contact', e.target.value)} className={inputCls} /></div>
        </div>

        {/* Attendance & Budget */}
        <p className="text-xs font-display font-bold text-slate-800 uppercase tracking-wider mb-2 mt-2">Attendance & Budget</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div><label className={labelCls}>Attendees</label><input type="number" min="0" value={form.attendees} onChange={e => set('attendees', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Male</label><input type="number" min="0" value={form.male_count} onChange={e => set('male_count', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Female</label><input type="number" min="0" value={form.female_count} onChange={e => set('female_count', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Staff (optional)</label><input type="number" min="0" value={form.staff_count} onChange={e => set('staff_count', e.target.value)} placeholder="—" className={inputCls} /></div>
          <div className="col-span-2 sm:col-span-2"><label className={labelCls}>Budget Allotted (₱)</label><input type="number" min="0" step="0.01" value={form.budget_allotted} onChange={e => set('budget_allotted', e.target.value)} placeholder="0.00" className={inputCls} /></div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.title} className="px-5 py-2 rounded-xl text-sm font-display font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md disabled:opacity-40 transition-all cursor-pointer">{saving ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NotificationBell — Polling notifications (Suggestion #4)
// ---------------------------------------------------------------------------
function NotificationBell({ authHeaders, setCurrentView }) {
  const [data, setData] = useState({ count: 0, events: [] });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/notifications/upcoming`, { headers: authHeaders() });
        if (res.ok) setData(await res.json());
      } catch (e) { }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 300000); // 5 mins
    return () => clearInterval(interval);
  }, [authHeaders]);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100/80 backdrop-blur-md rounded-lg shadow-sm border border-slate-200/50 transition-all flex items-center justify-center">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        {data.count > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-[101]">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Upcoming Events ({data.count})</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {data.events.length === 0 ? (
              <p className="p-4 text-xs text-slate-500 text-center">No upcoming events in the next {data.windowDays || 3} days.</p>
            ) : (
              data.events.map(ev => (
                <div key={ev.id} onClick={() => { setOpen(false); setCurrentView('events'); }} className="p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                  <p className="text-sm font-bold text-slate-800 line-clamp-1">{ev.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{ev.date} {ev.time && `• ${ev.time}`}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">{ev.location || 'Concepcion Dos'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FaqModule — (Suggestion #1)
// ---------------------------------------------------------------------------
function FaqModule({ authHeaders, authUser }) {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFaq, setEditFaq] = useState(null);

  const canEdit = ['admin', 'chairman'].includes(authUser?.role);

  const fetchFaqs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/faq`, { headers: authHeaders() });
      if (res.ok) setFaqs(await res.json());
    } catch (e) { } finally { setLoading(false); }
  };
  useEffect(() => { fetchFaqs(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const url = editFaq.id ? `${API_BASE}/api/faq/${editFaq.id}` : `${API_BASE}/api/faq`;
    const method = editFaq.id ? 'PATCH' : 'POST';
    try {
      const res = await fetch(url, { method, headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(editFaq) });
      if (res.ok) { setIsEditing(false); setEditFaq(null); fetchFaqs(); }
    } catch (e) { alert('Error saving FAQ'); }
  };

  const handleArchive = async (id) => {
    if (!confirm('Archive this FAQ?')) return;
    try {
      await fetch(`${API_BASE}/api/faq/${id}`, { method: 'DELETE', headers: authHeaders() });
      fetchFaqs();
    } catch (e) { }
  };

  const filtered = faqs.filter(f => (f.question + ' ' + f.answer).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2 min-w-0">
            <span className="text-2xl sm:text-3xl shrink-0">❓</span>
            <span className="truncate">Frequently Asked Questions</span>
          </h1>
          {canEdit && (
            <button
              onClick={() => { setEditFaq({ question: '', answer: '', category: 'general', display_order: 0, status: 'published', visibility: 'public' }); setIsEditing(true); }}
              className="shrink-0 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-all text-sm min-h-[40px]"
            >
              + New FAQ
            </button>
          )}
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search FAQs..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all mb-6 shadow-sm" />

        {loading ? <div className="animate-pulse flex flex-col gap-4">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-200 rounded-xl w-full" />)}</div> : (
          <div className="space-y-3">
            {filtered.map(faq => (
              <div key={faq.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div onClick={() => setExpanded(expanded === faq.id ? null : faq.id)} className="px-4 sm:px-5 py-4 cursor-pointer flex justify-between items-center gap-2 group min-h-[56px]">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span className="text-blue-500 font-bold opacity-50 group-hover:opacity-100 transition-opacity shrink-0">Q.</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-800 text-sm sm:text-base">{faq.question}</h3>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {faq.status !== 'published' && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded-full uppercase font-bold">{faq.status}</span>}
                        {faq.visibility === 'restricted' && <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] rounded-full uppercase font-bold">RESTRICTED</span>}
                      </div>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-slate-400 transition-transform shrink-0 ${expanded === faq.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
                {expanded === faq.id && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-50 bg-slate-50/50">
                    <div className="flex gap-3">
                      <span className="text-slate-400 font-bold opacity-50">A.</span>
                      <p className="text-slate-600 text-sm leading-relaxed">{faq.answer}</p>
                    </div>
                    {canEdit && (
                      <div className="mt-4 flex gap-2 justify-end">
                        <button onClick={() => { setEditFaq(faq); setIsEditing(true); }} className="text-xs text-blue-600 font-bold hover:underline">Edit</button>
                        <button onClick={() => handleArchive(faq.id)} className="text-xs text-red-500 font-bold hover:underline">Archive</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-slate-500 py-8">No FAQs found.</p>}
          </div>
        )}
      </div>

      {isEditing && editFaq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{editFaq.id ? 'Edit FAQ' : 'Add FAQ'}</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-bold text-slate-500">Question</label><input required value={editFaq.question} onChange={e => setEditFaq(p => ({ ...p, question: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm focus:border-blue-500 outline-none" /></div>
              <div><label className="text-xs font-bold text-slate-500">Answer</label><textarea required rows={4} value={editFaq.answer} onChange={e => setEditFaq(p => ({ ...p, answer: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm focus:border-blue-500 outline-none" /></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><label className="text-xs font-bold text-slate-500">Category</label><input value={editFaq.category} onChange={e => setEditFaq(p => ({ ...p, category: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm focus:border-blue-500 outline-none" /></div>
                <div><label className="text-xs font-bold text-slate-500">Order</label><input type="number" value={editFaq.display_order} onChange={e => setEditFaq(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm focus:border-blue-500 outline-none" /></div>
                <div><label className="text-xs font-bold text-slate-500">Status</label><select value={editFaq.status} onChange={e => setEditFaq(p => ({ ...p, status: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm focus:border-blue-500 outline-none"><option>published</option><option>draft</option><option>archived</option></select></div>
                <div><label className="text-xs font-bold text-slate-500">Visibility</label><select value={editFaq.visibility} onChange={e => setEditFaq(p => ({ ...p, visibility: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm focus:border-blue-500 outline-none"><option>public</option><option>restricted</option></select></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SystemHealthTab — Admin Dashboard (Suggestion #3)
// ---------------------------------------------------------------------------
function SystemHealthTab({ authHeaders }) {

  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore Backup state
  const [backups, setBackups] = useState(null);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [backupsError, setBackupsError] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null); // snapshot object from picker
  const [restoreStep, setRestoreStep] = useState(0); // 0=hidden, 1=confirm, 2=restoring
  const [backupNowLoading, setBackupNowLoading] = useState(false);

  // AI Log Viewer state
  const [aiLogs, setAiLogs] = useState(null);      // null = never loaded
  const [aiLogsLoading, setAiLogsLoading] = useState(false);
  const [aiLogsError, setAiLogsError] = useState(null);
  const [aiLogFilter, setAiLogFilter] = useState(''); // source filter

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/system-health`, { headers: authHeaders() });
      if (res.ok) setHealth(await res.json());
    } catch (e) { } finally { setLoading(false); }
  };
  useEffect(() => { fetchHealth(); const int = setInterval(fetchHealth, 45000); return () => clearInterval(int); }, []);

  const handleAction = async (endpoint, payload = {}) => {
    if (!confirm('Proceed with this administrative action?')) return;
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) alert('Success: ' + JSON.stringify(data));
      else alert('Failed: ' + data.error);
    } catch (e) { alert('Request failed.'); }
  };

  const handleBackupNow = async () => {
    if (!confirm('Push a snapshot of the current database to Supabase Storage now?')) return;
    setBackupNowLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/backup-db`, { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({}) });
      const data = await res.json();
      if (res.ok) alert(`✅ Backup pushed!\nFile: ${data.filename}\nSize: ${Math.round(data.bytes / 1024)} KB`);
      else alert('Backup failed: ' + data.error);
    } catch (e) { alert('Request failed.'); }
    finally { setBackupNowLoading(false); }
  };

  const handleOpenPicker = async () => {
    setShowPicker(true);
    setBackupsLoading(true);
    setBackupsError(null);
    setSelectedBackup(null);
    setRestoreStep(0);
    try {
      const res = await fetch(`${API_BASE}/api/admin/backups`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setBackups(data.snapshots || []);
      else setBackupsError(data.error || 'Failed to load backups.');
    } catch (e) { setBackupsError('Network error loading backups.'); }
    finally { setBackupsLoading(false); }
  };

  const handleSelectSnapshot = (snap) => {
    setSelectedBackup(snap);
    setRestoreStep(1);
  };

  const handleConfirmRestore = async () => {
    setRestoreStep(2);
    try {
      const res = await fetch(`${API_BASE}/api/admin/restore-backup`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ snapshotFilename: selectedBackup.filename })
      });
      // 202 Accepted is success — service will restart
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRestoreStep(1);
        alert('Restore failed: ' + (data.error || res.statusText));
      }
      // On success stay in step 2 (restoring overlay) — user waits ~60s then refreshes
    } catch (e) {
      setRestoreStep(1);
      alert('Network error — restore may not have started. Check Render logs.');
    }
  };

  const fmt = (bytes) => bytes != null ? `${Math.round(bytes / 1024)} KB` : '?';

  const fetchAiLogs = async () => {
    setAiLogsLoading(true);
    setAiLogsError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/ai-logs`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setAiLogs(data.entries || []);
      else setAiLogsError(data.error || 'Failed to load logs.');
    } catch (e) { setAiLogsError('Network error.'); }
    finally { setAiLogsLoading(false); }
  };

  if (loading) return <div className="p-6 font-mono text-slate-500">Loading system metrics...</div>;
  if (!health) return <div className="p-6 font-mono text-red-600 bg-red-50 border border-red-200 rounded-xl m-4">Failed to load system health.</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Memory Usage</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-display font-black ${health.ramUsagePct > 85 ? 'text-red-600' : 'text-blue-600'}`}>{health.ramUsagePct}%</span>
            <span className="text-xs text-slate-500 font-mono">{health.freeMemGB}GB free</span>
          </div>
        </div>
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Python Engine</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${health.pythonToolsOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
            <span className="text-lg font-display font-bold text-slate-900">{health.pythonToolsOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Vector DB (HNSW)</p>
          <div className="mt-2">
            <span className="text-lg font-display font-bold text-blue-600">{health.hnswChunkCount}</span> <span className="text-xs text-slate-500 font-mono">chunks</span>
            <p className="text-[10px] font-mono text-slate-400 mt-1">{health.hnswIndexSizeMB || '<1'} MB</p>
          </div>
        </div>
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">SQLite DB</p>
          <div className="mt-2">
            <span className="text-lg font-display font-bold text-emerald-600">{health.dbSizeMB || '<1'} MB</span>
          </div>
        </div>
      </div>

      {/* Maintenance Actions */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-xs font-display font-bold text-slate-900 uppercase tracking-wider mb-4">Maintenance Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            id="btn-backup-now"
            onClick={handleBackupNow}
            disabled={backupNowLoading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold font-mono rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {backupNowLoading ? 'Backing up…' : 'Backup Now'}
          </button>
          <button
            id="btn-restore-backup"
            onClick={handleOpenPicker}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold font-mono rounded-xl transition-all shadow-sm cursor-pointer"
          >
            🗃 Restore Backup
          </button>
          {health.orphanedEventLogs > 0 && (
            <div className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl flex items-center gap-2">
              ⚠️ {health.orphanedEventLogs} orphaned logs detected
            </div>
          )}
        </div>
      </div>

      {/* ── Backup Picker Panel ── */}
      {showPicker && restoreStep === 0 && (
        <div className="bg-white border-2 border-amber-300 rounded-2xl p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-display font-bold text-amber-800 uppercase tracking-wider">🗃 Available Snapshots</h3>
            <button onClick={() => setShowPicker(false)} className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer">✕ Close</button>
          </div>
          {backupsLoading && <p className="text-slate-500 text-sm font-mono">Loading snapshots…</p>}
          {backupsError && <p className="text-red-600 text-sm font-mono">{backupsError}</p>}
          {!backupsLoading && !backupsError && backups && (
            backups.length === 0
              ? <p className="text-slate-500 text-sm font-mono">No snapshots found in bucket.</p>
              : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {backups.map((snap) => (
                    <button
                      key={snap.filename}
                      onClick={() => handleSelectSnapshot(snap)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${snap.isSafety
                          ? 'bg-blue-50/60 border-blue-200 hover:bg-blue-100/50'
                          : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-blue-400'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-bold text-slate-900 truncate">{snap.filename}</p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {snap.timestamp ? new Date(snap.timestamp).toLocaleString() : 'Unknown time'}
                            {' · '}
                            {fmt(snap.size)}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex flex-col items-end gap-1">
                          <span className="text-[11px] font-mono font-bold text-slate-600">{snap.relativeTime}</span>
                          {snap.isSafety && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded font-bold">Safety</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )
          )}
        </div>
      )}

      {/* ── Confirm Step (Step 1) ── */}
      {restoreStep === 1 && selectedBackup && (
        <div className="bg-white border-2 border-red-300 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-display font-bold text-red-600 uppercase tracking-wider">⚠ Confirm Restore</h3>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
            <p className="text-xs font-bold text-slate-700">Restoring to:</p>
            <p className="text-sm font-mono text-blue-700 font-bold break-all">{selectedBackup.filename}</p>
            <p className="text-xs text-slate-500 font-mono">
              {selectedBackup.timestamp ? new Date(selectedBackup.timestamp).toLocaleString() : 'Unknown time'}
              {' · '}{fmt(selectedBackup.size)} · {selectedBackup.relativeTime}
            </p>
          </div>
          <div className="text-xs text-slate-600 space-y-1.5 font-mono">
            <p>⚠ <strong className="text-red-600">Everything written after this snapshot will be permanently discarded</strong> — events, users, changes, all of it.</p>
            <p>✅ A safety snapshot of the <strong className="text-slate-900">current live state</strong> will be taken automatically before restoring, so you can undo this if needed.</p>
            <p>⏳ The system will <strong className="text-slate-900">restart and be unavailable for ~30–60 seconds</strong>.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setRestoreStep(0); setSelectedBackup(null); }}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-restore"
              onClick={handleConfirmRestore}
              className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              Yes, Restore This Backup
            </button>
          </div>
        </div>
      )}

      {/* ── Restoring Overlay (Step 2) ── */}
      {restoreStep === 2 && (
        <div className="bg-white border-2 border-amber-400 rounded-2xl p-6 text-center space-y-3 shadow-xl">
          <div className="text-3xl animate-pulse">⏳</div>
          <h3 className="text-sm font-display font-bold text-amber-800 uppercase tracking-wider">Restoring backup…</h3>
          <p className="text-xs text-slate-600 font-mono">Safety snapshot taken. The service is restarting.</p>
          <p className="text-xs text-slate-500 font-mono">This page will be <strong className="text-slate-900">unavailable for ~30–60 seconds</strong>. Please wait before refreshing.</p>
          {selectedBackup && (
            <p className="text-[11px] font-mono text-slate-500 mt-2 break-all">Restoring to: {selectedBackup.filename}</p>
          )}
        </div>
      )}

      {/* ── AI / Server Log Viewer ── */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-xs font-display font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="text-blue-600">📡</span> AI / Server Log Viewer
            <span className="text-[10px] font-mono text-slate-500 font-normal ml-1">last 250 entries · in-memory only</span>
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={aiLogFilter}
              onChange={e => setAiLogFilter(e.target.value)}
              className="bg-slate-50 border-2 border-slate-200 rounded-xl px-2.5 py-1 text-[11px] font-mono text-slate-800 focus:outline-none focus:border-blue-600"
            >
              <option value="">All sources</option>
              {['SSE', 'Cache', 'RAG', 'Snapshot', 'VectorStore', 'Python AI'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={fetchAiLogs}
              disabled={aiLogsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-[11px] font-bold font-mono rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <svg className={`w-3.5 h-3.5 ${aiLogsLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {aiLogsLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        {aiLogsError && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-xs font-mono">
            ⚠ {aiLogsError}
          </div>
        )}

        {aiLogs === null && !aiLogsLoading && !aiLogsError && (
          <p className="text-slate-500 text-xs font-mono text-center py-4">Click Refresh to load the live server log buffer.</p>
        )}

        {aiLogs !== null && (() => {
          const filtered = aiLogFilter ? aiLogs.filter(e => e.source === aiLogFilter) : aiLogs;
          return filtered.length === 0 ? (
            <p className="text-slate-500 text-center py-6 text-xs font-mono">No entries{aiLogFilter ? ` for source "${aiLogFilter}"` : ''} in buffer.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-xl border-2 border-slate-200 font-mono text-[11px] bg-white">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-slate-100 border-b-2 border-slate-200 z-10">
                  <tr className="text-slate-600 text-[10px] uppercase font-bold tracking-wider">
                    <th className="px-3 py-2 text-left w-24">Time</th>
                    <th className="px-3 py-2 text-left w-14">Level</th>
                    <th className="px-3 py-2 text-left w-24">Source</th>
                    <th className="px-3 py-2 text-left">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((entry, i) => (
                    <tr key={i} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{new Date(entry.ts).toLocaleTimeString()}</td>
                      <td className="px-3 py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${entry.level === 'warn' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            entry.level === 'error' ? 'bg-red-100 text-red-800 border border-red-300' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>{entry.level}</span>
                      </td>
                      <td className="px-3 py-1.5 text-blue-700 font-bold whitespace-nowrap">{entry.source}</td>
                      <td className="px-3 py-1.5 text-slate-800 break-all">{entry.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
}


function EventsAnalyticsModule({ authHeaders, authUser, sidebarOpen, onToggleSidebar, setCurrentView }) {
  const [mainTab, setMainTab] = useState('dashboard'); // 'dashboard' | 'events'
  const [chartType, setChartType] = useState('event');
  const [showGender, setShowGender] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Manage events state
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalEvent, setModalEvent] = useState(undefined); // undefined=closed, null=new, object=edit
  const [deleteId, setDeleteId] = useState(null);
  const [qrEvent, setQrEvent] = useState(null);
  const [logEvent, setLogEvent] = useState(null);
  const [qrRefreshHash, setQrRefreshHash] = useState(Date.now());

  const handleRefreshQR = async (eventId) => {
    const adminToken = prompt('Enter Admin Creation Token to authorize QR refresh:');
    if (!adminToken) return;

    try {
      const res = await fetch(`${API_BASE}/api/events/${eventId}/refresh-qr`, {
        method: 'POST',
        headers: authHeaders ? authHeaders({ 'Content-Type': 'application/json' }) : { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_token: adminToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refresh failed');
      alert(data.message);
      setQrRefreshHash(Date.now());
    } catch (e) {
      alert(e.message);
    }
  };

  const fetchChart = async (type, sg, ss) => {
    setLoading(true); setError(null);
    try {
      let url = `${API_BASE}/api/analytics/events?type=${type}`;
      if (type === 'attendance') { url += `&show_gender=${sg}&show_staff=${ss}`; }
      const res = await fetch(url, { headers: authHeaders ? authHeaders() : {} });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || res.statusText); }
      const data = await res.json();
      setStats(data.stats);
      setChartData(data.chart ? JSON.parse(data.chart) : null);
    } catch (e) { setError(e.message); setChartData(null); }
    finally { setLoading(false); }
  };

  const fetchEvents = async () => {
    setEventsLoading(true);
    try {
      let url = `${API_BASE}/api/events?`;
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterCat) url += `category=${filterCat}&`;
      const res = await fetch(url, { headers: authHeaders ? authHeaders() : {} });
      const data = await res.json();
      setEvents(data);
    } catch { } finally { setEventsLoading(false); }
  };

  useEffect(() => { fetchChart(chartType, showGender, showStaff); }, [chartType, showGender, showStaff]);
  useEffect(() => { if (mainTab === 'events') fetchEvents(); }, [mainTab, filterCat, filterStatus]);

  const handleToggleStatus = async (ev) => {
    const newStatus = ev.status === 'upcoming' ? 'active' : ev.status === 'active' ? 'completed' : 'upcoming';
    try {
      const res = await fetch(`${API_BASE}/api/events/${ev.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(authHeaders ? authHeaders() : {}) },
        body: JSON.stringify({ ...ev, status: newStatus })
      });
      if (res.ok) {
        fetchEvents();
      }
    } catch (e) { }
  };

  const handleDelete = async (id) => {
    try { await fetch(`${API_BASE}/api/events/${id}`, { method: 'DELETE', headers: authHeaders ? authHeaders() : {} }); }
    catch { } finally { setDeleteId(null); fetchEvents(); fetchChart(chartType, showGender, showStaff); }
  };

  const chartTabs = [
    { id: 'event', label: 'By Event' },
    { id: 'monthly', label: 'By Month' },
    { id: 'status', label: 'By Status' },
    { id: 'attendance', label: 'Attendance' },
  ];

  const [filterNeedsReview, setFilterNeedsReview] = useState(false);
  const needsReviewCount = events.filter(ev => ev.needs_review === 1).length;

  const filteredEvents = events.filter(ev => {
    if (searchQ) {
      const q = searchQ.toLowerCase();
      const matchTitle = (ev.title || '').toLowerCase().includes(q);
      const matchCat = (ev.category || '').toLowerCase().includes(q);
      const matchComm = (ev.committee || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCat && !matchComm) return false;
    }
    if (filterNeedsReview && ev.needs_review !== 1) return false;
    return true;
  });

  const fmtBudget = (v) => (v != null && v !== '') ? `₱${Number(v).toLocaleString()}` : '';

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto relative text-slate-900">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200/80 bg-white/70 backdrop-blur-md flex flex-wrap items-center px-4 sm:px-6 py-3 gap-x-4 gap-y-2 min-h-[4rem] sticky top-0 z-30 justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {!sidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="text-slate-500 hover:text-blue-600 transition-all p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200/60 flex items-center justify-center cursor-pointer md:hidden"
              title="Open Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          )}
          <span className="text-base sm:text-lg font-display font-black tracking-wider text-slate-900 truncate">📅 EVENTS &amp; ATTENDANCE</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {['dashboard', 'events'].map(t => (
            <button
              key={t}
              onClick={() => setMainTab(t)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer ${mainTab === t
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
            >
              {t === 'dashboard' ? '📊 Dashboard' : '📋 Events'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 max-w-6xl w-full mx-auto">
        {/* ==================== DASHBOARD TAB ==================== */}
        {mainTab === 'dashboard' && (() => {
          const activeEvent = events.find(e => e.status === 'active');
          return (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-black text-slate-900">Dashboard</h2>
                <p className="text-slate-500 font-mono text-xs sm:text-sm mt-1">Live attendance &amp; event monitoring overview</p>
              </div>

              {activeEvent ? (
                <>
                  <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-center items-center sm:items-start text-center sm:text-left shadow-sm">
                    <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mb-2">Total Attendees</p>
                    <p className="text-6xl sm:text-7xl font-display font-black text-blue-600">{activeEvent.attendees || 0}</p>
                  </div>

                  <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 mb-4">
                      <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">Active events — attendance scanning</p>
                      <span className="text-xs font-mono font-bold text-slate-700 uppercase tracking-widest bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl">{activeEvent.title}</span>
                    </div>
                    <button onClick={() => setQrEvent(activeEvent)} className="w-full flex items-center justify-between bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 rounded-xl font-display font-bold transition-all shadow-md active:scale-[0.99] cursor-pointer">
                      <span className="text-lg truncate mr-4">{activeEvent.title}</span>
                      <span className="shrink-0 font-mono text-sm uppercase tracking-wider">Show QR Code →</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                  <div className="text-4xl mb-3">🎪</div>
                  <p className="text-slate-800 font-display font-bold text-lg">No active event right now.</p>
                  <p className="text-sm font-mono text-slate-500 mt-2">Start an event in the Events tab to see live analytics and attendance scanning.</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ==================== MANAGE EVENTS TAB ==================== */}
        {mainTab === 'events' && (<>
          {/* Scope Banner */}
          {authUser?.role === 'committee' && (
            !authUser?.committee ? (
              <div className="p-3.5 mb-3 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-center gap-2.5 text-xs font-bold text-amber-900 shadow-sm">
                <span className="text-base">⚠️</span>
                <div>
                  <strong>Committee not assigned.</strong> Contact the administrator to assign your committee. You cannot view or create committee events until assigned.
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-xl text-xs font-mono font-semibold text-blue-900 mb-3 shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
                <span>Scope: Showing <strong>{getCommitteeLabel(authUser.committee)}</strong> + General Events</span>
              </div>
            )
          )}
          {['admin', 'chairman'].includes(authUser?.role) && (
            <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 mb-3 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Scope: Showing <strong>All Committees & General</strong> (System-wide)</span>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex-1 flex gap-2 flex-wrap sm:flex-nowrap">
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search events..." className="flex-1 bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-blue-600 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none transition-all shadow-sm" />
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-blue-600 rounded-xl px-2 py-2 text-xs font-mono text-slate-900 focus:outline-none max-w-[140px] shadow-sm">
                <option value="">All Categories</option>
                {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {needsReviewCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterNeedsReview(!filterNeedsReview)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all border-2 flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    filterNeedsReview
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                  title="Filter events migrated as general needing review"
                >
                  <span>⚠️</span> Needs Review ({needsReviewCount})
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-blue-600 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none shadow-sm">
                <option value="">All Statuses</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
              <button
                disabled={authUser?.role === 'committee' && !authUser?.committee}
                onClick={() => setModalEvent(null)}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 text-white text-xs font-display font-bold uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                + Add Event
              </button>
            </div>
          </div>

          {/* Event cards */}
          {eventsLoading && <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}
          {!eventsLoading && filteredEvents.length === 0 && (
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-8 text-center shadow-sm">
              <p className="text-slate-500 font-mono text-sm">No events found matching your filter criteria.</p>
            </div>
          )}
          <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-display font-bold uppercase text-slate-600 border-b-2 border-slate-200">
                <tr>
                  <th className="px-4 py-3">Event Name</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Committee</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Attendees</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map(ev => (
                  <tr key={ev.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3 font-display font-bold text-slate-900">
                      {ev.title}
                      {ev.time && <div className="text-xs text-slate-500 font-mono font-normal">{ev.time}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-600">
                      {ev.date ? new Date(ev.date + 'T00:00:00+08:00').toLocaleDateString('en-US', { timeZone: 'Asia/Singapore', month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ev.location || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <CommitteeBadge committee={ev.committee} compact={true} />
                        {ev.needs_review === 1 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Needs Review
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full">
                        {ev.category === 'others' && ev.category_other_label ? `Others: ${ev.category_other_label}` : ev.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${ev.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' :
                          ev.status === 'active' ? 'bg-emerald-600 text-white shadow-sm' :
                            'bg-amber-50 text-amber-800 border border-amber-300'
                        }`}>
                        {ev.status === 'completed' ? 'Completed' : ev.status === 'active' ? 'Active' : 'Not Started'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{ev.attendees || 0}</td>
                    <td className="px-4 py-3 text-right">
                      {(() => {
                        const canMutate = ['admin', 'chairman'].includes(authUser?.role) ||
                          (authUser?.role === 'committee' && authUser?.committee && ev.committee === authUser?.committee);
                        return (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex gap-1.5 justify-end">
                              {canMutate && (
                                <button onClick={() => setModalEvent(ev)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] uppercase font-bold rounded-lg border border-slate-200 cursor-pointer transition-colors">Edit</button>
                              )}
                              {['admin', 'chairman', 'committee'].includes(authUser?.role) && (
                                <button onClick={() => setLogEvent(ev)} className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] uppercase font-bold rounded-lg border border-blue-200 cursor-pointer transition-colors">Event log</button>
                              )}
                              {canMutate && (
                                <button onClick={() => setDeleteId(ev.id)} className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] uppercase font-bold rounded-lg border border-red-200 cursor-pointer transition-colors">Delete</button>
                              )}
                            </div>
                            {ev.status === 'active' && (
                              <button onClick={() => setQrEvent(ev)} className="mt-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] uppercase font-bold tracking-wider rounded-lg shadow-sm cursor-pointer transition-all">
                                Show QR Code
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>)}
      </div>

      {/* Modal */}
      {modalEvent !== undefined && (
        <EventFormModal
          event={modalEvent}
          onClose={() => setModalEvent(undefined)}
          onSaved={() => { setModalEvent(undefined); fetchEvents(); fetchChart(chartType, showGender, showStaff); }}
          authHeaders={authHeaders}
          authUser={authUser}
        />
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white border-2 border-red-300 rounded-2xl p-6 max-w-sm shadow-2xl text-slate-900" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-display font-bold text-red-600 mb-2">Delete Event?</h3>
            <p className="text-slate-600 text-sm mb-4">Are you sure you want to delete this event? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-500 transition-colors shadow-sm cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setQrEvent(null)}>
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-8 max-w-sm flex flex-col items-center shadow-2xl text-slate-900" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-display font-bold text-slate-900 mb-2 text-center">{qrEvent.title}</h3>
            <p className="text-sm text-slate-500 mb-6 text-center font-mono">Youth can scan this QR code to mark their attendance.</p>

            <div className="bg-white p-4 rounded-2xl mb-6 border-2 border-slate-200 shadow-lg">
              <img src={`${API_BASE}/api/events/${qrEvent.id}/qr?h=${qrRefreshHash}`} alt="Event QR Code" className="w-48 h-48" />
            </div>

            {authUser?.role === 'admin' && (
              <button onClick={() => handleRefreshQR(qrEvent.id)} className="w-full mb-3 px-4 py-2.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors shadow-sm cursor-pointer font-mono text-xs uppercase tracking-wider">
                Refresh QR (Admin Only)
              </button>
            )}

            <button onClick={() => setQrEvent(null)} className="w-full px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm cursor-pointer font-mono text-xs uppercase tracking-wider">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Event Logs Modal */}
      {logEvent && (
        <EventLogModal
          open={!!logEvent}
          onClose={() => setLogEvent(null)}
          event={logEvent}
          token={authHeaders().Authorization?.split(' ')[1]}
          authUser={authUser}
          onToggleStatus={(ev) => {
            handleToggleStatus(ev);
            setLogEvent({ ...ev, status: ev.status === 'upcoming' ? 'active' : 'completed' });
          }}
          onShowQR={setQrEvent}
          qrRefreshHash={qrRefreshHash}
          onRefreshQR={handleRefreshQR}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReportsModule — Phase 2 Feature 7
// Template-based SK document generation (Resolution, Minutes, Certificate).
// Calls Python AI Layer via Node.js proxy to generate DOCX or PDF files.
// ---------------------------------------------------------------------------
function ReportsModule({ authHeaders, authUser, sidebarOpen, onToggleSidebar }) {
  const [templateId, setTemplateId] = useState('resolution');
  const [format, setFormat] = useState('docx');
  const [formData, setFormData] = useState({});
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Reset form fields when template changes
  useEffect(() => { setFormData({}); setError(null); }, [templateId]);

  const templateFields = {
    resolution: [
      { key: 'series_no', label: 'Series No.', placeholder: 'e.g. 001' },
      { key: 'year', label: 'Year', placeholder: '2025' },
      { key: 'title', label: 'Resolution Title', placeholder: 'Title of the resolution' },
      { key: 'whereas_1', label: 'WHEREAS (1)', placeholder: 'First whereas clause', multiline: true },
      { key: 'whereas_2', label: 'WHEREAS (2) — optional', placeholder: 'Second whereas clause', multiline: true },
      { key: 'resolved_1', label: 'RESOLVED', placeholder: 'Main resolved clause', multiline: true },
      { key: 'resolved_2', label: 'RESOLVED FURTHER — optional', placeholder: 'Additional resolved clause', multiline: true },
      { key: 'date', label: 'Day', placeholder: 'e.g. 15th' },
      { key: 'month', label: 'Month', placeholder: 'e.g. July' },
      { key: 'chairperson', label: 'SK Chairperson Name', placeholder: 'Full name' },
      { key: 'secretary', label: 'SK Secretary Name', placeholder: 'Full name' },
    ],
    minutes: [
      { key: 'date', label: 'Date', placeholder: 'e.g. July 15, 2025' },
      { key: 'time', label: 'Time', placeholder: 'e.g. 2:00 PM' },
      { key: 'venue', label: 'Venue', placeholder: 'Barangay Hall, Concepcion Dos' },
      { key: 'presiding_officer', label: 'Presiding Officer', placeholder: 'SK Chairperson' },
      { key: 'attendees', label: 'Attendees (one per line)', placeholder: 'Name 1\nName 2\nName 3', multiline: true, isList: true },
      { key: 'agenda', label: 'Agenda Items (one per line)', placeholder: 'Item 1\nItem 2', multiline: true, isList: true },
      { key: 'proceedings', label: 'Proceedings / Discussion', placeholder: 'Discussion details...', multiline: true },
      { key: 'action_items', label: 'Action Items (one per line)', placeholder: 'Action 1\nAction 2', multiline: true, isList: true },
      { key: 'adjournment_time', label: 'Adjournment Time', placeholder: 'e.g. 4:30 PM' },
      { key: 'prepared_by', label: 'Prepared By', placeholder: 'SK Secretary name' },
      { key: 'noted_by', label: 'Noted By', placeholder: 'SK Chairperson name' },
    ],
    certificate: [
      { key: 'recipient_name', label: 'Recipient Name', placeholder: 'Full name of awardee' },
      { key: 'purpose', label: 'Purpose / Recognition', placeholder: 'e.g. outstanding contribution to...', multiline: true },
      { key: 'details', label: 'Additional Details — optional', placeholder: 'Extra details...', multiline: true },
      { key: 'date', label: 'Day', placeholder: 'e.g. 15th' },
      { key: 'month', label: 'Month', placeholder: 'e.g. July' },
      { key: 'year', label: 'Year', placeholder: '2025' },
      { key: 'chairperson', label: 'SK Chairperson Name', placeholder: 'Full name' },
      { key: 'barangay_captain', label: 'Barangay Captain Name', placeholder: 'Full name' },
    ],
    project_brief: [
      { key: 'project_name', label: 'Name of Project / Activity', placeholder: 'e.g. Gabi ng Kabataan 2025' },
      { key: 'location', label: 'Location', placeholder: 'e.g. Barangay Concepcion Dos Multi-Purpose Hall' },
      { key: 'target_date', label: 'Target Date of Implementation', placeholder: 'e.g. December 15, 2025' },
      { key: 'background', label: 'Background / Rationale', placeholder: 'Why is this project needed?', multiline: true },
      { key: 'objective', label: 'Objective', placeholder: 'What does this project aim to achieve?', multiline: true },
      { key: 'physical_output', label: 'Target Physical Output', placeholder: 'e.g. 200 youth attended, 50 kits distributed', multiline: true },
      { key: 'beneficiaries', label: 'Target Beneficiaries', placeholder: 'e.g. Youth aged 15–30 of Barangay Concepcion Dos' },
      { key: 'budget', label: 'Budget (Php)', placeholder: 'e.g. 50,000' },
      { key: 'prepared_by_name', label: 'Prepared By — Name', placeholder: 'Full name' },
      { key: 'prepared_by_title', label: 'Prepared By — Title/Position', placeholder: 'e.g. SK Chairperson' },
    ],
  };

  const handleFieldChange = (key, value, isList) => {
    setFormData(prev => ({
      ...prev,
      [key]: isList ? value : value, // store raw; convert to list on submit
    }));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      // Convert list fields from newline-delimited strings to arrays
      const processedData = { ...formData };
      for (const field of templateFields[templateId]) {
        if (field.isList && typeof processedData[field.key] === 'string') {
          processedData[field.key] = processedData[field.key].split('\n').map(s => s.trim()).filter(Boolean);
        }
      }

      const res = await fetch(`${API_BASE}/api/generate-document`, {
        method: 'POST',
        headers: authHeaders ? authHeaders({ 'Content-Type': 'application/json' }) : { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId, data: processedData, format }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Generation failed.' }));
        throw new Error(err.error || res.statusText);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateId}_document.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const templates = [
    { id: 'resolution', label: 'SK Resolution', emoji: '📜' },
    { id: 'minutes', label: 'Meeting Minutes', emoji: '📝' },
    { id: 'certificate', label: 'Certificate of Recognition', emoji: '🏆' },
    { id: 'project_brief', label: 'Project Brief', emoji: '📊' },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto relative text-slate-900">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200/80 bg-white/70 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 py-3 min-h-[4rem] sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          {!sidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="text-slate-500 hover:text-blue-600 transition-all p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200/60 flex items-center justify-center cursor-pointer md:hidden"
              title="Open Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          )}
          <span className="text-base sm:text-lg font-display font-black tracking-wider text-slate-900 truncate">🗂️ OFFICIAL REPORTS</span>
        </div>
        <span className="font-mono text-xs text-blue-700 font-bold hidden sm:block bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl">DOCUMENT ENGINE</span>
      </div>

      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Template selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-sm font-display font-bold transition-all cursor-pointer ${templateId === t.id
                    ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-md scale-[1.02]'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                  }`}
              >
                <span className="text-2xl drop-shadow-sm">{t.emoji}</span>
                <span className="text-center leading-tight tracking-wide text-xs">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Dynamic form fields */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-display font-bold text-slate-800 uppercase tracking-wider mb-2">
              Template Information: {templates.find(t => t.id === templateId)?.label}
            </h3>
            {templateFields[templateId].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-mono font-bold text-slate-700 mb-1.5 uppercase tracking-wide">{field.label}</label>
                {field.multiline ? (
                  <textarea
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none resize-y min-h-[80px] transition-all shadow-sm"
                    placeholder={field.placeholder}
                    value={formData[field.key] || ''}
                    onChange={e => handleFieldChange(field.key, e.target.value, field.isList)}
                    rows={3}
                  />
                ) : (
                  <input
                    type="text"
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none transition-all shadow-sm"
                    placeholder={field.placeholder}
                    value={formData[field.key] || ''}
                    onChange={e => handleFieldChange(field.key, e.target.value)}
                  />
                )}
              </div>
            ))}

            {/* Format selector + Generate button */}
            <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <label className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider">Format:</label>
                <select
                  value={format}
                  onChange={e => setFormat(e.target.value)}
                  className="bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-blue-600 focus:outline-none shadow-sm cursor-pointer"
                >
                  <option value="docx">DOCX</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 text-white font-display font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider shadow-md cursor-pointer active:scale-[0.99]"
              >
                {generating ? 'Generating Document...' : `Generate ${format.toUpperCase()}`}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-red-600 text-xs font-mono shadow-sm">
              ⚠ Error: {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AdminDashboardModule — Phase 6-E: Authenticated Analytics, Logs, Users
// ---------------------------------------------------------------------------
function AdminDashboardModule({ authHeaders, authUser, sidebarOpen, onToggleSidebar }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'logs'
  const effectiveRole = authUser?.role || 'admin';
  const [stats, setStats] = useState({ totalEvents: 0, totalAttendees: 0, totalBudget: 0, pendingSuggestions: 0, activeUsers: 0 });
  const [participationData, setParticipationData] = useState([]);

  // Leaderboard states
  const [leaderboardSortBy, setLeaderboardSortBy] = useState('attendees'); // 'date' | 'attendees' | 'budget'
  const [leaderboardSortAsc, setLeaderboardSortAsc] = useState(false); // false = desc
  const [leaderboardLimit, setLeaderboardLimit] = useState(10); // 'All' handled conditionally
  const [budgetData, setBudgetData] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logActorFilter, setLogActorFilter] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // User CRUD states
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', full_name: '', role: 'committee', committee: '', password: '' });
  const [newUserToken, setNewUserToken] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [editUserConfirmPw, setEditUserConfirmPw] = useState('');
  const [editUserToken, setEditUserToken] = useState('');
  // Two-step deletion state
  const [deleteTarget, setDeleteTarget] = useState(null);  // { id, username } | null
  const [deleteStep, setDeleteStep] = useState(1);         // 1 = first confirm, 2 = type username
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  // Derived: is there already a chairman?
  const hasChairman = users.some(u => u.role === 'chairman' && u.status === 'active');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    const headers = authHeaders({ 'X-Actor': authUser?.full_name || 'Admin', 'X-Role': effectiveRole });

    // 1. Fetch Stats — dedicated helper with explicit JWT
    const fetchAdminStats = async () => {
      try {
        const token = localStorage.getItem('askyouth_token') || sessionStorage.getItem('askyouth_token');
        const res = await fetch(`${API_BASE}/api/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Actor': authUser?.full_name || 'Admin',
            'X-Role': effectiveRole,
          }
        });
        if (res.ok) {
          const d = await res.json();
          setStats({
            totalEvents: d.totalEvents || 0,
            totalAttendees: d.totalAttendees || 0,
            totalBudget: d.totalBudget || 0,
            pendingSuggestions: d.pendingSuggestions || 0,
            activeUsers: d.activeUsers || 0,
          });
        } else {
          console.error('[Admin Stats] HTTP', res.status, await res.text());
        }
      } catch (err) {
        console.error('[Admin Stats] Fetch error:', err);
      }
    };
    await fetchAdminStats();

    // 2. Fetch participation
    try {
      const resPart = await fetch(`${API_BASE}/api/admin/participation`, { headers });
      if (resPart.ok) setParticipationData(await resPart.json());
    } catch (err) {
      console.error('Participation fetch error:', err);
    }

    // 3. Fetch budget
    try {
      const resBudg = await fetch(`${API_BASE}/api/admin/budget`, { headers });
      if (resBudg.ok) setBudgetData(await resBudg.json());
    } catch (err) {
      console.error('Budget fetch error:', err);
    }

    // 4. Fetch users
    try {
      const resUsers = await fetch(`${API_BASE}/api/users`, { headers });
      if (resUsers.ok) setUsers(await resUsers.json());
    } catch (err) {
      console.error('Users fetch error:', err);
    }

    // 5. Fetch logs if admin
    if (effectiveRole === 'admin') {
      try {
        const resLogs = await fetch(`${API_BASE}/api/admin/logs?page=${logsPage}&limit=20&actor=${encodeURIComponent(logActorFilter)}&action=${encodeURIComponent(logActionFilter)}`, { headers });
        if (resLogs.ok) {
          const dataLogs = await resLogs.json();
          setLogs(dataLogs.logs || []);
          setLogsTotalPages(dataLogs.totalPages || 1);
        }
      } catch (err) {
        console.error('Logs fetch error:', err);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [effectiveRole, logsPage, logActorFilter, logActionFilter]);

  // Handle Add User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (newUser.role === 'committee' && !newUser.committee) {
      alert('Please select a Committee for this account.');
      return;
    }
    // Account creation requires token (as another safeguard for administrating accounts)
    if (!newUserToken.trim()) {
      alert('A privileged authorization token is required to create an account.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json', 'X-Actor': authUser?.full_name || 'Admin', 'X-Role': effectiveRole }),
        body: JSON.stringify({
          ...newUser,
          committee: newUser.role === 'committee' ? newUser.committee : null,
          admin_token: newUserToken || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      alert('User created successfully!');
      setShowAddUser(false);
      setNewUser({ username: '', full_name: '', role: 'committee', committee: '', password: '' });
      setNewUserToken('');
      fetchDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Update User
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    if (editUser.role === 'committee' && !editUser.committee) {
      alert('Please select a Committee for this account.');
      return;
    }
    // Token is ALWAYS required for any account modification
    if (!editUserToken.trim()) {
      alert('An authorization token is required to modify any account.');
      return;
    }
    // If changing password, also validate match
    if (editUser.password) {
      if (editUser.password !== editUserConfirmPw) {
        alert('Passwords do not match. Please confirm the new password.');
        return;
      }
    }
    try {
      const res = await fetch(`${API_BASE}/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json', 'X-Actor': authUser?.full_name || 'Admin', 'X-Role': effectiveRole }),
        body: JSON.stringify({
          full_name: editUser.full_name,
          role: editUser.role,
          committee: editUser.role === 'committee' ? editUser.committee : null,
          status: editUser.status,
          admin_token: editUserToken,
          ...(editUser.password ? { password: editUser.password } : {})
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      alert('Account updated successfully.');
      setEditUser(null);
      setEditUserConfirmPw('');
      setEditUserToken('');
      fetchDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  // DEACTIVATE — simple single confirm, used from the table button only
  const handleDeactivateUser = async (usr) => {
    if (!confirm(`Deactivate account "${usr.username}"? Their access will be revoked immediately.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/${usr.id}`, {
        method: 'DELETE',
        headers: authHeaders({ 'X-Actor': authUser?.full_name || 'Admin', 'X-Role': effectiveRole })
      });
      if (!res.ok) throw new Error('Failed to deactivate account');
      fetchDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  // DELETE — 2-step username confirmation, only reachable from inside Edit modal
  const openDeleteFlow = (user) => {
    setDeleteTarget(user);
    setDeleteStep(1);
    setDeleteConfirmInput('');
  };
  const cancelDelete = () => {
    setDeleteTarget(null);
    setDeleteStep(1);
    setDeleteConfirmInput('');
  };
  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: authHeaders({ 'X-Actor': authUser?.full_name || 'Admin', 'X-Role': effectiveRole })
      });
      if (!res.ok) throw new Error('Failed to delete account');
      cancelDelete();
      fetchDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };


  // Admin: lift login lockout for a user
  const handleLiftLockout = async (username) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/unlock-user`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json', 'X-Actor': authUser?.full_name || 'Admin', 'X-Role': effectiveRole }),
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to lift lockout');
      fetchDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Export CSV Logs Client-Side
  const handleExportLogs = () => {
    if (logs.length === 0) return alert('No logs to export');
    const headers = ['Timestamp', 'Actor', 'Role', 'Action', 'Target', 'Details', 'IP Address'];
    const rows = logs.map(l => [
      `"${l.created_at}"`, `"${l.actor}"`, `"${l.role}"`, `"${l.action}"`, `"${l.target || ''}"`, `"${(l.details || '').replace(/"/g, '""')}"`, `"${l.ip_address || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `system_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Leaderboard sorting and limiting
  let sortedParticipationData = [...participationData];
  sortedParticipationData.sort((a, b) => {
    let valA = 0;
    let valB = 0;

    if (leaderboardSortBy === 'date') {
      valA = new Date(a.date || 0).getTime() || 0;
      valB = new Date(b.date || 0).getTime() || 0;
    } else if (leaderboardSortBy === 'budget') {
      valA = Number(a.budget_allotted) || 0;
      valB = Number(b.budget_allotted) || 0;
    } else if (leaderboardSortBy === 'attendees') {
      valA = Number(a.attendees) || 0;
      valB = Number(b.attendees) || 0;
    } else {
      valA = a[leaderboardSortBy] || 0;
      valB = b[leaderboardSortBy] || 0;
    }

    if (valA < valB) return leaderboardSortAsc ? -1 : 1;
    if (valA > valB) return leaderboardSortAsc ? 1 : -1;
    return 0;
  });
  if (leaderboardLimit !== 'All') {
    sortedParticipationData = sortedParticipationData.slice(0, parseInt(leaderboardLimit));
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent text-slate-900 overflow-y-auto relative">
      {/* Top Banner */}
      <div className="shrink-0 border-b border-slate-200/80 bg-white/70 backdrop-blur-md px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          {!sidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="text-slate-500 hover:text-blue-600 transition-all p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200/60 flex items-center justify-center cursor-pointer md:hidden"
              title="Open Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-display font-black text-slate-900 tracking-wide truncate">
              🛡️ ADMIN GATEWAY
            </h1>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border-2 border-slate-200 font-mono text-[11px]">
          <div className="flex items-center gap-2 truncate">
            <span className="text-slate-500 select-none font-bold">OPERATOR:</span>
            <span className="text-slate-900 font-bold truncate max-w-[120px]">{authUser?.full_name}</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-bold uppercase text-[9px] shrink-0">
            {effectiveRole}
          </span>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="relative shrink-0">
        <div className="px-3 sm:px-6 pt-2 sm:pt-4 flex flex-nowrap gap-1 sm:gap-2 border-b-2 border-slate-200 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Analytics', icon: '📊' },
            { id: 'users', label: 'Users', icon: '👥' },
            ...(effectiveRole === 'admin' ? [{ id: 'logs', label: 'Audit', icon: '📜' }] : []),
            ...(['admin'].includes(effectiveRole) ? [{ id: 'health', label: 'System Health', icon: '🩺' }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 border-b-2 font-display text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-700 bg-blue-50/60 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50 rounded-t-xl'
                }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="ml-auto my-auto p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-xl hover:bg-slate-100 shrink-0 cursor-pointer"
            title="Refresh Data"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>

      {/* Tab content wrappers */}
      <div className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto space-y-4 sm:space-y-6">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-600 p-3 rounded-2xl text-xs font-mono shadow-sm">
            ⚠️ Gateway Error: {error}
          </div>
        )}

        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'TOTAL SK EVENTS', val: stats.totalEvents, color: 'border-blue-200 text-blue-600', icon: '📅' },
                { label: 'ACTIVE ATTENDEES', val: (stats.totalAttendees ?? 0).toLocaleString(), color: 'border-cyan-200 text-cyan-600', icon: '🙋‍♂️' },
                { label: 'BUDGET UTILIZED', val: `₱${(stats.totalBudget ?? 0).toLocaleString()}`, color: 'border-emerald-200 text-emerald-600', icon: '💰' },
                { label: 'PENDING SUGGESTIONS', val: stats.pendingSuggestions, color: 'border-amber-200 text-amber-600', icon: '📬' },
              ].map((st, i) => (
                <div key={i} className={`bg-white border-2 ${st.color} rounded-2xl p-5 relative group hover:shadow-md transition-all overflow-hidden`}>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">{st.label}</span>
                    <span className="text-base select-none">{st.icon}</span>
                  </div>
                  <div className="mt-2 text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-900 group-hover:scale-105 origin-left transition-transform">
                    {st.val ?? '—'}
                  </div>
                </div>
              ))}
            </div>

            {/* Side-by-Side Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Participation Bar Chart */}
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 flex flex-col h-[400px] shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                  <h3 className="text-xs font-display text-slate-800 uppercase tracking-wider font-bold flex items-center gap-2 m-0">
                    <span className="w-2 h-2 rounded-full bg-blue-600" /> Event Statistics
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
                    <span className="text-slate-500 font-bold">Sort:</span>
                    <select
                      value={leaderboardSortBy}
                      onChange={e => setLeaderboardSortBy(e.target.value)}
                      className="bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-0.5 text-slate-800 focus:outline-none focus:border-blue-600 font-bold"
                    >
                      <option value="date">Date</option>
                      <option value="attendees">Attendees</option>
                      <option value="budget">Budget</option>
                    </select>
                    <button
                      onClick={() => setLeaderboardSortAsc(!leaderboardSortAsc)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                      title={leaderboardSortAsc ? "Ascending" : "Descending"}
                    >
                      {leaderboardSortAsc ? '▲' : '▼'}
                    </button>
                    <span className="text-slate-400 ml-1 border-l border-slate-200 pl-2 font-bold">Show:</span>
                    <select
                      value={leaderboardLimit}
                      onChange={e => setLeaderboardLimit(e.target.value)}
                      className="bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-0.5 text-slate-800 focus:outline-none focus:border-blue-600 font-bold"
                    >
                      <option value="5">Top 5</option>
                      <option value="10">Top 10</option>
                      <option value="All">All</option>
                    </select>
                  </div>
                </div>
                <div className="flex-1 w-full relative">
                  {sortedParticipationData.length > 0 ? (
                    <Plot
                      data={[{
                        type: 'bar',
                        x: sortedParticipationData.map(d => d.title.substring(0, 15) + (d.title.length > 15 ? '…' : '')),
                        y: sortedParticipationData.map(d => leaderboardSortBy === 'budget' ? (Number(d.budget_allotted) || 0) : (Number(d.attendees) || 0)),
                        text: sortedParticipationData.map(d => `<b>${d.title}</b><br>Date: ${d.date ? new Date(d.date).toLocaleDateString() : 'N/A'}<br>Attendees: ${d.attendees || 0}<br>Budget: ₱${(Number(d.budget_allotted) || 0).toLocaleString()}`),
                        hoverinfo: 'text',
                        marker: { color: '#2563eb', opacity: 0.9, line: { color: '#1d4ed8', width: 1.5 } }
                      }]}
                      layout={{
                        autosize: true,
                        margin: { l: 45, r: 10, t: 10, b: 60 },
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        font: { color: '#64748b', family: 'Inter, sans-serif', size: 10 },
                        xaxis: { tickangle: -30, fixedrange: true },
                        yaxis: { gridcolor: '#e2e8f0', fixedrange: true }
                      }}
                      config={{ displayModeBar: false, responsive: true }}
                      style={{ width: '100%', height: '100%' }}
                      useResizeHandler
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-slate-400">No attendance data collected</div>
                  )}
                </div>
              </div>

              {/* Budget Donut Chart — Overlap-free design with filtered zero slices & clean breakdown grid */}
              {(() => {
                const activeBudgetData = budgetData.filter(d => Number(d.total_budget) > 0);
                const totalBudgetValue = activeBudgetData.reduce((sum, d) => sum + (Number(d.total_budget) || 0), 0);
                const budgetPalette = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#6366f1', '#14b8a6'];

                return (
                  <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 flex flex-col h-[400px] shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-display text-slate-800 uppercase tracking-wider font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Budget Allocation by Category
                      </h3>
                      <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                        Total: ₱{totalBudgetValue.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex-1 w-full relative min-h-[170px]">
                      {activeBudgetData.length > 0 ? (
                        <Plot
                          data={[{
                            type: 'pie',
                            hole: 0.6,
                            labels: activeBudgetData.map(d => (d.category || 'general').toUpperCase()),
                            values: activeBudgetData.map(d => Number(d.total_budget)),
                            marker: { colors: budgetPalette },
                            textposition: 'none',
                            textinfo: 'none',
                            hoverinfo: 'label+value+percent',
                            hovertemplate: '<b>%{label}</b><br>Budget: ₱%{value:,.2f}<br>Share: %{percent}<extra></extra>'
                          }]}
                          layout={{
                            autosize: true,
                            margin: { l: 5, r: 5, t: 5, b: 5 },
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            plot_bgcolor: 'rgba(0,0,0,0)',
                            font: { color: '#ffffff', family: 'Inter, sans-serif', size: 10, weight: 700 },
                            showlegend: false
                          }}
                          config={{ displayModeBar: false, responsive: true }}
                          style={{ width: '100%', height: '100%' }}
                          useResizeHandler
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-slate-400">No budget allotments recorded</div>
                      )}
                    </div>

                    {/* Clean, Non-Overlapping Structured Category Legend & Share Table */}
                    {activeBudgetData.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[11px] scrollbar-thin">
                        {activeBudgetData.map((item, idx) => {
                          const pct = totalBudgetValue > 0 ? ((Number(item.total_budget) / totalBudgetValue) * 100).toFixed(1) : '0';
                          const color = budgetPalette[idx % budgetPalette.length];
                          return (
                            <div key={item.category || idx} className="flex items-center justify-between p-1.5 rounded-xl bg-slate-50 border border-slate-200">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                                <span className="font-bold text-slate-800 uppercase truncate text-[10px]">{item.category || 'General'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-semibold text-slate-600 text-[10px]">₱{Number(item.total_budget).toLocaleString()}</span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">{pct}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-display text-slate-800 uppercase tracking-wider mb-3 font-bold">Recent System Trajectory (Admin Log Preview)</h3>
              <div className="space-y-2">
                {logs.slice(0, 8).map((lg, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs font-mono py-2 px-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                    <span className="text-[10px] text-blue-600 shrink-0 font-bold tracking-wide">{formatSGT(lg.created_at)}</span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded-lg text-[9px] font-bold uppercase">{lg.role}</span>
                    <span className="text-slate-900 truncate max-w-[150px] font-bold">{lg.actor}</span>
                    <span className="text-slate-400 shrink-0">→</span>
                    <span className="text-blue-700 font-bold">{lg.action}</span>
                    {lg.target && <span className="text-slate-500 truncate max-w-[180px]">({lg.target})</span>}
                    <span className="ml-auto text-slate-500 truncate text-[11px] max-w-[250px] hidden sm:inline">{lg.details}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-xs font-mono text-slate-400 py-4 text-center">No logs generated yet. Perform actions to populate trajectory.</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
          <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
            <div className="p-4 bg-slate-50 border-b-2 border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-display text-slate-700 uppercase tracking-wider font-bold">
                Registered Operators ({users.filter(u => u.role !== 'youth').length})
              </span>
              {effectiveRole === 'admin' && (
                <button
                  onClick={() => setShowAddUser(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-display font-bold uppercase transition-all tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                >
                  <span>+</span> Authorize Account
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider border-b-2 border-slate-200">
                  <tr>
                    <th className="p-3">Username</th>
                    <th className="p-3">Identity / Alias</th>
                    <th className="p-3">Role Tier</th>
                    <th className="p-3">Committee</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created Link</th>
                    {effectiveRole === 'admin' && <th className="p-3 text-right">Privilege Controls</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.filter(u => u.role !== 'youth').map(usr => (
                    <tr key={usr.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-3 font-bold text-blue-700">{usr.username}</td>
                      <td className="p-3 text-slate-900 font-semibold">
                        <div>{usr.full_name}</div>
                        {usr.role === 'committee' && (
                          <div className="text-[10px] text-slate-500 font-normal">
                            {getCommitteeLabel(usr.committee)}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${usr.role === 'admin' ? 'bg-red-100 text-red-800 border border-red-200' :
                            usr.role === 'chairman' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              usr.role === 'committee' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                'bg-slate-100 text-slate-700'
                          }`}>
                          {usr.role === 'committee' ? 'Committee' : usr.role}
                        </span>
                      </td>
                      <td className="p-3">
                        {usr.role === 'committee' ? (
                          <CommitteeBadge committee={usr.committee} compact={true} />
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`flex items-center gap-1.5 font-bold ${usr.status === 'active' ? 'text-emerald-700' : 'text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${usr.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {usr.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{usr.created_at?.slice(0, 10)}</td>
                      {effectiveRole === 'admin' && (
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {/* Lockout badge + lift button — admin-only, only when locked */}
                            {usr.locked && (
                              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-2 py-0.5">
                                <span className="text-[9px] font-mono text-red-700 tabular-nums">
                                  🔒 {Math.ceil(usr.lockedRemainingSec / 60)}m locked
                                </span>
                                <button
                                  onClick={() => handleLiftLockout(usr.username)}
                                  className="text-[9px] font-mono font-bold text-amber-700 hover:text-amber-800 underline underline-offset-2 transition-colors cursor-pointer"
                                >
                                  Lift
                                </button>
                              </div>
                            )}
                            <button
                              onClick={() => { setEditUser(usr); setEditUserConfirmPw(''); setEditUserToken(''); }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold uppercase transition-colors border border-slate-200 cursor-pointer"
                            >
                              Edit
                            </button>
                            {usr.username !== 'admin' && (
                              <button
                                onClick={() => handleDeactivateUser(usr)}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-bold uppercase transition-colors border border-red-200 cursor-pointer"
                              >
                                Deactivate
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 font-mono">No accounts retrieved</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- SYSTEM LOGS TAB (Admin Only) --- */}
        {activeTab === 'logs' && effectiveRole === 'admin' && (
          <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
            {/* Filter controls row */}
            <div className="p-4 bg-slate-50 border-b-2 border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Filter Actor…"
                  value={logActorFilter}
                  onChange={e => { setLogActorFilter(e.target.value); setLogsPage(1); }}
                  className="bg-white border-2 border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600 placeholder-slate-400 shadow-sm"
                />
                <input
                  type="text"
                  placeholder="Filter Action…"
                  value={logActionFilter}
                  onChange={e => { setLogActionFilter(e.target.value); setLogsPage(1); }}
                  className="bg-white border-2 border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600 placeholder-slate-400 shadow-sm"
                />
                {(logActorFilter || logActionFilter) && (
                  <button
                    onClick={() => { setLogActorFilter(''); setLogActionFilter(''); }}
                    className="text-[10px] font-mono text-blue-600 hover:text-blue-700 underline font-bold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              <button
                onClick={handleExportLogs}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ml-auto cursor-pointer shadow-sm active:scale-95"
              >
                <span>📥</span> Export Logs (CSV)
              </button>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono whitespace-nowrap">
                <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider border-b-2 border-slate-200">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Actor Entity</th>
                    <th className="p-3">Role tier</th>
                    <th className="p-3">Action Command</th>
                    <th className="p-3">Target Payload</th>
                    <th className="p-3 w-full">Diagnostic Output</th>
                    <th className="p-3">IP Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map(lg => (
                    <tr key={lg.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-3 text-blue-700 font-bold tracking-wide">{formatSGT(lg.created_at)}</td>
                      <td className="p-3 font-bold text-slate-900">{lg.actor}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[10px] font-bold uppercase">{lg.role}</span>
                      </td>
                      <td className="p-3 font-bold text-blue-700">{lg.action}</td>
                      <td className="p-3 text-slate-600 max-w-[150px] truncate">{lg.target || '—'}</td>
                      <td className="p-3 text-slate-800 whitespace-normal min-w-[200px]">{lg.details || '—'}</td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">{lg.ip_address || 'local'}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 font-mono">No telemetry events map matching filters</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {logsTotalPages > 1 && (
              <div className="p-3 bg-slate-50 border-t-2 border-slate-200 flex items-center justify-between text-xs font-mono text-slate-600">
                <span>Page {logsPage} of {logsTotalPages}</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                    disabled={logsPage === 1}
                    className="px-3 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 rounded-xl border border-slate-200 text-slate-700 cursor-pointer shadow-sm font-bold"
                  >
                    ◀ Prev
                  </button>
                  <button
                    onClick={() => setLogsPage(p => Math.min(logsTotalPages, p + 1))}
                    disabled={logsPage === logsTotalPages}
                    className="px-3 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 rounded-xl border border-slate-200 text-slate-700 cursor-pointer shadow-sm font-bold"
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- SYSTEM HEALTH TAB (Admin Only) --- */}
        {activeTab === 'health' && ['admin'].includes(effectiveRole) && (
          <SystemHealthTab authHeaders={authHeaders} />
        )}
      </div>

      {/* --- ADD USER MODAL --- */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddUser(false)} />
          <div className="relative bg-white border-2 border-slate-300 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 z-10 text-slate-900">
            <h3 className="text-sm font-display font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="text-blue-600">⚡</span> Authorize New Account
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-bold">Account ID (Username)</label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="e.g. jdelacruz"
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 shadow-sm"
                />
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-bold">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 shadow-sm"
                />
              </div>
              <div>
                <label className="text-slate-700 block mb-1 font-bold">Privilege Tier</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value, committee: e.target.value === 'committee' ? newUser.committee : '' })}
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 shadow-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="chairman" disabled={hasChairman} className={hasChairman ? 'text-slate-400' : ''}>
                    Chairman{hasChairman ? ' (Already Assigned)' : ''}
                  </option>
                  <option value="committee">Committee</option>
                </select>
                {newUser.role === 'chairman' && hasChairman && (
                  <p className="mt-1 text-amber-600 text-[10px]">⚠️ A Chairman already exists. Only one Chairman is allowed.</p>
                )}
              </div>
              {newUser.role === 'committee' && (
                <div>
                  <label className="text-slate-700 block mb-1 font-bold">Committee of what? <span className="text-red-500">*</span></label>
                  <CommitteeSelect
                    apiBase={API_BASE}
                    value={newUser.committee}
                    onChange={e => setNewUser({ ...newUser, committee: e.target.value })}
                    required
                    placeholder="-- Select Committee (10 Centers) --"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Select one of the 10 Centers of Participation.</p>
                </div>
              )}
              <div>
                <label className="text-slate-700 block mb-1 font-bold">Authentication Passkey</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 shadow-sm"
                />
              </div>
              {/* Token — required for account creations */}
              <div className="border-2 border-red-200 bg-red-50/50 rounded-xl p-3.5 space-y-2">
                <p className="text-red-700 text-[10px] font-bold uppercase tracking-widest">🔐 Authorization Required</p>
                <p className="text-slate-600 text-[10px]">Creating an account requires a privileged authorization token.</p>
                <input
                  type="password"
                  value={newUserToken}
                  onChange={e => setNewUserToken(e.target.value)}
                  placeholder="Enter admin authorization token…"
                  className="w-full bg-white border-2 border-red-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-red-500 text-xs shadow-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAddUser(false); setNewUserToken(''); }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-display font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Commit User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT USER MODAL --- */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => { setEditUser(null); setEditUserConfirmPw(''); setEditUserToken(''); }} />
          <div className="relative bg-white border-2 border-slate-300 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 z-10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-display font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="text-blue-600">🔧</span> Modify Account: <span className="font-mono text-blue-600">{editUser.username}</span>
            </h3>
            <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={editUser.full_name}
                  onChange={e => setEditUser({ ...editUser, full_name: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-700 font-bold block mb-1">Privilege Tier</label>
                <select
                  value={editUser.role}
                  onChange={e => setEditUser({ ...editUser, role: e.target.value, committee: e.target.value === 'committee' ? editUser.committee : null })}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 font-mono font-bold"
                >
                  <option value="admin">Admin</option>
                  <option
                    value="chairman"
                    disabled={hasChairman && editUser.role !== 'chairman'}
                    className={hasChairman && editUser.role !== 'chairman' ? 'text-slate-400' : ''}
                  >
                    Chairman{hasChairman && editUser.role !== 'chairman' ? ' (Already Assigned)' : ''}
                  </option>
                  <option value="committee">Committee</option>
                </select>
              </div>
              {editUser.role === 'committee' && (
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Committee of what? <span className="text-red-500">*</span></label>
                  <CommitteeSelect
                    apiBase={API_BASE}
                    value={editUser.committee || ''}
                    onChange={e => setEditUser({ ...editUser, committee: e.target.value })}
                    required
                    placeholder="-- Select Committee (10 Centers) --"
                  />
                </div>
              )}
              <div>
                <label className="text-slate-700 font-bold block mb-1">Status</label>
                <select
                  value={editUser.status}
                  onChange={e => setEditUser({ ...editUser, status: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 font-mono font-bold"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Password change section */}
              <div className="border-2 border-slate-200 bg-slate-50/70 rounded-xl p-3 space-y-2">
                <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Password Change (leave blank to keep current)</p>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">New Password</label>
                  <input
                    type="password"
                    value={editUser.password || ''}
                    onChange={e => setEditUser({ ...editUser, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                {editUser.password && (
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={editUserConfirmPw}
                      onChange={e => setEditUserConfirmPw(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full bg-white border-2 rounded-xl px-3 py-2 text-slate-900 focus:outline-none font-mono ${editUserConfirmPw && editUser.password !== editUserConfirmPw
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-slate-200 focus:border-blue-500'
                        }`}
                    />
                    {editUserConfirmPw && editUser.password !== editUserConfirmPw && (
                      <p className="mt-1 text-red-500 text-[10px] font-bold">Passwords do not match</p>
                    )}
                  </div>
                )}
              </div>

              {/* Authorization token — ALWAYS required for any modification */}
              <div className="border-2 border-amber-300 bg-amber-50/80 rounded-xl p-3 space-y-1">
                <p className="text-amber-800 text-[10px] font-bold uppercase tracking-widest">🔐 Authorization Token Required</p>
                <p className="text-amber-700/80 text-[10px]">Required for all account modifications, including role changes and status updates.</p>
                <input
                  type="password"
                  required
                  value={editUserToken}
                  onChange={e => setEditUserToken(e.target.value)}
                  placeholder="Enter admin authorization token…"
                  className="w-full bg-white border-2 border-amber-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Modal footer: Delete on left, Cancel + Apply on right */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 mt-2">
                {/* Delete Account — 2-step, only from inside Edit modal, hidden for protected 'admin' */}
                {editUser.username !== 'admin' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditUser(null); setEditUserConfirmPw(''); setEditUserToken('');
                      openDeleteFlow(editUser);
                    }}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 text-xs font-bold uppercase rounded-xl border border-red-200 transition-colors"
                  >
                    🗑 Delete Account
                  </button>
                ) : <span />}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditUser(null); setEditUserConfirmPw(''); setEditUserToken(''); }}
                    className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-display font-bold rounded-xl transition-all shadow-md active:scale-95 text-xs cursor-pointer"
                  >
                    Apply Changes
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── Two-step Account Deletion Modal (reachable only from Edit modal) ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={cancelDelete} />
          <div className="relative bg-white border-2 border-red-300 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 z-10">
            {deleteStep === 1 ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🗑️</span>
                  <h3 className="text-sm font-display font-bold text-red-600 uppercase tracking-wider">Delete This Account?</h3>
                </div>
                <p className="text-slate-700 text-xs leading-relaxed">
                  You are about to permanently delete the account{' '}
                  <span className="text-blue-600 font-bold font-mono">{deleteTarget.username}</span>{' '}
                  ({deleteTarget.full_name}). Their access will be revoked immediately.
                </p>
                <p className="text-slate-500 text-[10px]">This is a destructive action. Proceed to the next step to confirm.</p>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={cancelDelete} className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer">Cancel</button>
                  <button onClick={() => setDeleteStep(2)} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md cursor-pointer">Proceed</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <h3 className="text-sm font-display font-bold text-red-600 uppercase tracking-wider">Confirm Deletion</h3>
                </div>
                <p className="text-slate-700 text-xs leading-relaxed">
                  To finish, type the username{' '}
                  <span className="text-blue-600 font-bold font-mono">{deleteTarget.username}</span>{' '}
                  in the field below.
                </p>
                <input
                  type="text"
                  value={deleteConfirmInput}
                  onChange={e => setDeleteConfirmInput(e.target.value)}
                  placeholder={`Type "${deleteTarget.username}" to confirm`}
                  autoFocus
                  className={`w-full bg-slate-50 border-2 rounded-xl px-3 py-2 text-slate-900 text-xs font-mono focus:outline-none ${deleteConfirmInput && deleteConfirmInput !== deleteTarget.username
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-slate-200 focus:border-blue-500'
                    }`}
                />
                {deleteConfirmInput && deleteConfirmInput !== deleteTarget.username && (
                  <p className="text-red-500 text-[10px] font-bold">Username does not match.</p>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={cancelDelete} className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer">Cancel</button>
                  <button
                    onClick={handleDeleteUser}
                    disabled={deleteConfirmInput !== deleteTarget.username}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-colors shadow-md cursor-pointer"
                  >
                    Delete Account
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}



// ---------------------------------------------------------------------------
// Phase 6-A: LoginPage — Glassmorphic dark SK-themed login screen
// No credentials stored in this component. All auth handled by backend.
// ---------------------------------------------------------------------------
function LoginPage({ apiBase, onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(null);    // null = not yet tried
  const [lockedSecs, setLockedSecs] = useState(0);           // 0 = not locked

  // Countdown ticker for lockout display
  useEffect(() => {
    if (lockedSecs <= 0) return;
    const t = setTimeout(() => setLockedSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [lockedSecs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockedSecs > 0) return; // prevent submit while locked
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.locked && data.remainingSec) {
          setLockedSecs(data.remainingSec);
          setAttemptsLeft(0);
        } else if (data.attemptsLeft !== undefined) {
          setAttemptsLeft(data.attemptsLeft);
        }
        setError(data.error || 'Login failed.');
        return;
      }
      // Store JWT in sessionStorage — never localStorage for auth tokens
      sessionStorage.setItem('askyouth_token', data.token);
      sessionStorage.setItem('askyouth_user', JSON.stringify(data.user));
      onLogin(data.user, data.token);
    } catch (err) {
      setError('Cannot reach server. Check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleYouthLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/auth/youth-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Youth login failed.');
        return;
      }
      sessionStorage.setItem('askyouth_token', data.token);
      sessionStorage.setItem('askyouth_user', JSON.stringify(data.user));
      onLogin(data.user, data.token);
    } catch (err) {
      setError('Cannot reach server. Check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const roleLabels = { admin: 'System Administrator', chairman: 'SK Chairperson', committee: 'SK Committee', youth: 'Youth Member' };

  const lockMins = Math.floor(lockedSecs / 60);
  const lockSecsRem = lockedSecs % 60;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #e8f4fd 0%, #f0f9ff 35%, #e0f2fe 60%, #f0fdf4 100%)' }}>
      {/* Animated background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-[-20%] left-[-15%] w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-cyan-400/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
        <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-blue-300/15 rounded-full blur-[90px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '4s' }} />
      </div>

      {/* Subtle noise overlay */}
      <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none" />

      {/* Login card container */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo / branding */}
        <div className="text-center mb-6 px-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/ASKYOUTH.LOGO.png" alt="aSKYOUTH Logo" className="w-12 h-12 object-contain drop-shadow-md" />
            <h1
              className="text-3xl sm:text-5xl font-display font-black tracking-widest select-none pb-1"
              style={{
                background: 'linear-gradient(to right, #2563eb, #06b6d4, #1d4ed8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 4px 15px rgba(37,99,235,0.3))',
              }}
            >
              aSK//YOUTH.AI
            </h1>
          </div>
          <p className="mt-2 text-xs sm:text-sm font-bold tracking-[0.15em] text-slate-900 uppercase">
            Sangguniang Kabataan • Barangay Concepcion Dos
          </p>
          <div className="mt-3 h-px w-24 mx-auto bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
        </div>

        {/* Glass card — Dark theme container on light background with full visible white texts */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-7 sm:p-8 space-y-5"
          style={{
            background: 'rgba(10, 15, 28, 0.90)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(6,182,212,0.1), inset 0 1px 0 rgba(255,255,255,0.08)'
          }}
        >
          <div className="text-center mb-1">
            <p className="text-xs sm:text-sm font-display font-bold text-white tracking-[0.25em] uppercase">System Access</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{error}</span>
            </div>
          )}

          {/* Account lockout alert */}
          {lockedSecs > 0 && (
            <div className="p-3 bg-amber-950/80 border border-amber-500/50 rounded-xl text-amber-200 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span>Too many attempts. Locked for {lockMins > 0 ? `${lockMins}m ` : ''}{lockSecsRem}s.</span>
            </div>
          )}

          {/* Username field */}
          <div>
            <label className="block text-[11px] font-display font-bold text-white tracking-widest uppercase mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder-slate-400 disabled:opacity-50"
                placeholder="Enter username"
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-[11px] font-display font-bold text-white tracking-widest uppercase mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-10 py-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder-slate-400 disabled:opacity-50"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
          </div>

          {/* Sign in button */}
          <button
            type="submit"
            disabled={loading || lockedSecs > 0 || !username.trim() || !password.trim()}
            className={`w-full py-3.5 rounded-xl font-display font-bold text-sm tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 ${loading || !username.trim() || !password.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                : 'bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:shadow-[0_4px_30px_rgba(37,99,235,0.6)] hover:from-blue-500 hover:to-cyan-500 cursor-pointer active:scale-[0.98]'
              }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                Sign In
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center pt-1">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700/60"></div></div>
            <div className="relative bg-[#0a0f1c] px-3 text-[10px] font-display font-bold text-white/40 uppercase tracking-widest">or</div>
          </div>

          {/* Continue as Youth */}
          <button
            type="button"
            onClick={handleYouthLogin}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-display font-bold text-xs sm:text-sm tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 bg-slate-900/90 text-white hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 shadow-sm cursor-pointer active:scale-[0.98]"
          >
            Continue as Youth
          </button>
        </form>

        {/* Footer */}
        <p className="text-center mt-6 text-[10px] font-display font-bold text-slate-700 tracking-wider uppercase">
          Encrypted connection • aSK//YOUTH.AI v6.0
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SuggestionsModule — Phase Feedback & Suggestions
// ---------------------------------------------------------------------------
function SuggestionsModule({ authHeaders, authUser, onNavigate, sidebarOpen, onToggleSidebar }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ content: '', category: 'general' });
  const [submitting, setSubmitting] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null); // null = all

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/suggestions`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load suggestions');
      const data = await res.json();
      // Deduplicate by content (keep first occurrence)
      const seen = new Set();
      const deduped = data.filter(s => {
        const key = s.content.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setSuggestions(deduped);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSuggestions(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/suggestions`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...form, submitter_name: authUser.full_name, submitter_role: authUser.role })
      });
      if (!res.ok) throw new Error('Failed to submit suggestion');
      setForm({ content: '', category: 'general' });
      fetchSuggestions();
    } catch (e) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  const handleUpdateStatus = async (id, status, response) => {
    try {
      const res = await fetch(`${API_BASE}/api/suggestions/${id}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json', 'X-Actor': authUser.full_name, 'X-Role': authUser.role }),
        body: JSON.stringify({ status, admin_response: response, responded_by: authUser.full_name })
      });
      if (!res.ok) throw new Error('Failed to update suggestion');
      setEditingId(null);
      setAdminResponse('');
      fetchSuggestions();
    } catch (e) { alert(e.message); }
  };

  const isAdmin = ['admin', 'chairman', 'committee'].includes(authUser?.role);
  const isYouth = authUser?.role === 'youth';

  const filteredSuggestions = statusFilter
    ? suggestions.filter(s => s.status === statusFilter)
    : suggestions;

  const STATUS_BTNS = [
    { label: 'All', value: null, color: 'bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50', active: 'bg-slate-900 border-2 border-slate-900 text-white shadow-sm' },
    { label: 'Pending', value: 'pending', color: 'bg-white border-2 border-amber-200 text-amber-700 hover:bg-amber-50', active: 'bg-amber-600 border-2 border-amber-600 text-white shadow-sm' },
    { label: 'Reviewed', value: 'reviewed', color: 'bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50', active: 'bg-blue-600 border-2 border-blue-600 text-white shadow-sm' },
    { label: 'Resolved', value: 'resolved', color: 'bg-white border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50', active: 'bg-emerald-600 border-2 border-emerald-600 text-white shadow-sm' },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto relative text-slate-900">
      <div className="h-16 shrink-0 border-b border-slate-200/80 bg-white/70 backdrop-blur-md flex items-center px-4 sm:px-6 justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          {!sidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="text-slate-500 hover:text-blue-600 transition-all p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200/60 flex items-center justify-center cursor-pointer md:hidden"
              title="Open Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          )}
          <span className="text-base sm:text-lg font-display font-black tracking-wider text-slate-900 truncate">💡 SUGGESTIONS &amp; FEEDBACK</span>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Youth Submit Form */}
        {isYouth && (
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-display font-bold text-blue-600 uppercase tracking-widest mb-3">Submit Feedback</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full sm:w-auto bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600 shadow-sm"
              >
                <option value="general">General</option>
                <option value="event">Event Idea</option>
                <option value="complaint">Complaint</option>
                <option value="app">App Feedback</option>
              </select>
              <textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                rows={3}
                placeholder="What's on your mind? (Any suggestions for SK?)"
                className="w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 resize-none shadow-sm transition-all"
                required
              />
              <div className="flex justify-end">
                <button type="submit" disabled={submitting || !form.content.trim()} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-display font-bold rounded-xl text-xs uppercase tracking-wider disabled:opacity-50 transition-all shadow-md active:scale-95 cursor-pointer">
                  {submitting ? 'Submitting...' : 'Submit Suggestion'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Status Filter Buttons — admin/chairman/committee only */}
        {isAdmin && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mr-1">Filter:</span>
            {STATUS_BTNS.map(btn => (
              <button
                key={String(btn.value)}
                onClick={() => setStatusFilter(btn.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${statusFilter === btn.value ? btn.active : btn.color
                  }`}
              >
                {btn.label}
                {btn.value !== null && (
                  <span className="ml-1.5 opacity-70">
                    ({suggestions.filter(s => s.status === btn.value).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* List of Suggestions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-display font-bold text-slate-700 uppercase tracking-wider">
              {statusFilter ? `${statusFilter} Suggestions` : 'All Suggestions'}
              <span className="ml-2 font-mono text-slate-400">({filteredSuggestions.length})</span>
            </h2>
          </div>
          {loading ? (
            <p className="text-slate-500 font-mono text-sm">Loading suggestions...</p>
          ) : filteredSuggestions.length === 0 ? (
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-8 text-center shadow-sm">
              <p className="text-slate-500 font-mono text-sm">No {statusFilter || ''} suggestions found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSuggestions.map(s => (
                <div key={s.id} className="bg-white border-2 border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-sm transition-all">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full mr-2">{s.category}</span>
                      <span className="text-xs font-mono text-slate-400">{new Date(s.created_at.replace(' ', 'T') + 'Z').toLocaleString('en-US', { timeZone: 'Asia/Singapore' })}</span>
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full ${s.status === 'pending' ? 'bg-amber-50 text-amber-800 border border-amber-300' :
                        s.status === 'reviewed' ? 'bg-blue-50 text-blue-800 border border-blue-300' :
                          'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      }`}>
                      {s.status}
                    </span>
                  </div>
                  <p className="text-slate-900 text-sm font-medium mb-3 leading-relaxed">{s.content}</p>
                  <p className="text-xs font-mono text-slate-500 mb-2">— {s.submitter_name} ({s.submitter_role})</p>

                  {s.admin_response && (
                    <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 mt-3">
                      <p className="text-[10px] font-mono font-bold text-blue-800 uppercase tracking-widest mb-1">SK Response ({s.responded_by})</p>
                      <p className="text-slate-800 text-xs leading-relaxed">{s.admin_response}</p>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      {editingId === s.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={adminResponse}
                            onChange={e => setAdminResponse(e.target.value)}
                            rows={2}
                            placeholder="Type response to youth..."
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 resize-none"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer">Cancel</button>
                            <button onClick={() => handleUpdateStatus(s.id, 'reviewed', adminResponse)} className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-colors cursor-pointer shadow-sm">Mark Reviewed</button>
                            <button onClick={() => handleUpdateStatus(s.id, 'resolved', adminResponse)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-colors cursor-pointer shadow-sm">Mark Resolved</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingId(s.id); setAdminResponse(s.admin_response || ''); }} className="text-xs font-display font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider cursor-pointer">
                          {s.admin_response ? 'Edit Response' : 'Respond to Feedback'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const getDynamicGreeting = (user) => {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const role = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Guest';
  let firstName = '';
  try {
    const rawName = user?.full_name || user?.identity || user?.name || user?.alias || user?.username || '';
    if (!rawName || rawName === 'Youth Member' || rawName === 'guest') {
      const stored = sessionStorage.getItem('askyouth_user') || localStorage.getItem('askyouth_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedName = parsed?.full_name || parsed?.identity || parsed?.name || '';
        firstName = storedName.trim().split(' ')[0] || '';
      }
    } else {
      firstName = rawName.trim().split(' ')[0] || '';
    }
  } catch (e) { }
  const greetingName = firstName ? `${role} ${firstName}` : role;
  return `aSK//YOUTH.AI Initialized. Good ${timeOfDay}, ${greetingName}. How may I assist you today?`;
};

function App() {
  // ─── Phase 6-A: Auth state ─────────────────────────────────────────
  const [authUser, setAuthUser] = useState(null);       // { id, username, role, full_name }
  const [authToken, setAuthToken] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // ─── Thread & Chat State ──────────────────────────────────────────
  const [lastModelUsed, setLastModelUsed] = useState(null);
  const [threads, setThreads] = useState([{
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    title: 'New Chat',
    pinned: false,
    messages: [{ role: "assistant", content: getDynamicGreeting(authUser) }]
  }]);
  const [activeThreadId, setActiveThreadId] = useState(null);

  // Fallback for UUID
  const getUUID = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));


  // Load user-specific threads when authUser changes
  useEffect(() => {
    if (!authUser) {
      setThreads([{
        id: crypto.randomUUID(),
        title: 'New Chat',
        pinned: false,
        messages: [{ role: "assistant", content: getDynamicGreeting(authUser) }]
      }]);
      setActiveThreadId(null);
      return;
    }
    try {
      const key = `askyouth_threads_${authUser.username}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setThreads(parsed);
          setActiveThreadId(parsed[0].id);
          return;
        }
      }
    } catch (e) { console.error(e); }

    const initial = [{
      id: getUUID(),
      title: 'New Chat',
      pinned: false,
      messages: [{ role: "assistant", content: getDynamicGreeting(authUser) }]
    }];
    setThreads(initial);
    setActiveThreadId(initial[0].id);
  }, [authUser]);

  // Save user-specific threads
  useEffect(() => {
    if (authUser && threads.length > 0) {
      localStorage.setItem(`askyouth_threads_${authUser.username}`, JSON.stringify(threads));
    }
  }, [threads, authUser]);

  const activeThread = threads.find(t => t.id === (activeThreadId || (threads[0]?.id))) || threads[0];
  const messages = activeThread?.messages || [];
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [currentView, setCurrentView] = useState('chat');
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Monitor scroll for "Scroll to Bottom" button
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      setShowScrollBottom(!isNearBottom);
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [currentView, activeThreadId]);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  // Reset generating state on thread switch
  useEffect(() => {
    setLoading(false);
  }, [activeThreadId]);

  // Mobile-aware initialization: close sidebar by default on smaller screens
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  // Define mobile navigation items based on role
  const mobileNavItems = [
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'suggestions', label: 'Ideas', icon: '📬' },
    ...(authUser?.role === 'admin' || authUser?.role === 'chairman' ? [
      { id: 'events', label: 'Events', icon: '📅' },
      { id: 'admin', label: 'Admin', icon: '🛡️' }
    ] : [])
  ];

  // On mount: check for existing session in sessionStorage
  useEffect(() => {
    const checkSession = async () => {
      let savedToken = sessionStorage.getItem('askyouth_token');

      const urlParams = new URLSearchParams(window.location.search);
      const scanEventId = urlParams.get('scan');

      // Intercept deep link for youth login if no token or force if scan exists
      if (scanEventId) {
        try {
          const loginRes = await fetch(`${API_BASE}/api/auth/youth-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            savedToken = loginData.token;
            sessionStorage.setItem('askyouth_token', savedToken);
            sessionStorage.setItem('askyouth_user', JSON.stringify(loginData.user));
          }
        } catch (e) { }
      }

      if (!savedToken) { setAuthChecking(false); return; }
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${savedToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          const user = data.user || data;
          setAuthUser(user);
          setAuthToken(savedToken);
          if (scanEventId) setCurrentView('scan');
          else if (user?.role === 'youth') setCurrentView('chat');
          else if (user?.role === 'admin') setCurrentView('admin');
        } else {
          sessionStorage.removeItem('askyouth_token');
          sessionStorage.removeItem('askyouth_user');
        }
      } catch {
        sessionStorage.removeItem('askyouth_token');
        sessionStorage.removeItem('askyouth_user');
      }
      setAuthChecking(false);
    };
    checkSession();
  }, []);

  const handleLogin = (user, token) => {
    setAuthUser(user);
    setAuthToken(token);
    setCurrentView(user?.role === 'admin' ? 'admin' : 'chat');
  };

  const handleLogout = async () => {
    try {
      if (authToken) {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
      }
    } catch { /* swallow — clear session regardless */ }
    sessionStorage.removeItem('askyouth_token');
    sessionStorage.removeItem('askyouth_user');
    setAuthUser(null);
    setAuthToken(null);
    setCurrentView('chat');
  };

  const authHeaders = (extra = {}) => ({
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    ...extra
  });

  const getVisibleModules = () => {
    const role = authUser?.role || 'youth';
    const modules = [
      { id: 'chat', label: 'AI Assistant', emoji: '💬', roles: ['admin', 'chairman', 'committee', 'youth'] },
      { id: 'scan', label: 'Scan Attendance', emoji: '📷', roles: ['youth'] },
      { id: 'suggestions', label: 'Suggestions', emoji: '💡', roles: ['admin', 'chairman', 'committee', 'youth'] },
      { id: 'events', label: 'Event Management', emoji: '📅', roles: ['admin', 'chairman', 'committee'] },
      { id: 'reports', label: 'Official Reports', emoji: '🗂️', roles: ['admin', 'chairman', 'committee'] },
      { id: 'faq', label: 'FAQ', emoji: '❓', roles: ['admin', 'chairman', 'committee', 'youth'] },
      { id: 'admin', label: 'Admin Dashboard', emoji: '🛡️', roles: ['admin', 'chairman'] },
    ];
    return modules.filter(m => m.roles.includes(role));
  };

  const ROLE_COLORS = { admin: 'bg-red-500', chairman: 'bg-amber-500', committee: 'bg-blue-500', youth: 'bg-green-500' };
  const ROLE_LABELS = { admin: 'Admin', chairman: 'SK Chairman', committee: 'SK Committee', youth: 'Youth' };

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const formatClock = (d) => {
    if (!d || isNaN(d.getTime())) return '--:--';
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

  const formatStamp = (d) => {
    if (!d || isNaN(d.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Singapore',
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).formatToParts(d);
    let hh, mm, ss;
    for (const p of parts) {
      if (p.type === 'hour') hh = p.value === '24' ? '00' : p.value;
      if (p.type === 'minute') mm = p.value;
      if (p.type === 'second') ss = p.value;
    }
    return `${hh}:${mm}:${ss}`;
  };

  const [streamPhase, setStreamPhase] = useState('idle');
  const [streamingContent, setStreamingContent] = useState('');
  const streamingTextRef = useRef('');
  const pendingChunksRef = useRef([]);
  const abortControllerRef = useRef(null);

  const handleTextareaChange = (e) => {
    setInputText(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDragEnter = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length === 0) return;
    setSelectedFiles(prev => {
      const combined = [...prev, ...dropped];
      const unique = combined.filter((f, i, arr) => arr.findIndex(x => x.name === f.name) === i);
      return unique.slice(0, 8);
    });
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles = [];
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length === 0) return;
    e.preventDefault();
    setSelectedFiles(prev => {
      const combined = [...prev, ...pastedFiles];
      const unique = combined.filter((f, i, arr) => arr.findIndex(x => x.name === f.name) === i);
      return unique.slice(0, 8);
    });
  };

  useEffect(() => {
    setInputText("");
    setSelectedFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [activeThreadId]);

  const sortedThreads = [...threads].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThread?.messages, loading]);

  const createNewChat = () => {
    if (activeThread?.title === 'New Chat' && activeThread?.messages?.length <= 1) {
      setCurrentView('chat');
      return;
    }
    const newThread = {
      id: getUUID(),
      title: 'New Chat',
      pinned: false,
      messages: [{ role: "assistant", content: getDynamicGreeting(authUser) }]
    };
    setThreads([newThread, ...threads]);
    setActiveThreadId(newThread.id);
    setCurrentView('chat');
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handlePin = (id) => {
    setThreads(prev => prev.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t));
    setOpenMenuId(null);
  };

  const handleRenameStart = (id, title) => {
    setRenamingId(id);
    setRenameValue(title);
    setOpenMenuId(null);
  };

  const handleRenameSubmit = (id) => {
    if (renameValue.trim()) {
      setThreads(prev => prev.map(t => t.id === id ? { ...t, title: renameValue.trim() } : t));
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e, id) => {
    if (e.key === 'Enter') handleRenameSubmit(id);
    if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
  };

  const confirmDelete = (id) => {
    setOpenMenuId(null);
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirmed = () => {
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    const nextThreads = threads.filter(t => t.id !== id);
    if (nextThreads.length === 0) {
      const fallback = {
        id: crypto.randomUUID(),
        title: 'New Chat',
        pinned: false,
        messages: [{ role: "assistant", content: getDynamicGreeting(authUser) }]
      };
      setThreads([fallback]);
      setActiveThreadId(fallback.id);
    } else {
      setThreads(nextThreads);
      if (activeThreadId === id) setActiveThreadId(nextThreads[0].id);
    }
  };

  const handleExport = async (docContent, docTitle, format) => {
    try {
      if (docContent.trim().startsWith('{')) {
        const parsed = JSON.parse(docContent);
        if (parsed.download_url) {
          const a = document.createElement('a');
          a.href = parsed.download_url;
          a.target = '_blank';
          a.download = parsed.filename || `${docTitle.replace(/[^a-z0-9]/gi, '_')}.${format}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          return;
        }
      }

      const res = await fetch(`${API_BASE}/api/export/document`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ title: docTitle, content: docContent, format })
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docTitle.replace(/[^a-z0-9]/gi, '_')}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMessage = {
      role: "user",
      content: inputText,
      timestamp: new Date().toISOString(),
      ...(selectedFiles.length > 0 ? { attachedFiles: selectedFiles.map(f => ({ fileName: f.name, fileType: f.type })) } : {})
    };
    const newHistory = [...activeThread.messages, userMessage];

    let newTitle = activeThread.title;
    if (activeThread.title === 'New Chat') {
      newTitle = inputText.substring(0, 30) + (inputText.length > 30 ? "..." : "");
    }
    setThreads(prev => prev.map(t =>
      t.id === activeThreadId ? { ...t, title: newTitle, messages: newHistory } : t
    ));

    setInputText("");
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);
    setStreamPhase(selectedFiles.length > 0 ? 'INDEXING_DOCUMENTS' : 'RETRIEVING_CONTEXT');
    streamingTextRef.current = '';
    setStreamingContent('');
    pendingChunksRef.current = [];

    // Fix 3: Cancel any prior connection state before sending a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Fix 1B: Retry once on network-level errors (TypeError: Load failed / Failed to fetch)
      // before surfacing the failure to the user. Applies to both file and JSON paths.
      const fetchWithRetry = async (url, opts, retries = 1, delayMs = 2000) => {
        try { return await fetch(url, opts); }
        catch (err) {
          if (retries > 0 && err instanceof TypeError) {
            console.warn('[Chat] Network error, retrying in', delayMs, 'ms…', err.message);
            await new Promise(r => setTimeout(r, delayMs));
            return fetchWithRetry(url, opts, retries - 1, delayMs);
          }
          throw err;
        }
      };

      let response;
      const clientDateString = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Singapore',
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      }).format(new Date());

      if (selectedFiles.length > 0) {
        const formData = new FormData();
        formData.append('messages', JSON.stringify(newHistory));
        formData.append('conversationId', activeThreadId);
        formData.append('clientDateString', clientDateString);
        selectedFiles.forEach(f => formData.append('files', f));
        response = await fetchWithRetry(`${API_BASE}/api/chat/stream`, { method: 'POST', headers: authHeaders(), body: formData, signal });
      } else {
        response = await fetchWithRetry(`${API_BASE}/api/chat/stream`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ messages: newHistory, conversationId: activeThreadId, clientDateString }),
          signal
        });
      }

      if (!response.ok) {
        let errorDetail = response.statusText || '';
        try {
          const errBody = await response.json();
          errorDetail = errBody.error || errBody.message || JSON.stringify(errBody);
        } catch (_) {
          try { errorDetail = await response.text() || errorDetail; } catch (_) { }
        }
        throw new Error(`HTTP ${response.status}: ${errorDetail}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalDocuments = null;
      let finalReply = '';
      let finalChunks = [];
      let sseError = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'phase') {
              setStreamPhase(event.phase);
            } else if (event.type === 'retrieved') {
              pendingChunksRef.current = event.chunks;
              finalChunks = event.chunks;
            } else if (event.type === 'token') {
              streamingTextRef.current += event.token;
              setStreamingContent(streamingTextRef.current);
            } else if (event.type === 'done') {
              finalReply = event.ai_data?.ai_message || streamingTextRef.current;
              finalDocuments = event.documents || null;
              finalChunks = event.retrievedChunks?.length > 0 ? event.retrievedChunks : finalChunks;
              if (event.modelUsed) setLastModelUsed({ model: event.modelUsed, tier: event.tier || 'gemini' });
            } else if (event.type === 'error') {
              sseError = event.message || 'Unknown server error.';
            }
          } catch (_) { /* skip malformed SSE line */ }
        }
        if (sseError) break;
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        for (const line of buffer.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.trim().slice(6));
            if (event.type === 'done') {
              finalReply = event.ai_data?.ai_message || streamingTextRef.current;
              finalDocuments = event.documents || null;
              finalChunks = event.retrievedChunks?.length > 0 ? event.retrievedChunks : finalChunks;
              if (event.modelUsed) setLastModelUsed({ model: event.modelUsed, tier: event.tier || 'gemini' });
            } else if (event.type === 'error') {
              sseError = event.message || 'Unknown server error.';
            }
          } catch (_) { }
        }
      }

      if (!finalReply && streamingTextRef.current) {
        finalReply = streamingTextRef.current;
      }

      if (sseError) throw new Error(sseError);

      setThreads(prev => prev.map(t => {
        if (t.id !== activeThreadId) return t;
        const updatedMsgs = finalDocuments
          ? t.messages.map((m, i) => {
            if (i === newHistory.length - 1 && m.role === 'user') {
              const patchedFiles = (m.attachedFiles || []).map((af, idx) => ({
                ...af, extractedText: finalDocuments[idx]?.extractedText || null
              }));
              return { ...m, attachedFiles: patchedFiles };
            }
            return m;
          })
          : t.messages;
        return {
          ...t,
          messages: [...updatedMsgs, {
            role: "assistant",
            content: finalReply || "No response received.",
            timestamp: new Date().toISOString(),
            retrievedChunks: finalChunks.length > 0 ? finalChunks : undefined
          }]
        };
      }));
      setSelectedFiles([]);

    } catch (err) {
      console.error(err);
      setThreads(prev => prev.map(t =>
        t.id === activeThreadId
          ? { ...t, messages: [...t.messages, { role: "assistant", content: `> UPLINK FAILED: ${err.message}` }] }
          : t
      ));
    }

    setLoading(false);
    setStreamPhase('idle');
    setStreamingContent('');
    streamingTextRef.current = '';
  }



  if (authChecking) {
    return (
      <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-300">
        <div className="absolute inset-0 bg-noise-dark opacity-30 pointer-events-none" aria-hidden />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
          <p className="font-mono text-xs tracking-widest uppercase text-cyan-400/80">Verifying session…</p>
        </div>
      </div>
    )
  }

  if (!authUser || !authToken) {
    return <LoginPage apiBase={API_BASE} onLogin={handleLogin} />;
  }

  return (
    <div className="relative h-screen w-screen bg-white font-sans text-slate-900 overflow-hidden flex">
      <div className="absolute inset-0 bg-noise-dark z-0"></div>

      {/* Light Theme Radial Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 blur-[120px] rounded-full z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-400/20 blur-[120px] rounded-full z-0 pointer-events-none"></div>

      {/* Main Glass Container spanning full screen beautifully */}
      <div className="relative w-full h-full z-10 flex flex-col md:flex-row">
        {/* Mobile Sidebar Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[55] md:hidden transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* --- LEFT SIDEBAR (Gemini-Style Chats Menu) --- */}
        <div className={`transition-all duration-300 h-full flex-shrink-0 border-slate-300 bg-slate-50/50 backdrop-blur-3xl shadow-[5px_0_30px_rgba(0,0,0,0.05)] flex flex-col z-[60] fixed inset-y-0 left-0 md:relative ${sidebarOpen
            ? 'w-[280px] md:w-[320px] translate-x-0 border-r opacity-100'
            : 'w-[280px] md:w-0 -translate-x-full md:translate-x-0 border-r-0 opacity-0 overflow-hidden pointer-events-none'
          }`}>
          <div className="p-4 flex items-center justify-between border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-2.5">
              <img src="/ASKYOUTH.LOGO.png" alt="aSKYOUTH" className="w-7 h-7 object-contain shrink-0" />
              <span className="font-display font-black text-sm tracking-widest text-slate-800">aSKYOUTH</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
              title="Collapse Sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
          </div>

          <div className="p-3 border-b border-slate-200/80 shrink-0">
            <button
              onClick={createNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-display font-bold tracking-widest uppercase rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-cyan-500/30 transition-all cursor-pointer active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
              New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
            {/* Invisible backdrop to close open menu on outside click */}
            {openMenuId && (
              <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)} />
            )}
            <h3 className="text-[10px] font-display font-black tracking-widest text-slate-400 uppercase mb-3 px-2">Recent Threads</h3>
            {sortedThreads.map(t => (
              <div
                key={t.id}
                onClick={() => { setActiveThreadId(t.id); setCurrentView('chat'); if (window.innerWidth < 768) setSidebarOpen(false); }}
                className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeThreadId === t.id
                    ? 'bg-blue-100/50 border border-blue-200 text-blue-900 shadow-sm'
                    : 'hover:bg-slate-200/50 border border-transparent text-slate-600 hover:text-slate-900'
                  }`}
              >
                {/* Icon + title / rename input */}
                <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                  {t.pinned ? (
                    <svg className="w-3.5 h-3.5 shrink-0 text-blue-500 rotate-45" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>
                  ) : (
                    <svg className={`w-4 h-4 shrink-0 ${activeThreadId === t.id ? 'text-blue-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                  )}
                  {renamingId === t.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => handleRenameKeyDown(e, t.id)}
                      onBlur={() => handleRenameSubmit(t.id)}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 min-w-0 text-sm font-medium bg-white border border-blue-400 rounded px-2 py-0.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="text-sm font-medium truncate">{t.title}</span>
                  )}
                </div>

                {/* Three-dot menu */}
                <div className="relative shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)}
                    className={`p-1.5 rounded-md transition-colors ${openMenuId === t.id
                        ? 'opacity-100 bg-slate-200 text-slate-700'
                        : 'opacity-0 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700'
                      }`}
                    title="Options"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {openMenuId === t.id && (
                    <div className="absolute right-0 top-full mt-1 z-[100] w-44 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                      <button
                        onClick={() => handlePin(t.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 rotate-45 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>
                        {t.pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button
                        onClick={() => handleRenameStart(t.id, t.title)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Rename
                      </button>
                      <div className="border-t border-slate-100" />
                      <button
                        onClick={() => confirmDelete(t.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* --- Bottom Navigation Bar (role-filtered) --- */}
          <nav className="shrink-0 border-t border-slate-200 bg-slate-100/80 backdrop-blur p-3 flex flex-col gap-1">
            <p className="text-[10px] font-display font-black tracking-widest text-slate-400 uppercase px-2 mb-1">Modules</p>
            {getVisibleModules().map(({ id, label, emoji }) => (
              <button
                key={id}
                onClick={() => setCurrentView(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${currentView === id
                    ? 'bg-blue-100 border border-blue-200 text-blue-800 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 border border-transparent'
                  }`}
              >
                <span className="text-base leading-none select-none">{emoji}</span>
                <span className="truncate font-display font-bold text-xs tracking-wider">{label}</span>
                {currentView === id && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                )}
              </button>
            ))}

            {/* User info + Logout */}
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${ROLE_COLORS[authUser?.role] || 'bg-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-display font-bold text-slate-900 truncate">
                    {authUser?.role === 'committee'
                      ? `${authUser?.full_name} / ${getCommitteeLabel(authUser?.committee)}`
                      : authUser?.full_name}
                  </p>
                  <p className="text-[10px] text-blue-600 font-display font-bold tracking-wider">
                    {authUser?.role === 'committee'
                      ? getCommitteeLabel(authUser?.committee)
                      : (ROLE_LABELS[authUser?.role] || authUser?.role)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition-all border border-transparent hover:border-red-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign Out
              </button>
            </div>
          </nav>
        </div>

        {/* --- MAIN CONTENT AREA (Right Side) --- */}
        <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden relative transition-all duration-300">
          {/* Menu Toggle button — only visible when sidebar is collapsed */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed top-3 left-3 z-[65] text-slate-600 hover:text-blue-600 transition-all p-2 bg-white/90 hover:bg-white backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 flex items-center justify-center cursor-pointer active:scale-95"
              title="Expand Sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          )}

          {currentView === 'events' && <EventsAnalyticsModule authHeaders={authHeaders} authUser={authUser} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} setCurrentView={setCurrentView} />}
          {currentView === 'faq' && <FaqModule authHeaders={authHeaders} authUser={authUser} />}
          {currentView === 'reports' && <ReportsModule authHeaders={authHeaders} authUser={authUser} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />}
          {currentView === 'admin' && <AdminDashboardModule authHeaders={authHeaders} authUser={authUser} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />}
          {currentView === 'scan' && <ScanAttendance authUser={authUser} />}
          {currentView === 'suggestions' && <SuggestionsModule authHeaders={authHeaders} authUser={authUser} onNavigate={setCurrentView} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />}
          {currentView === 'chat' && (<>

            {/* Top Info Header */}
            <div className="h-16 shrink-0 border-b border-slate-200/80 bg-white/70 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {!sidebarOpen && (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="text-slate-500 hover:text-blue-600 transition-all p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200/60 flex items-center justify-center cursor-pointer md:hidden"
                    title="Open Menu"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                  </button>
                )}
                <img src="/ASKYOUTH.LOGO.png" alt="Logo" className="w-8 h-8 object-contain shrink-0 drop-shadow-sm hidden sm:block" />
                <button
                  onClick={() => window.location.reload()}
                  className="select-none text-base sm:text-2xl font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-cyan-600 to-blue-800 drop-shadow-[0_2px_10px_rgba(0,100,255,0.15)] hover:from-cyan-500 hover:to-blue-500 transition-all duration-200 cursor-pointer whitespace-nowrap"
                >
                  aSK//YOUTH.AI
                </button>
              </div>

              {/* Right side: Notification Bell + Status Badge */}
              <div className="flex items-center gap-3 shrink-0">
                <NotificationBell authHeaders={authHeaders} setCurrentView={setCurrentView} />
                <div className="flex flex-col items-end shrink-0 max-w-[50%] sm:max-w-none">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className={`text-xs font-mono font-bold tracking-wider ${loading ? 'text-cyan-500' : 'text-blue-700'} hidden xs:block sm:block`}>
                      {loading
                        ? streamPhase === 'INDEXING_DOCUMENTS' ? 'INDEXING...'
                          : streamPhase === 'RETRIEVING_CONTEXT' ? 'SEARCHING...'
                            : 'GENERATING...'
                        : 'ONLINE'
                      }</span>
                    <span className="relative flex h-3 w-3 shrink-0">
                      {loading ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
                        </>
                      ) : (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]"></span>
                        </>
                      )}
                    </span>
                  </div>
                  {/* Clock beside Llama model label */}
                  <div className="flex items-center gap-2 mt-1 hidden sm:flex">
                    <span className="font-mono text-[10px] font-normal tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-cyan-600 select-none tabular-nums">
                      {formatClock(now)}
                    </span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest ${!lastModelUsed ? 'text-slate-500' :
                        lastModelUsed.tier === 'gemini' ? 'text-cyan-500' :
                          lastModelUsed.tier === 'groq' ? 'text-amber-400' :
                            'text-red-400'
                      }`}>
                      {lastModelUsed ? lastModelUsed.model.toUpperCase() + ' ACTIVE' : 'AI ENGINE STANDBY'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inner Chat Pane */}
            <div className="flex-1 flex flex-col p-2 sm:p-8 overflow-hidden relative">
              <div className="w-full max-w-5xl mx-auto h-full bg-white border-2 border-slate-900 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.12)] flex flex-col pointer-events-auto">

                <div className="h-11 bg-slate-50 border-b-2 border-slate-200 flex items-center px-4 justify-between flex-shrink-0">
                  <span className="font-mono text-xs sm:text-sm text-black font-bold tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                    THREAD: {activeThread?.title || 'New Chat'}
                  </span>
                  <span className="font-mono text-xs text-blue-600 font-bold hidden sm:block">LOCAL: SECURE</span>
                </div>

                {/* Scrollable Messages Area */}
                <div ref={scrollRef} className="flex-1 p-3 sm:p-8 overflow-y-auto overflow-x-hidden relative z-10 w-full bg-white scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                  {showScrollBottom && (
                    <button
                      onClick={scrollToBottom}
                      className="fixed bottom-32 right-8 sm:right-12 z-50 p-3 bg-white hover:bg-slate-50 border-2 border-slate-300 rounded-full shadow-2xl text-blue-600 hover:text-blue-700 hover:scale-110 active:scale-95 transition-all animate-bounce flex items-center justify-center cursor-pointer ring-1 ring-blue-500/20"
                      title="Scroll to Latest"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7-7-7m14-8l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                  <div className="max-w-4xl mx-auto flex flex-col gap-6">
                    {messages.map((msg, index) => {
                      let thoughtContent = null;
                      let finalContent = msg.content;
                      let docTitle = null;
                      let docContent = null;

                      if (msg.role === 'assistant') {
                        // Extract the reasoning inside <think> tags using RegExp
                        const thinkMatch = msg.content.match(/<think>([\s\S]*?)<\/think>/);
                        if (thinkMatch) {
                          thoughtContent = thinkMatch[1].trim();
                          // Remove the entire <think> block from the visible response
                          finalContent = msg.content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
                        }
                        // ---------------------------------------------------------------------------
                        // Official document extraction — run on the FULL raw content (msg.content)
                        // before think-stripping so tag position never matters.
                        // Fault-tolerant regex handles:
                        //   [/]?                      — stray leading slash on opening tag
                        //   ["']                      — single or double quotes on title
                        //   [^>]*                     — extra attributes
                        //   </official_document>      — correct closing tag
                        //   [END OFFICIAL_DOCUMENT]   — hallucinated closing tag
                        //   $                         — missing closing tag entirely (match to EOS)
                        // ---------------------------------------------------------------------------
                        const OFFICIAL_DOC_RE = /<[/]?official_document\s+title=["'](.*?)["'][^>]*>([\s\S]*?)(?:<\/official_document>|\[END OFFICIAL_DOCUMENT\]|$)/i;
                        const docMatch = OFFICIAL_DOC_RE.exec(msg.content);
                        if (docMatch) {
                          docTitle = docMatch[1].trim();
                          docContent = docMatch[2].trim();
                          // Strip all occurrences from finalContent using the same fault-tolerant pattern
                          finalContent = finalContent.replace(
                            /<[/]?official_document\s+title=["'].*?["'][^>]*>[\s\S]*?(?:<\/official_document>|\[END OFFICIAL_DOCUMENT\]|$)/gi,
                            ''
                          ).trim();
                        }
                      }

                      return (
                        <div key={index} className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-1`}>
                          {/* Timestamp outside the bubble */}
                          {msg.timestamp && (
                            <span className="font-mono text-[10px] text-slate-500 tracking-widest px-1 tabular-nums">
                              {formatStamp(new Date(msg.timestamp))}
                            </span>
                          )}
                          {(msg.role === 'user' || thoughtContent || finalContent.trim().length > 0 || msg.retrievedChunks?.length > 0) && (
                            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 sm:p-6 relative group transition-colors flex flex-col ${msg.role === 'user'
                                ? 'bg-blue-50 border-2 border-blue-600 text-black shadow-sm'
                                : 'bg-white border-2 border-slate-300 text-black shadow-sm'
                              }`}>
                              {/* File attachment cards — supports multi-file (new) and single-file legacy */}
                              {msg.role === 'user' && (() => {
                                const files = msg.attachedFiles?.length > 0
                                  ? msg.attachedFiles
                                  : msg.fileName
                                    ? [{ fileName: msg.fileName, fileType: msg.fileType }]
                                    : [];
                                if (files.length === 0) return null;
                                return (
                                  <div className="mb-3 flex flex-wrap gap-2">
                                    {files.map((af, fi) => {
                                      const ext = (af.fileName || '').split('.').pop().toUpperCase();
                                      const isDoc = ['DOCX', 'DOC'].includes(ext);
                                      const isPdf = ext === 'PDF';
                                      const isCsv = ext === 'CSV';
                                      return (
                                        <div key={fi} className="flex items-center gap-3 bg-white border-2 border-blue-200 rounded-xl px-3 py-2 w-fit max-w-full shadow-xs">
                                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isPdf ? 'bg-red-500/20' : isDoc ? 'bg-blue-500/20' : isCsv ? 'bg-green-500/20' : 'bg-slate-500/20'
                                            }`}>
                                            {isPdf ? (
                                              <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 15.5h-.75V17H7v-4.5h1.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5zm3.75 1.5h-1.5V12.5h1.5c1.1 0 2 .9 2 2v.5c0 1.11-.9 2-2 2zm4.25-3.25h-1V15h1v.75H15.5v.75H14v-4.5h3v.75h-2v.75h1v.75zm-8-0h-.75V16h.75c.41 0 .75-.34.75-.75s-.34-.75-.75-.75zm3.75 0h-.75V16h.75c.69 0 1.25-.56 1.25-1.25v-.5c0-.69-.56-1.25-1.25-1.25z" /></svg>
                                            ) : isDoc ? (
                                              <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM7 17v-1.5h10V17H7zm0-3v-1.5h10V14H7zm0-3V9.5h7V11H7z" /></svg>
                                            ) : (
                                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            )}
                                          </div>
                                          <div className="overflow-hidden">
                                            <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{(af.fileName || '').replace(/\.[^.]+$/, '')}</p>
                                            <p className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">{ext}</p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}

                              {/* AI "Show Thinking" Dropdown Component */}
                              {thoughtContent && (
                                <details className="mb-4 group/think cursor-pointer">
                                  <summary className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors list-none">
                                    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                    <span className="text-xs font-mono tracking-widest text-slate-700 group-hover/think:text-blue-700 font-bold uppercase select-none">
                                      Processing Intent
                                    </span>
                                    <svg className="w-4 h-4 text-slate-500 transform transition-transform group-open/think:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                  </summary>
                                  <div className="mt-3 pl-4 border-l-2 border-slate-300 py-2">
                                    <p className="font-mono text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                      {thoughtContent}
                                    </p>
                                  </div>
                                </details>
                              )}

                              {finalContent.trim().length > 0 && (
                                <div className={`font-sans leading-relaxed prose-chat ${msg.role === 'assistant' ? 'text-black font-normal text-[21px] sm:text-[22px]' : 'text-black font-medium text-[20px] sm:text-[21px]'}`}>
                                  <ReactMarkdown
                                    components={{
                                      p: ({ children }) => {
                                        if (typeof children === 'string' && children.includes('[[SUGGESTIONS_LINK]]')) {
                                          const parts = children.split('[[SUGGESTIONS_LINK]]');
                                          return <p>{parts[0]}<button onClick={() => setCurrentView('suggestions')} className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-300 hover:text-cyan-100 rounded-md text-sm font-bold transition-all">Go Here →</button>{parts[1]}</p>;
                                        }
                                        return <p>{children}</p>;
                                      }
                                    }}
                                  >{finalContent}</ReactMarkdown>
                                </div>
                              )}


                            </div>
                          )}
                          {/* Official Document Export Panel — outside the bubble for clean visual separation */}
                          {msg.role === 'assistant' && docTitle && docContent && (
                            <div className="w-full max-w-[85%] sm:max-w-[75%] rounded-xl border-2 border-blue-200 bg-blue-50/70 p-4 flex flex-col gap-3 shadow-sm">
                              <div className="flex items-center gap-2.5">
                                <span className="text-base leading-none select-none">📄</span>
                                <span className="text-xs font-mono text-slate-700 tracking-wide">
                                  Official Document Drafted:{' '}
                                  <span className="text-blue-900 font-bold">{docTitle}</span>
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleExport(docContent, docTitle, 'docx')}
                                  className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest rounded-lg bg-blue-600 border border-blue-700 text-white hover:bg-blue-700 transition-all cursor-pointer shadow-xs"
                                >
                                  ↓ Export as DOCX
                                </button>
                                <button
                                  onClick={() => handleExport(docContent, docTitle, 'pdf')}
                                  className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest rounded-lg bg-cyan-600 border border-cyan-700 text-white hover:bg-cyan-700 transition-all cursor-pointer shadow-xs"
                                >
                                  ↓ Export as PDF
                                </button>
                              </div>
                            </div>)}
                          {/* Export Response Button — appears on every completed assistant message (Phase 5) */}
                          {msg.role === 'assistant' && finalContent.trim().length > 0 && (
                            <div className="flex justify-end max-w-[85%] sm:max-w-[75%]">
                              <ExportResponseButton
                                messageContent={finalContent}
                                hasOfficialDocument={!!(docTitle && docContent)}
                                officialDocTitle={docTitle}
                                officialDocContent={docContent}
                                authHeaders={authHeaders}
                              />
                            </div>
                          )}
                          {/* Sources Panel — Phase 5 Feature 2: shows document source matches with displayScore */}
                          {msg.role === 'assistant' && (() => {
                            if (!msg.retrievedChunks || msg.retrievedChunks.length === 0) return null;
                            // Phase 2: compute displayScore with 1.15x boost, clamped to 1.0
                            const withDisplay = msg.retrievedChunks.map(c => ({
                              ...c,
                              displayScore: Math.min(c.score * 1.15, 1.0)
                            }));
                            // Phase B: filter to displayScore >= 0.30
                            const qualifying = withDisplay.filter(c => c.displayScore >= 0.30);
                            if (qualifying.length === 0) return null;
                            // Group by filename, keep highest displayScore per file
                            const grouped = Object.values(qualifying.reduce((acc, c) => {
                              const key = c.source;
                              if (!acc[key] || c.displayScore > acc[key].displayScore) {
                                acc[key] = { ...c };
                              }
                              return acc;
                            }, {}));
                            grouped.sort((a, b) => b.displayScore - a.displayScore);
                            const topScore = grouped[0].displayScore;
                            const headerBg = topScore >= 0.90 ? 'bg-green-900' : topScore >= 0.70 ? 'bg-green-800' : topScore >= 0.50 ? 'bg-yellow-900' : 'bg-gray-700';
                            const headerLabel = topScore >= 0.90 ? 'Very High Match' : topScore >= 0.70 ? 'High Match' : topScore >= 0.50 ? 'Moderate Match' : 'Low Match';
                            const topPct = Math.round(topScore * 100);
                            const topPillColor = topScore >= 0.70 ? 'bg-green-900/60 text-green-400' : topScore >= 0.50 ? 'bg-yellow-900/60 text-yellow-400' : 'bg-slate-800 text-slate-400';
                            return (
                              <details className="w-full max-w-[85%] sm:max-w-[75%] group/sources cursor-pointer">
                                <summary className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border-2 border-amber-500/60 hover:bg-amber-100/80 transition-colors list-none select-none">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    <span className="text-xs font-mono tracking-widest text-amber-950 font-bold uppercase">
                                      SOURCES ({grouped.length})
                                    </span>
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200/90 text-amber-900 border border-amber-300">
                                      {topPct}% match
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-amber-900/80 tracking-wide font-medium hidden sm:inline">{headerLabel}</span>
                                    <svg className="w-4 h-4 text-amber-900 transform transition-transform group-open/sources:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                  </div>
                                </summary>
                                <div className="mt-2 flex flex-col gap-2">
                                  {grouped.map((chunk, ci) => {
                                    const pct = Math.round(chunk.displayScore * 100);
                                    const pillColor = chunk.displayScore >= 0.70 ? 'bg-green-900/40 text-green-400' : chunk.displayScore >= 0.50 ? 'bg-yellow-900/40 text-yellow-400' : 'bg-slate-800 text-slate-400';
                                    const snippet = chunk.textSnippet || (chunk.text ? chunk.text.slice(0, 300) : '');
                                    return (
                                      <div key={ci} className="rounded-xl border-2 border-slate-200 bg-slate-50 overflow-hidden shadow-xs">
                                        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white">
                                          <div className="flex items-center gap-2 overflow-hidden">
                                            <svg className="w-3 h-3 text-cyan-500 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z" /></svg>
                                            <span className="text-xs font-mono font-bold text-slate-800 truncate max-w-[200px]">{chunk.source}</span>
                                          </div>
                                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${pillColor}`}>
                                            {pct}% match
                                          </span>
                                        </div>
                                        <details className="group/snippet">
                                          <summary className="px-3 py-1.5 text-xs font-mono text-slate-600 hover:text-blue-700 cursor-pointer select-none list-none transition-colors">▶ View Snippet</summary>
                                          <pre className="px-3 pb-3 pt-1 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed border-t border-slate-200 bg-slate-50">{snippet}{snippet.length >= 300 ? '...' : ''}</pre>
                                        </details>
                                      </div>
                                    );
                                  })}
                                </div>
                              </details>
                            );
                          })()}
                        </div>
                      );
                    })}

                    {/* Phase-aware loading indicators */}
                    {loading && streamPhase !== 'GENERATING' && (
                      <div className="flex w-full justify-start">
                        <div className="max-w-[80%] bg-white border-2 border-slate-300 shadow-sm rounded-xl p-4 flex items-center gap-3">
                          {/* Spinning ring for indexing/searching phases */}
                          <svg className="w-5 h-5 text-blue-600 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-xs font-mono text-slate-800 font-bold tracking-widest uppercase animate-pulse">
                            {streamPhase === 'INDEXING_DOCUMENTS' && 'Indexing Documents...'}
                            {streamPhase === 'RETRIEVING_CONTEXT' && 'Searching Knowledge Base...'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Live streaming bubble — renders tokens in real-time */}
                    {loading && streamPhase === 'GENERATING' && (
                      <div className="flex w-full justify-start">
                        <div className="max-w-[85%] sm:max-w-[75%] bg-white border-2 border-slate-300 text-black rounded-2xl p-4 sm:p-6 flex flex-col shadow-sm">
                          <div className="font-sans leading-relaxed prose-chat text-black font-normal text-[21px] sm:text-[22px]">
                            <ReactMarkdown>{streamingContent.replace(/<official_document[\s\S]*/i, '').trim()}</ReactMarkdown>
                          </div>
                          {/* Blinking cursor to indicate streaming is active */}
                          <span className="mt-2 inline-block w-2.5 h-5 bg-blue-600 animate-[pulse_0.8s_ease-in-out_infinite] align-middle" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Input Area — also serves as the drag-and-drop zone */}
                <div
                  className={`p-3 sm:p-5 bg-white border-t-2 flex-shrink-0 relative transition-all duration-200 ${isDragging
                      ? 'border-blue-600 bg-blue-50/40'
                      : 'border-slate-200'
                    }`}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {/* Drag overlay label */}
                  {isDragging && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                      <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 border-2 border-blue-700 rounded-xl text-white font-bold shadow-lg font-mono text-xs tracking-widest uppercase">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        Drop files to attach (max 8)
                      </div>
                    </div>
                  )}
                  <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex flex-col gap-2">

                    {/* File attachment chips — one per selected file, max 8 */}
                    {selectedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedFiles.map((f, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono">
                            <svg className="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                            <span className="text-slate-800 font-bold max-w-[150px] truncate">{f.name}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-red-600 transition-colors ml-1 shrink-0 cursor-pointer"
                              title="Remove file"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                          </div>
                        ))}
                        {selectedFiles.length >= 8 && (
                          <span className="self-center text-[10px] font-mono text-amber-500 tracking-wider">MAX 8 FILES</span>
                        )}
                      </div>
                    )}

                    {/* Input row: attach button + textarea + send */}
                    <div className="flex items-end gap-2">

                      {/* Hidden file input + visible paperclip button */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt,.md,.csv,.jpg,.jpeg,.png,.tiff,.tif,.webp"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const picked = Array.from(e.target.files || []);
                          setSelectedFiles(prev => {
                            const combined = [...prev, ...picked];
                            const unique = combined.filter((f, i, arr) => arr.findIndex(x => x.name === f.name) === i);
                            return unique.slice(0, 8);
                          });
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading || selectedFiles.length >= 8}
                        title={selectedFiles.length >= 8 ? "Max 8 files reached" : "Attach files (PDF, DOCX, TXT) — up to 8"}
                        className="shrink-0 p-3 rounded-xl border-2 border-slate-300 bg-slate-50 text-slate-700 hover:text-black hover:border-black transition-all disabled:opacity-40 cursor-pointer"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                      </button>

                      {/* Auto-expanding textarea */}
                      <textarea
                        ref={textareaRef}
                        value={inputText}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        disabled={loading}
                        placeholder="Initiate prompt..."
                        rows={1}
                        style={{ maxHeight: '200px', overflowY: 'auto', resize: 'none' }}
                        className="flex-1 w-full bg-slate-50 border-2 border-slate-300 hover:border-slate-400 focus:border-black focus:bg-white focus:ring-1 focus:ring-black rounded-xl px-4 py-3 text-black font-mono text-base sm:text-lg transition-all placeholder-slate-400 disabled:opacity-50 leading-relaxed"
                        autoFocus
                      />

                      {/* Send button */}
                      <button
                        type="submit"
                        disabled={loading || !inputText.trim()}
                        className={`shrink-0 px-6 py-3 font-display font-bold text-sm tracking-widest uppercase rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${(loading || !inputText.trim())
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : 'bg-black hover:bg-slate-800 text-white border border-black shadow-md hover:shadow-lg cursor-pointer active:scale-95'
                          }`}
                      >
                        SEND
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                      </button>

                    </div>
                  </form>
                </div>
              </div>
            </div>

          </>
          )}



        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-slate-900 mb-2">Delete Conversation?</h3>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to delete this conversation? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
