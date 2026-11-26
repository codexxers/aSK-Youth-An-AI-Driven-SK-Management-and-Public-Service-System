import React from 'react';

export const COMMITTEE_METADATA = {
  health: {
    label: 'Health Committee',
    bg: 'bg-emerald-50 dark:bg-emerald-900/40',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-700',
    dot: 'bg-emerald-500'
  },
  education: {
    label: 'Education Committee',
    bg: 'bg-indigo-50 dark:bg-indigo-900/40',
    text: 'text-indigo-800 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-700',
    dot: 'bg-indigo-500'
  },
  economic: {
    label: 'Economic Empowerment Committee',
    bg: 'bg-amber-50 dark:bg-amber-900/40',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-700',
    dot: 'bg-amber-500'
  },
  social: {
    label: 'Social Inclusion & Equity Committee',
    bg: 'bg-purple-50 dark:bg-purple-900/40',
    text: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-700',
    dot: 'bg-purple-500'
  },
  peacebuilding: {
    label: 'Peacebuilding & Security Committee',
    bg: 'bg-rose-50 dark:bg-rose-900/40',
    text: 'text-rose-800 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-700',
    dot: 'bg-rose-500'
  },
  governance: {
    label: 'Governance Committee',
    bg: 'bg-cyan-50 dark:bg-cyan-900/40',
    text: 'text-cyan-800 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-700',
    dot: 'bg-cyan-500'
  },
  citizenship: {
    label: 'Active Citizenship Committee',
    bg: 'bg-sky-50 dark:bg-sky-900/40',
    text: 'text-sky-800 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-700',
    dot: 'bg-sky-500'
  },
  environment: {
    label: 'Environment Committee',
    bg: 'bg-teal-50 dark:bg-teal-900/40',
    text: 'text-teal-800 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-700',
    dot: 'bg-teal-500'
  },
  global: {
    label: 'Global Mobility Committee',
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/40',
    text: 'text-fuchsia-800 dark:text-fuchsia-300',
    border: 'border-fuchsia-200 dark:border-fuchsia-700',
    dot: 'bg-fuchsia-500'
  },
  agriculture: {
    label: 'Agriculture Committee',
    bg: 'bg-lime-50 dark:bg-lime-900/40',
    text: 'text-lime-800 dark:text-lime-300',
    border: 'border-lime-200 dark:border-lime-700',
    dot: 'bg-lime-500'
  },
  general: {
    label: 'General (Barangay-Wide)',
    bg: 'bg-slate-100 dark:bg-slate-700',
    text: 'text-slate-800 dark:text-slate-200',
    border: 'border-slate-300 dark:border-slate-500',
    dot: 'bg-slate-500 dark:bg-slate-400'
  },
  unassigned: {
    label: 'Unassigned (Pending Delegation)',
    bg: 'bg-amber-50 dark:bg-amber-900/40',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
    dot: 'bg-amber-500'
  }
};

export function getCommitteeLabel(code) {
  if (!code || code === 'unassigned') return 'Unassigned (Pending Delegation)';
  if (code === 'general') return 'General (Barangay-Wide)';
  return COMMITTEE_METADATA[code]?.label || `${code.charAt(0).toUpperCase() + code.slice(1)} Committee`;
}

export default function CommitteeBadge({ committee, className = '', showDot = true, compact = false }) {
  if (!committee) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 ${className}`}>
        {showDot && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
        Unassigned
      </span>
    );
  }

  const meta = COMMITTEE_METADATA[committee] || {
    label: `${committee.charAt(0).toUpperCase() + committee.slice(1)} Committee`,
    bg: 'bg-blue-50 dark:bg-blue-900/40',
    text: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-700',
    dot: 'bg-blue-500'
  };

  const label = compact
    ? meta.label.replace(' Committee', '').replace(' (Barangay-Wide)', '').replace(' (Pending Delegation)', '')
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

