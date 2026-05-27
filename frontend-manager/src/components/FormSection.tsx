import React from 'react';

export default function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <p className="text-xs font-bold tracking-[0.12em] text-[var(--muted)] uppercase">{label}</p>
      {children}
    </section>
  );
}
