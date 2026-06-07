import React from 'react';

type BannerState = 'none' | 'sending' | 'submitted' | 'offline' | 'synced' | 'error';

interface Props {
  banner: BannerState;
  submittedRef?: string;
  errorText?: string;
}

function Spinner() {
  return <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />;
}

const CONFIG: Record<Exclude<BannerState, 'none'>, { className: string; icon: React.ReactNode; text: (ref?: string, err?: string) => string }> = {
  sending:   { className: 'bg-[var(--action)] text-white', icon: <Spinner />, text: () => 'Submitting report…' },
  submitted: { className: 'bg-[var(--success)] text-white', icon: <span className="text-lg">✓</span>, text: ref => `Report submitted — Ref: ${ref || '—'}` },
  offline:   { className: 'bg-stone-800 text-white', icon: <span>☁</span>, text: () => 'No signal. Saved locally — will sync automatically.' },
  synced:    { className: 'bg-[var(--success)] text-white', icon: <span>↻</span>, text: () => 'All offline reports synced!' },
  error:     { className: 'bg-[var(--danger)] text-white', icon: <span>⚠</span>, text: (_r, err) => err || 'Something went wrong. Please try again.' },
};

export default function StatusBanner({ banner, submittedRef, errorText }: Props) {
  if (banner === 'none') return null;
  const cfg = CONFIG[banner];
  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none animate-slide-down">
      <div className={`text-base font-semibold px-5 py-3.5 rounded-2xl shadow-lg flex items-center gap-2.5 max-w-md ${cfg.className}`}>
        {cfg.icon}
        <span>{cfg.text(submittedRef, errorText)}</span>
      </div>
    </div>
  );
}
