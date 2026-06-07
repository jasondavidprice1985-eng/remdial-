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
    <div className="app-fieldrem min-h-screen mesh-bg flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="card p-6 w-full max-w-sm space-y-4 animate-slide-up">
        <div>
          <h1 className="text-xl font-bold">FieldRem</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Sign in to continue</p>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-[var(--muted)] tracking-wider uppercase">Username</span>
          <input className="input-field" autoComplete="username" autoFocus
            value={username} onChange={e => setUsername(e.target.value)} disabled={submitting} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-[var(--muted)] tracking-wider uppercase">Password</span>
          <input type="password" className="input-field" autoComplete="current-password"
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
          className="btn-accent w-full flex items-center justify-center gap-2">
          {submitting && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
