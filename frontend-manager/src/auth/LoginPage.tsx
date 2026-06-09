import { useState, FormEvent } from 'react';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
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
    <div className="app-fieldrem min-h-screen bg-[var(--surface)] text-[var(--text)] flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="px-6 pt-4 pb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[12px] text-[var(--subtle)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ordered)]"
            style={{ animation: 'query-pulse 2s infinite' }} />
          Connected
        </span>
        <span className="font-mono text-[12px] text-[var(--faint)]">v 2.4.1</span>
      </div>

      <main className="flex-1 px-6 pt-6">
        <div className="w-10 h-10 rounded-[8px] bg-[var(--text)] text-white grid place-items-center text-[16px] font-semibold mb-8">
          R
        </div>

        <h1 className="text-[28px] leading-[1.15] font-semibold tracking-[-0.025em] mb-2">
          Sign in to the<br />site account.
        </h1>
        <p className="text-[14px] text-[var(--subtle)] mb-10">
          Manager account, used by everyone on site.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="block mb-5">
            <span className="block text-[12.5px] font-medium text-[var(--text)] mb-[7px]">Username</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={submitting}
              autoComplete="username"
              autoFocus
              className="w-full h-12 px-3.5 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] text-[16px] text-[var(--text)] outline-none focus:border-[var(--text)] transition-colors disabled:opacity-60"
            />
          </label>

          <label className="block mb-2.5">
            <span className="block text-[12.5px] font-medium text-[var(--text)] mb-[7px]">Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={submitting}
              autoComplete="current-password"
              className="w-full h-12 px-3.5 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] text-[16px] text-[var(--text)] outline-none focus:border-[var(--text)] transition-colors disabled:opacity-60"
            />
          </label>

          <div className="flex justify-end mb-6">
            <button type="button" className="text-[13px] text-[var(--text)] border-b border-[var(--border-strong)] hover:border-[var(--text)]">
              Forgot password?
            </button>
          </div>

          {error && (
            <p className="mb-4 text-[13px] text-[var(--query)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-12 rounded-lg bg-[var(--text)] text-white text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50"
          >
            {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <label className="mt-5 flex items-center justify-center gap-2 text-[13px] text-[var(--muted)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              disabled={submitting}
              className="w-4 h-4 rounded-sm border-[var(--border-strong)] accent-[var(--text)]"
            />
            Keep me signed in
          </label>
        </form>
      </main>

      <footer className="px-6 pb-6 pt-4 text-center text-[13px] text-[var(--subtle)]"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        Office team? <button type="button" className="text-[var(--text)] font-medium border-b border-[var(--border-strong)]">Open desktop console</button>
      </footer>
    </div>
  );
}
