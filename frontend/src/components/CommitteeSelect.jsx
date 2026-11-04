import React, { useState, useEffect } from 'react';

// In-memory cache for committees fetched from GET /api/committees
let cachedCommittees = null;
let pendingFetch = null;

export async function fetchCommittees(apiBase = '') {
  if (cachedCommittees) return cachedCommittees;
  if (pendingFetch) return pendingFetch;

  pendingFetch = (async () => {
    try {
      const res = await fetch(`${apiBase}/api/committees`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          cachedCommittees = data;
          return cachedCommittees;
        }
      }
    } catch (e) {
      console.warn('[CommitteeSelect] Failed to fetch committees, using fallback:', e.message);
    }
    return [
      { code: 'health', label: 'Health Committee' },
      { code: 'education', label: 'Education Committee' },
      { code: 'economic', label: 'Economic Empowerment Committee' },
      { code: 'social', label: 'Social Inclusion and Equity Committee' },
      { code: 'peacebuilding', label: 'Peacebuilding and Security Committee' },
      { code: 'governance', label: 'Governance Committee' },
      { code: 'citizenship', label: 'Active Citizenship Committee' },
      { code: 'environment', label: 'Environment Committee' },
      { code: 'global', label: 'Global Mobility Committee' },
      { code: 'agriculture', label: 'Agriculture Committee' }
    ];
  })();

  const result = await pendingFetch;
  pendingFetch = null;
  return result;
}

export default function CommitteeSelect({
  value,
  onChange,
  apiBase = '',
  required = false,
  disabled = false,
  includeGeneral = false,
  generalLabel = 'General (Barangay-Wide)',
  placeholder = '-- Select Committee --',
  className = '',
  id = 'committee-select',
  name = 'committee'
}) {
  const [committees, setCommittees] = useState(cachedCommittees || []);
  const [loading, setLoading] = useState(!cachedCommittees);

  useEffect(() => {
    let isMounted = true;
    fetchCommittees(apiBase).then(list => {
      if (isMounted) {
        // Exclude 'special' committee if present anywhere per owner decision
        const filtered = list.filter(c => c.code !== 'special');
        setCommittees(filtered);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [apiBase]);

  const defaultCls = "w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-blue-600 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none transition-all shadow-sm font-medium";

  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        required={required}
        disabled={disabled || loading}
        className={`${defaultCls} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <option value="">{loading ? 'Loading committees...' : placeholder}</option>
        {includeGeneral && (
          <option value="general" className="font-semibold text-slate-900">
            {generalLabel}
          </option>
        )}
        {committees.map(c => (
          <option key={c.code} value={c.code} className="font-medium text-slate-900">
            {c.label}
          </option>
        ))}
      </select>
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

