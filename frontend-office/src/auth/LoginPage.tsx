import { useState, FormEvent } from 'react';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password, remember);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setSubmitting(false);
    }
  }

  return (
    <div className="app-office h-screen flex items-center justify-center office-bg p-4">
      <form onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-[var(--border)] rounded-2xl shadow-lg p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Office Dashboard</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Sign in to continue</p>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-[var(--muted)] tracking-wider uppercase">Username</span>
          <input className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-blue-200"
            autoComplete="username" autoFocus
            value={username} onChange={e => setUsername(e.target.value)} disabled={submitting} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-[var(--muted)] tracking-wider uppercase">Password</span>
          <input type="password"
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-blue-200"
            autoComplete="current-password"
            value={password} onChange={e => setPassword(e.target.value)} disabled={submitting} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} disabled={submitting} />
          <span>Remember me</span>
        </label>
        {error && (
          <p className="text-sm rounded-lg px-3 py-2 border border-red-200 bg-red-50 text-red-800">{error}</p>
        )}
        <button type="submit" disabled={!canSubmit}
          className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2">
          {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
