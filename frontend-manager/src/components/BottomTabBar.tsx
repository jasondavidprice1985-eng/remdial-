type Tab = 'new' | 'reports';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  reportCount: number;
  unreadTotal: number;
}

export default function BottomTabBar({ active, onChange, reportCount, unreadTotal }: Props) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'reports', label: 'Reports' },
    { id: 'new', label: 'New Report' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-[var(--border)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-lg mx-auto flex">
        {tabs.map(tab => {
          const isActive = active === tab.id;
          const showUnread = tab.id === 'reports' && unreadTotal > 0;
          return (
            <button key={tab.id} type="button" onClick={() => onChange(tab.id)}
              className="relative flex-1 flex flex-col items-center justify-center min-h-[56px] transition-colors"
              style={{ color: isActive ? 'var(--action)' : 'var(--muted)' }}>
              {isActive && (
                <span className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full bg-[var(--action)]" />
              )}
              <span className="text-base font-semibold">{tab.label}</span>
              {tab.id === 'reports' && reportCount > 0 && (
                <span className="absolute top-2 right-[calc(50%-2.75rem)] min-w-[20px] h-5 px-1 rounded-full text-[11px] font-bold flex items-center justify-center text-white bg-stone-400"
                  title={`${reportCount} report${reportCount > 1 ? 's' : ''}`}>
                  {reportCount}
                </span>
              )}
              {showUnread && (
                <span className="absolute top-2 right-[calc(50%-4.5rem)] min-w-[20px] h-5 px-1 rounded-full text-[11px] font-bold flex items-center justify-center text-white bg-[var(--danger)]"
                  title={`${unreadTotal} report${unreadTotal > 1 ? 's' : ''} need your reply`}>
                  {unreadTotal}
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
