import { useAuth } from '../auth/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { BrandLogo } from '@shared/BrandLogo';

export default function AppHeader() {
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
    <header
      className="enterprise-header px-4 py-3.5"
      style={{ paddingTop: 'max(0.875rem, env(safe-area-inset-top))' }}
    >
      <div className="flex items-center gap-3">
        <BrandLogo product="field" size="md" variant="light" />
        <div className="flex-1" />
        {user && (
          <div className="flex items-center gap-2">
            <button onClick={bellAction} disabled={!bellAction}
              className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/18 transition-colors disabled:opacity-50"
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
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/18 transition-colors"
              title={`Signed in as ${user.username}`}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
