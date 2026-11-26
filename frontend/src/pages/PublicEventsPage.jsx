// PublicEventsPage — no-login public events viewer at /publicevents
// Fetches only the public tier from /api/public/events (no auth required).
// Feedback (read + post) uses /api/public/events/:id/feedback.
// A guest JWT is required to post feedback (user must log in first).

import { useState, useEffect, useRef } from 'react';

const STATUS_LABELS = { upcoming: 'Upcoming', active: 'Active', completed: 'Completed' };
const STATUS_COLORS = {
  upcoming: 'bg-amber-50 text-amber-800 border border-amber-300',
  active: 'bg-emerald-600 text-white shadow-sm',
  completed: 'bg-slate-100 text-slate-600 border border-slate-300',
};

function FeedbackPanel({ eventId, apiBase, authToken, authUser }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [form, setForm] = useState({ display_name: '', kind: 'comment', content: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/public/events/${eventId}/feedback`);
      if (res.ok) setComments(await res.json());
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchComments(); }, [eventId]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!form.content.trim()) { setError('Please write your feedback.'); return; }
    if (!authToken) { setError('You must be logged in to post feedback. Please log in first.'); return; }
    setPosting(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${apiBase}/api/public/events/${eventId}/feedback`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: form.display_name || authUser?.full_name || 'Anonymous',
          kind: form.kind,
          content: form.content.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post feedback.');
      setSuccess('Feedback posted!');
      setForm(f => ({ ...f, content: '', display_name: '' }));
      fetchComments();
    } catch (err) { setError(err.message); }
    finally { setPosting(false); }
  };

  const topLevel = comments.filter(c => !c.parent_id);
  const replies = (parentId) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <p className="text-xs font-display font-bold uppercase tracking-widest text-slate-500 mb-3">
        💬 Community Feedback ({comments.length})
      </p>

      {loading && <p className="text-xs text-slate-400 font-mono">Loading…</p>}

      {topLevel.length === 0 && !loading && (
        <p className="text-xs text-slate-400 font-mono italic mb-3">No feedback yet. Be the first!</p>
      )}

      <div className="space-y-3 mb-4">
        {topLevel.map(c => (
          <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-display font-bold text-slate-800">{c.author_label || c.author_name}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${c.kind === 'suggestion' ? 'bg-cyan-100 text-cyan-700 border border-cyan-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                {c.kind}
              </span>
              {c.is_official === 1 && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700 border border-amber-200">Official</span>
              )}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{c.content}</p>
            {/* Replies */}
            {replies(c.id).map(r => (
              <div key={r.id} className="ml-4 mt-2 pl-3 border-l-2 border-blue-200 bg-white rounded-lg p-2">
                <span className="text-xs font-bold text-slate-700">{r.author_label || r.author_name}</span>
                {r.is_official === 1 && (
                  <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-bold">Official</span>
                )}
                <p className="text-xs text-slate-600 mt-0.5">{r.content}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Post feedback form */}
      <form onSubmit={handlePost} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={authUser?.full_name || 'Your name (optional)'}
            value={form.display_name}
            onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-400 bg-white"
          />
          <select
            value={form.kind}
            onChange={e => setForm(f => ({ ...f, kind: e.target.value }))}
            className="border border-slate-200 rounded-lg px-2 py-2 text-xs font-mono focus:outline-none focus:border-blue-400 bg-white"
          >
            <option value="comment">Comment</option>
            <option value="suggestion">Suggestion</option>
          </select>
        </div>
        <textarea
          rows={2}
          placeholder={authToken ? 'Write your feedback…' : 'Log in to post feedback.'}
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          disabled={!authToken}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-400 resize-none bg-white disabled:opacity-50"
        />
        {error && <p className="text-xs text-red-500 font-mono">{error}</p>}
        {success && <p className="text-xs text-emerald-600 font-mono">{success}</p>}
        <button
          type="submit"
          disabled={posting || !authToken}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-display font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
        >
          {posting ? 'Posting…' : 'Post Feedback'}
        </button>
        {!authToken && (
          <a
            href="/"
            className="ml-2 text-xs text-blue-600 hover:underline font-mono"
          >
            Log in to post
          </a>
        )}
      </form>
    </div>
  );
}

export default function PublicEventsPage({ apiBase }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCommittee, setFilterCommittee] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Read token from storage for feedback posting (user may have logged into the app before)
  const authToken = localStorage.getItem('askyouth_token') || sessionStorage.getItem('askyouth_token') || null;
  const authUserRaw = localStorage.getItem('askyouth_user') || sessionStorage.getItem('askyouth_user') || null;
  const authUser = authUserRaw ? (() => { try { return JSON.parse(authUserRaw); } catch { return null; } })() : null;

  useEffect(() => {
    setLoading(true);
    fetch(`${apiBase}/api/public/events`)
      .then(r => r.json())
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [apiBase]);

  const committees = [...new Set(events.map(e => e.committee).filter(Boolean))].sort();

  const filtered = events.filter(ev => {
    if (filterStatus && ev.status !== filterStatus) return false;
    if (filterCommittee && ev.committee !== filterCommittee) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!(ev.title || '').toLowerCase().includes(q) &&
        !(ev.description || '').toLowerCase().includes(q) &&
        !(ev.location || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/20 font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/ASKYOUTH.LOGO.png" alt="aSKYOUTH" className="w-8 h-8 object-contain" onError={e => e.target.style.display = 'none'} />
            <div>
              <span className="font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-cyan-600">
                aSK//YOUTH
              </span>
              <span className="ml-2 text-xs font-mono text-slate-500">Public Events</span>
            </div>
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-display font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all"
          >
            {authToken ? 'Go to App →' : 'Login to aSKYouth →'}
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900">SK Events & Programs</h1>
          <p className="text-slate-500 font-mono text-sm mt-1">
            Public events and programs by the Sangguniang Kabataan of your Barangay.
            Viewing is open to all — no login required.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <input
            type="text"
            placeholder="Search events…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            className="flex-1 min-w-[180px] border-2 border-slate-200 focus:border-blue-400 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none bg-white"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border-2 border-slate-200 focus:border-blue-400 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none bg-white"
          >
            <option value="">All Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={filterCommittee}
            onChange={e => setFilterCommittee(e.target.value)}
            className="border-2 border-slate-200 focus:border-blue-400 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none bg-white"
          >
            <option value="">All Committees</option>
            {committees.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-10 text-center">
            <p className="text-slate-400 font-mono text-sm">No events found.</p>
          </div>
        )}

        {/* Event cards */}
        <div className="space-y-4">
          {filtered.map(ev => {
            const isExpanded = expandedId === ev.id;
            const dateLabel = ev.date
              ? new Date(ev.date + 'T00:00:00+08:00').toLocaleDateString('en-US', {
                timeZone: 'Asia/Singapore', month: 'long', day: 'numeric', year: 'numeric'
              })
              : null;

            return (
              <div
                key={ev.id}
                className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Card header — always visible */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                  className="w-full text-left p-5 flex items-start justify-between gap-4 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${STATUS_COLORS[ev.status] || 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_LABELS[ev.status] || ev.status}
                      </span>
                      {ev.committee && (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold uppercase tracking-wider">
                          {ev.committee === 'general' ? 'Barangay-Wide' : `${ev.committee} Committee`}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-display font-black text-slate-900 truncate">{ev.title}</h2>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs font-mono text-slate-500">
                      {dateLabel && <span>📅 {dateLabel}</span>}
                      {ev.time && <span>🕐 {ev.time}</span>}
                      {ev.location && <span>📍 {ev.location}</span>}
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-slate-400 shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100">
                    {ev.description && (
                      <p className="text-sm text-slate-700 leading-relaxed mt-4 mb-3">{ev.description}</p>
                    )}
                    {ev.requirements && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3">
                        <p className="text-xs font-display font-bold text-amber-800 uppercase tracking-wider mb-1">Requirements</p>
                        <p className="text-sm text-amber-900">{ev.requirements}</p>
                      </div>
                    )}
                    <FeedbackPanel
                      eventId={ev.id}
                      apiBase={apiBase}
                      authToken={authToken}
                      authUser={authUser}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="mt-10 text-center">
          <p className="text-slate-400 font-mono text-xs mb-3">
            Want to interact with the AI assistant or participate in SK programs?
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-display font-bold tracking-widest uppercase rounded-xl shadow-md transition-all"
          >
            Login to aSKYOUTH →
          </a>
        </div>
      </main>
    </div>
  );
}
