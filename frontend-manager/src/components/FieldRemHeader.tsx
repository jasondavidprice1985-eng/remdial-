import { useAuth } from '../auth/AuthContext';

export default function FieldRemHeader() {
  const { user, logout } = useAuth();
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
          <button onClick={logout}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
            title={`Signed in as ${user.username}`}>
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
