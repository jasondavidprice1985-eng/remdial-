interface Props {
  title: string;
  subtitle: string;
  icon: 'reports' | 'offline' | 'archive';
}

function Icon({ type }: { type: Props['icon'] }) {
  const cls = 'w-14 h-14 text-stone-400';
  if (type === 'reports') return (
    <svg className={cls} fill="none" viewBox="0 0 48 48" stroke="currentColor" strokeWidth={1.5}>
      <rect x="8" y="6" width="32" height="36" rx="4" /><path d="M16 16h16M16 24h16M16 32h10" strokeLinecap="round" />
    </svg>
  );
  if (type === 'offline') return (
    <svg className={cls} fill="none" viewBox="0 0 48 48" stroke="currentColor" strokeWidth={1.5}>
      <path d="M12 32c4-4 20-4 24 0" strokeLinecap="round" />
      <path d="M8 28c6-6 26-6 32 0M4 24c8-8 32-8 40 0" strokeLinecap="round" opacity="0.5" />
      <path d="M10 10l28 28" strokeLinecap="round" />
    </svg>
  );
  return (
    <svg className={cls} fill="none" viewBox="0 0 48 48" stroke="currentColor" strokeWidth={1.5}>
      <path d="M10 14h28v24H10z" /><path d="M18 8h12v6H18z" />
    </svg>
  );
}

export default function EmptyState({ title, subtitle, icon }: Props) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 animate-slide-up">
      <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-5 bg-stone-100 border border-[var(--border)]">
        <Icon type={icon} />
      </div>
      <p className="text-lg font-bold text-[var(--text)]">{title}</p>
      <p className="text-base text-[var(--muted)] mt-2 max-w-xs leading-relaxed">{subtitle}</p>
    </div>
  );
}
