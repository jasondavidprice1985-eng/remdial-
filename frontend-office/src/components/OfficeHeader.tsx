import { useAuth } from '../auth/AuthContext';

interface Props {
  archiveMode: boolean;
  unreadTotal: number;
  onToggleArchive: () => void;
}

export default function OfficeHeader({ archiveMode, unreadTotal, onToggleArchive }: Props) {
  const { user, logout } = useAuth();
  return (
    <header className="glass-panel mx-4 mt-3 mb-0 px-4 py-2.5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--surface-2)] border border-[var(--border)]">
          <svg className="w-5 h-5 text-[var(--pending)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-[var(--text)]">Remedial Office</h1>
          <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest">Command Center</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {unreadTotal > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[var(--pending)] border border-blue-100">
            {unreadTotal} new msg{unreadTotal > 1 ? 's' : ''}
          </span>
        )}
        <button onClick={e => { e.stopPropagation(); onToggleArchive(); }}
          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors border ${
            archiveMode
              ? 'bg-[var(--pending)] text-white border-transparent'
              : 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface-2)]'
          }`}>
          {archiveMode ? 'Active' : 'Archive'}
        </button>
        {user && (
          <button onClick={e => { e.stopPropagation(); logout(); }}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
            title={`Signed in as ${user.username}`}>
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
