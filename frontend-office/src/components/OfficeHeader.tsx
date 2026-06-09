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
    <header className="px-6 h-[60px] flex items-center justify-between shrink-0 border-b border-[var(--border)] bg-[var(--surface)]">
      <BrandLogo product="control" size="md" variant="dark" />
      <div className="flex items-center gap-4">
        {unreadTotal > 0 && (
          <span className="text-[12px] font-medium text-[var(--query)] inline-flex items-center gap-1.5">
            <span className="w-[5px] h-[5px] rounded-full bg-[var(--query)]" />
            {unreadTotal} new msg{unreadTotal > 1 ? 's' : ''}
          </span>
        )}
        <button onClick={e => { e.stopPropagation(); onToggleArchive(); }}
          className="text-[12.5px] font-medium px-3 h-8 rounded-md transition-colors border"
          style={{
            color: archiveMode ? '#fff' : 'var(--text)',
            background: archiveMode ? 'var(--text)' : 'var(--surface)',
            borderColor: archiveMode ? 'var(--text)' : 'var(--border)',
          }}>
          {archiveMode ? 'Active' : 'Archive'}
        </button>
        {user && (
          <div className="flex items-center gap-3 pl-4 border-l border-[var(--border)]">
            <span className="text-[12px] text-[var(--subtle)] tabular-nums font-medium">
              {user.username}
            </span>
            <button onClick={e => { e.stopPropagation(); logout(); }}
              className="text-[12px] font-medium text-[var(--subtle)] hover:text-[var(--text)] transition-colors"
              title={`Sign out ${user.username}`}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
