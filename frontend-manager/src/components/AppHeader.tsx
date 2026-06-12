import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { Tab } from './BottomTabBar';

interface Props {
  tab: Tab;
  archivedCount: number;
}

interface HeaderContent {
  title: string;
  subtitle: string;
}

function contentFor(tab: Tab, archivedCount: number): HeaderContent {
  if (tab === 'new')     return { title: 'New Remedial',     subtitle: 'Fill in details' };
  if (tab === 'archive') return { title: 'Archive',          subtitle: `${archivedCount} job${archivedCount === 1 ? '' : 's'} complete` };
  return                        { title: 'Remedial',         subtitle: 'Ticket Dashboard' };
}

export default function AppHeader({ tab, archivedCount }: Props) {
  const { user, logout } = useAuth();
  const { status, enable, disable } = useNotifications(!!user);

  const bellLabel =
    status === 'subscribed' ? 'Notifications on'
    : status === 'denied'   ? 'Blocked — change in browser settings'
    : status === 'unsupported' ? 'Not supported on this browser'
    : 'Enable notifications';

  const bellAction =
    status === 'subscribed' ? disable
    : status === 'denied' || status === 'unsupported' ? undefined
    : enable;

  const bellAttention = status !== 'subscribed' && status !== 'denied' && status !== 'unsupported';

  const showReportsActions = tab === 'reports';

  // Crossfade the text on tab change
  const [content, setContent] = useState<HeaderContent>(() => contentFor(tab, archivedCount));
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    const next = contentFor(tab, archivedCount);
    if (next.title === content.title && next.subtitle === content.subtitle) return;
    setPhase('out');
    const swap = setTimeout(() => {
      setContent(next);
      setPhase('in');
    }, 140);
    return () => clearTimeout(swap);
  }, [tab, archivedCount, content.title, content.subtitle]);

  const fadeStyle = {
    opacity: phase === 'in' ? 1 : 0,
    transform: phase === 'in' ? 'translateY(0)' : 'translateY(-4px)',
    transition: 'opacity 0.18s ease-out, transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
  };

  return (
    <header
      className="px-5 pt-5 pb-5 bg-[var(--surface)] border-b border-[var(--border)]"
      style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-lg bg-[var(--text)] text-white grid place-items-center text-[18px] font-bold shrink-0">
          R
        </div>
        <div className="flex-1 min-w-0" style={fadeStyle}>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--text)] m-0 leading-[1.15] truncate">{content.title}</h1>
          <p className="text-[13px] text-[var(--ordered)] m-0 mt-1 inline-flex items-center gap-1.5 truncate">
            <span className="w-[6px] h-[6px] rounded-full bg-[var(--ordered)] shrink-0" />
            {content.subtitle}
          </p>
        </div>
        {user && (
          <div
            className="flex items-center gap-1.5"
            style={{
              opacity: showReportsActions ? 1 : 0,
              pointerEvents: showReportsActions ? 'auto' : 'none',
              transition: 'opacity 0.22s ease-out',
            }}
            aria-hidden={!showReportsActions}
          >
            <button
              type="button"
              className="w-9 h-9 rounded-[8px] border border-[var(--border)] grid place-items-center text-[var(--text)] hover:bg-[var(--surface-2)]"
              title="Search"
              aria-label="Search"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
            </button>
            <button
              type="button"
              onClick={bellAction}
              disabled={!bellAction}
              className="relative w-9 h-9 rounded-[8px] border border-[var(--border)] grid place-items-center text-[var(--text)] hover:bg-[var(--surface-2)] disabled:opacity-50"
              title={bellLabel}
              aria-label={bellLabel}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {bellAttention && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--query)]" />
              )}
            </button>
            <button
              onClick={logout}
              className="ml-1 text-[12px] font-medium text-[var(--subtle)] hover:text-[var(--text)] px-1"
              title={`Sign out ${user.displayName}`}
            >
              {user.displayName}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
