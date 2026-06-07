import { useState, FormEvent } from 'react';
import { useAuth } from './AuthContext';
import { EnterpriseLoginLayout } from '@shared/EnterpriseLoginLayout';

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
    <EnterpriseLoginLayout product="control">
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-[var(--muted)] tracking-wider uppercase">Username</span>
          <input className="input-field" autoComplete="username" autoFocus
            value={username} onChange={e => setUsername(e.target.value)} disabled={submitting} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-[var(--muted)] tracking-wider uppercase">Password</span>
          <input type="password" className="input-field" autoComplete="current-password"
            value={password} onChange={e => setPassword(e.target.value)} disabled={submitting} />
        </label>
        <label className="flex items-center gap-2.5 text-sm text-[var(--text)]">
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} disabled={submitting}
            className="rounded border-[var(--border)]" />
          <span>Keep me signed in</span>
        </label>
        {error && (
          <p className="text-sm rounded-lg px-3 py-2.5 border border-red-200 bg-red-50 text-red-800">{error}</p>
        )}
        <button type="submit" disabled={!canSubmit}
          className="btn-enterprise w-full flex items-center justify-center gap-2">
          {submitting && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </EnterpriseLoginLayout>
  );
}
