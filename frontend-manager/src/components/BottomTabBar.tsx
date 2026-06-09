import { brand } from '@shared/brand';

type Tab = 'reports' | 'new' | 'archive';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  attentionCount: number;
}

function Icon({ name }: { name: Tab }) {
  if (name === 'reports') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12 12 3l9 9" /><path d="M5 10v10h14V10" />
      </svg>
    );
  }
  if (name === 'archive') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="5" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" /><path d="M10 12h4" />
      </svg>
    );
  }
  // new
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export default function BottomTabBar({ active, onChange, attentionCount }: Props) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'reports', label: 'Reports' },
    { id: 'new', label: brand.copy.newReport },
    { id: 'archive', label: 'Archive' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[var(--surface)] border-t border-[var(--border)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-lg mx-auto flex">
        {tabs.map(tab => {
          const isActive = active === tab.id;
          const showAttention = tab.id === 'reports' && attentionCount > 0;
          return (
            <button key={tab.id} type="button" onClick={() => onChange(tab.id)}
              className="relative flex-1 flex flex-col items-center justify-center gap-1 min-h-[58px] transition-colors"
              style={{ color: isActive ? 'var(--text)' : 'var(--subtle)' }}>
              <Icon name={tab.id} />
              <span className="text-[11.5px] font-medium tracking-tight">{tab.label}</span>
              {showAttention && (
                <span className="absolute top-2.5 right-[calc(50%-1.5rem)] min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold flex items-center justify-center text-white bg-[var(--query)] tabular-nums"
                  title={`${attentionCount} report${attentionCount > 1 ? 's' : ''} need your reply`}>
                  {attentionCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export type { Tab };
