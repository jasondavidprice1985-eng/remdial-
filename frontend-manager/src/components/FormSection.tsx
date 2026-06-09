import React from 'react';

interface Props {
  step?: number;
  eyebrow?: string;
  label: string;
  aux?: React.ReactNode;
  children: React.ReactNode;
}

export default function FormSection({ step, eyebrow, label, aux, children }: Props) {
  return (
    <section className="py-6 border-b border-[var(--border)]">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-[11px] text-[var(--faint)] tracking-[0.04em] tabular-nums mb-1">
            {step !== undefined && <span className="font-mono">{String(step).padStart(2, '0')}</span>}
            {eyebrow && <span> · {eyebrow}</span>}
          </div>
          <h2 className="text-[17px] font-semibold tracking-[-0.014em] text-[var(--text)] m-0">
            {label}
          </h2>
        </div>
        {aux && <div className="text-[11.5px] pt-[3px]">{aux}</div>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function CompleteTag({ done, label }: { done?: boolean; label?: string }) {
  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[var(--ordered)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ordered)]" />
        Complete
      </span>
    );
  }
  return <span className="text-[var(--faint)]">{label || 'Optional'}</span>;
}
