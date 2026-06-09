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
    <div className="app-office min-h-screen flex flex-col bg-[var(--surface)] text-[var(--text)]">
      <header className="px-10 py-6 flex items-center justify-between border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-[5px] bg-[var(--text)] text-white grid place-items-center text-[12px] font-semibold">R</div>
          <div className="leading-tight">
            <div className="text-[13.5px] font-semibold tracking-tight">Remedial</div>
            <div className="text-[11px] text-[var(--subtle)]">Office console</div>
          </div>
        </div>
        <span className="font-mono text-[12px] text-[var(--faint)]">v 2.4.1</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-10">
        <form onSubmit={handleSubmit} className="w-[380px]">
          <h1 className="text-[30px] font-semibold tracking-[-0.028em] mb-2">Sign in</h1>
          <p className="text-[14px] text-[var(--subtle)] mb-10">Office team account.</p>

          <label className="block mb-[18px]">
            <span className="block text-[12.5px] font-medium text-[var(--text)] mb-[7px]">Username</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={submitting}
              autoComplete="username"
              autoFocus
              className="w-full h-11 px-3.5 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] text-[15px] text-[var(--text)] outline-none focus:border-[var(--text)] transition-colors disabled:opacity-60"
            />
          </label>

          <label className="block mb-[18px]">
            <span className="block text-[12.5px] font-medium text-[var(--text)] mb-[7px]">Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={submitting}
              autoComplete="current-password"
              className="w-full h-11 px-3.5 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] text-[15px] text-[var(--text)] outline-none focus:border-[var(--text)] transition-colors disabled:opacity-60"
            />
          </label>

          <div className="flex items-center justify-between mt-1.5 mb-6">
            <label className="flex items-center gap-2 text-[13px] text-[var(--muted)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                disabled={submitting}
                className="w-4 h-4 rounded-sm border-[var(--border-strong)] accent-[var(--text)]"
              />
              Keep me signed in
            </label>
            <button type="button" className="text-[13px] text-[var(--text)] border-b border-[var(--border-strong)] hover:border-[var(--text)]">
              Forgot password?
            </button>
          </div>

          {error && (
            <p className="mb-4 text-[13px] text-[var(--query)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-[46px] rounded-md bg-[var(--text)] text-white text-[14.5px] font-semibold flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50"
          >
            {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </main>

      <footer className="px-10 py-4 flex items-center justify-between border-t border-[var(--border)] text-[12px] text-[var(--subtle)] shrink-0">
        <span className="inline-flex items-center gap-2 text-[11.5px]">
          <span className="relative inline-block w-1.5 h-1.5 rounded-full bg-[var(--ordered)]" style={{ boxShadow: '0 0 0 0 rgba(21,128,61,0.4)', animation: 'query-pulse 2s infinite' }} />
          All systems operational
        </span>
        <div className="flex gap-[22px]">
          <a href="#" className="text-[var(--subtle)] hover:text-[var(--text)]">Privacy</a>
          <a href="#" className="text-[var(--subtle)] hover:text-[var(--text)]">Terms</a>
          <a href="#" className="text-[var(--subtle)] hover:text-[var(--text)]">Support</a>
        </div>
      </footer>
    </div>
  );
}
