import React from 'react';

export const COMMITTEE_METADATA = {
  health: {
    label: 'Health Committee',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500'
  },
  education: {
    label: 'Education Committee',
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500'
  },
  economic: {
    label: 'Economic Empowerment Committee',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500'
  },
  social: {
    label: 'Social Inclusion & Equity Committee',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dot: 'bg-purple-500'
  },
  peacebuilding: {
    label: 'Peacebuilding & Security Committee',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    dot: 'bg-rose-500'
  },
  governance: {
    label: 'Governance Committee',
    bg: 'bg-cyan-50',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
    dot: 'bg-cyan-500'
  },
  citizenship: {
    label: 'Active Citizenship Committee',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    dot: 'bg-sky-500'
  },
  environment: {
    label: 'Environment Committee',
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
    dot: 'bg-teal-500'
  },
  global: {
    label: 'Global Mobility Committee',
    bg: 'bg-fuchsia-50',
    text: 'text-fuchsia-800',
    border: 'border-fuchsia-200',
    dot: 'bg-fuchsia-500'
  },
  agriculture: {
    label: 'Agriculture Committee',
    bg: 'bg-lime-50',
    text: 'text-lime-800',
    border: 'border-lime-200',
    dot: 'bg-lime-500'
  },
  general: {
    label: 'General (Barangay-Wide)',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    dot: 'bg-slate-500'
  }
};

export function getCommitteeLabel(code) {
  if (!code) return 'Unassigned Committee';
  if (code === 'general') return 'General (Barangay-Wide)';
  return COMMITTEE_METADATA[code]?.label || `${code.charAt(0).toUpperCase() + code.slice(1)} Committee`;
}

export default function CommitteeBadge({ committee, className = '', showDot = true, compact = false }) {
  if (!committee) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 ${className}`}>
        {showDot && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
        Unassigned
      </span>
    );
  }

  const meta = COMMITTEE_METADATA[committee] || {
    label: `${committee.charAt(0).toUpperCase() + committee.slice(1)} Committee`,
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dot: 'bg-blue-500'
  };

  const label = compact
    ? meta.label.replace(' Committee', '').replace(' (Barangay-Wide)', '')
    : meta.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${meta.bg} ${meta.text} ${meta.border} shadow-xs ${className}`}
      title={meta.label}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} shrink-0`} />}
      <span className="truncate">{label}</span>
    </span>
  );
}

