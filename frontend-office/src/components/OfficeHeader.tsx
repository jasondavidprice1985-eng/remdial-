import { useAuth } from '../auth/AuthContext';

interface Props {
  archiveMode: boolean;
  unreadTotal: number;
  onToggleArchive: () => void;
  isAdmin?: boolean;
  adminMode?: boolean;
  onToggleAdmin?: () => void;
}

export default function OfficeHeader({ archiveMode, unreadTotal, onToggleArchive, isAdmin, adminMode, onToggleAdmin }: Props) {
  const { user, logout } = useAuth();
  return (
    <header className="px-6 h-[68px] flex items-center justify-between shrink-0 border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--text)] text-white grid place-items-center text-[16px] font-bold shrink-0">
          R
        </div>
        <div>
          <h1 className="text-[17px] font-semibold tracking-[-0.015em] text-[var(--text)] m-0 leading-tight">Remedial</h1>
          <p className="text-[12px] text-[var(--ordered)] m-0 mt-0.5 inline-flex items-center gap-1.5 font-medium">
            <span className="w-[5px] h-[5px] rounded-full bg-[var(--ordered)]" />
            Operations Control
          </p>
        </div>
      </div>
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
        {isAdmin && onToggleAdmin && (
          <button onClick={e => { e.stopPropagation(); onToggleAdmin(); }}
            className="text-[12.5px] font-medium px-3 h-8 rounded-md transition-colors border"
            style={{
              color: adminMode ? '#fff' : 'var(--text)',
              background: adminMode ? '#0f7a3a' : 'var(--surface)',
              borderColor: adminMode ? '#0f7a3a' : 'var(--border)',
            }}>
            {adminMode ? 'Back' : 'Admin'}
          </button>
        )}
        {user && (
          <button onClick={e => { e.stopPropagation(); logout(); }}
            className="ml-2 flex items-center gap-2 h-8 px-3 rounded-md text-[12px] font-medium text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
            title={`Sign out ${user.username}`}>
            <span className="w-5 h-5 rounded-full bg-[var(--text)] text-white grid place-items-center text-[10px] font-semibold">
              {(user.displayName || user.username).charAt(0).toUpperCase()}
            </span>
            <span>{user.displayName}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--subtle)]">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
