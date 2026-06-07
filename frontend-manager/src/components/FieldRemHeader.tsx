import { useAuth } from '../auth/AuthContext';
import { useNotifications } from '../hooks/useNotifications';

export default function FieldRemHeader() {
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

  return (
    <header className="bg-[var(--action)] text-white px-4 py-4 shadow-sm"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-white/20">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 6h16v2H4V6zm0 5h10v2H4v-2zm0 5h14v2H4v-2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight">FieldRem</h1>
          <p className="text-sm text-blue-100">Kitchen Remedial Reports</p>
        </div>
        {user && (
          <>
            <button onClick={bellAction} disabled={!bellAction}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 transition-colors disabled:opacity-50"
              title={bellLabel} aria-label={bellLabel}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                {status !== 'subscribed' && (
                  <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
                )}
              </svg>
            </button>
            <button onClick={logout}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
              title={`Signed in as ${user.username}`}>
              Sign out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
