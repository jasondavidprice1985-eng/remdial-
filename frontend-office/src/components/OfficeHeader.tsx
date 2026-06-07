import { useAuth } from '../auth/AuthContext';
import { BrandLogo } from '@shared/BrandLogo';

interface Props {
  archiveMode: boolean;
  unreadTotal: number;
  onToggleArchive: () => void;
}

export default function OfficeHeader({ archiveMode, unreadTotal, onToggleArchive }: Props) {
  const { user, logout } = useAuth();
  return (
    <header className="enterprise-office-header mx-4 mt-3 mb-0 px-4 py-3 flex items-center justify-between shrink-0">
      <BrandLogo product="control" size="md" variant="dark" />
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
          <div className="flex items-center gap-2 pl-2 ml-1 border-l border-[var(--border)]">
            <span className="text-[11px] text-[var(--muted)] tabular-nums font-medium">
              {user.username}
            </span>
            <button onClick={e => { e.stopPropagation(); logout(); }}
              className="text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              title={`Sign out ${user.username}`}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
