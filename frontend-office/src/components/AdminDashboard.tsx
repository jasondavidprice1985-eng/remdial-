import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../auth/apiClient';

interface User {
  id: string;
  username: string;
  display_name: string;
  role: string;
  active: boolean;
  must_change_password: boolean;
  created_at: string;
}

type Modal = null | 'add' | { type: 'edit'; user: User } | { type: 'reset'; user: User } | { type: 'deactivate'; user: User } | { type: 'reactivate'; user: User };

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<Modal>(null);

  const loadUsers = useCallback(async () => {
    try {
      const res = await apiFetch('/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        setError('Failed to load users');
      }
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const activeUsers = users.filter(u => u.active);
  const inactiveUsers = users.filter(u => !u.active);

  return (
    <div className="h-full flex flex-col">
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[20px] font-semibold text-[var(--text)]">User Management</h2>
          <button onClick={() => setModal('add')}
            className="text-[13px] font-semibold px-4 h-9 rounded-lg bg-[var(--text)] text-white hover:opacity-90 transition-opacity">
            + Add User
          </button>
        </div>
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-[13px] border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="w-6 h-6 border-2 border-stone-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Active Users */}
            <div className="mb-8">
              <h2 className="text-[13px] font-semibold text-[var(--subtle)] uppercase tracking-wider mb-3">
                Active Users ({activeUsers.length})
              </h2>
              <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                {activeUsers.length === 0 ? (
                  <p className="px-4 py-8 text-center text-[13px] text-[var(--subtle)]">No active users</p>
                ) : activeUsers.map((user, i) => (
                  <UserRow key={user.id} user={user} onEdit={() => setModal({ type: 'edit', user })}
                    onReset={() => setModal({ type: 'reset', user })}
                    onDeactivate={() => setModal({ type: 'deactivate', user })}
                    isLast={i === activeUsers.length - 1} />
                ))}
              </div>
            </div>

            {/* Inactive Users */}
            {inactiveUsers.length > 0 && (
              <div>
                <h2 className="text-[13px] font-semibold text-[var(--subtle)] uppercase tracking-wider mb-3">
                  Deactivated ({inactiveUsers.length})
                </h2>
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                  {inactiveUsers.map((user, i) => (
                    <UserRow key={user.id} user={user} inactive
                      onReactivate={() => setModal({ type: 'reactivate', user })}
                      isLast={i === inactiveUsers.length - 1} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {modal === 'add' && <AddUserModal onClose={() => setModal(null)} onDone={() => { setModal(null); loadUsers(); }} />}
      {modal && typeof modal === 'object' && modal.type === 'edit' && (
        <EditUserModal user={modal.user} onClose={() => setModal(null)} onDone={() => { setModal(null); loadUsers(); }} />
      )}
      {modal && typeof modal === 'object' && modal.type === 'reset' && (
        <ResetPasswordModal user={modal.user} onClose={() => setModal(null)} onDone={() => { setModal(null); loadUsers(); }} />
      )}
      {modal && typeof modal === 'object' && modal.type === 'deactivate' && (
        <ConfirmModal title="Deactivate User"
          message={`Are you sure you want to deactivate ${modal.user.display_name}? They will no longer be able to log in. This can be reversed.`}
          confirmLabel="Deactivate" confirmDanger
          onClose={() => setModal(null)}
          onConfirm={async () => {
            await apiFetch(`/users/${modal.user.id}`, { method: 'DELETE' });
            setModal(null); loadUsers();
          }} />
      )}
      {modal && typeof modal === 'object' && modal.type === 'reactivate' && (
        <ConfirmModal title="Reactivate User"
          message={`Reactivate ${modal.user.display_name}? They will be able to log in again.`}
          confirmLabel="Reactivate"
          onClose={() => setModal(null)}
          onConfirm={async () => {
            await apiFetch(`/users/${modal.user.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ active: true }),
            });
            setModal(null); loadUsers();
          }} />
      )}
    </div>
  );
}

/* ---- Sub-components ---- */

function UserRow({ user, inactive, isLast, onEdit, onReset, onDeactivate, onReactivate }: {
  user: User; inactive?: boolean; isLast: boolean;
  onEdit?: () => void; onReset?: () => void;
  onDeactivate?: () => void; onReactivate?: () => void;
}) {
  const roleBg = user.role === 'admin' ? 'bg-purple-100 text-purple-700'
    : user.role === 'manager' ? 'bg-blue-100 text-blue-700'
    : 'bg-green-100 text-green-700';

  return (
    <div className={`px-4 py-3.5 flex items-center gap-4 ${!isLast ? 'border-b border-[var(--border)]' : ''} ${inactive ? 'opacity-50' : ''}`}>
      <div className="w-9 h-9 rounded-full bg-stone-100 grid place-items-center text-[13px] font-semibold text-[var(--text)] shrink-0">
        {user.display_name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-[var(--text)] truncate">{user.display_name}</span>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${roleBg}`}>
            {user.role}
          </span>
          {user.must_change_password && (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              Must change password
            </span>
          )}
        </div>
        <span className="text-[12px] text-[var(--subtle)]">@{user.username}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!inactive && onEdit && (
          <button onClick={onEdit} className="text-[12px] font-medium text-[var(--subtle)] hover:text-[var(--text)] transition-colors px-2 py-1">
            Edit
          </button>
        )}
        {!inactive && onReset && (
          <button onClick={onReset} className="text-[12px] font-medium text-[var(--subtle)] hover:text-[var(--text)] transition-colors px-2 py-1">
            Reset PW
          </button>
        )}
        {!inactive && onDeactivate && (
          <button onClick={onDeactivate} className="text-[12px] font-medium text-red-500 hover:text-red-700 transition-colors px-2 py-1">
            Deactivate
          </button>
        )}
        {inactive && onReactivate && (
          <button onClick={onReactivate} className="text-[12px] font-medium text-[var(--ordered)] hover:opacity-80 transition-colors px-2 py-1">
            Reactivate
          </button>
        )}
      </div>
    </div>
  );
}

function AddUserModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'manager' | 'office' | 'admin'>('office');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!username.trim() || !password) { setError('Username and password are required'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      const res = await apiFetch('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, display_name: displayName.trim() || username.trim(), role }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Failed to create user');
      } else {
        onDone();
      }
    } catch { setError('Failed to create user'); }
    finally { setSaving(false); }
  }

  return (
    <ModalShell title="Add User" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Username" value={username} onChange={setUsername} placeholder="e.g. jsmith" />
        <Field label="Display Name" value={displayName} onChange={setDisplayName} placeholder="e.g. John Smith" />
        <Field label="Temporary Password" value={password} onChange={setPassword} placeholder="Min 8 characters" type="password" />
        <div>
          <label className="block text-[12px] font-semibold text-[var(--subtle)] uppercase tracking-wider mb-1.5">Role</label>
          <div className="flex gap-2">
            {(['manager', 'office', 'admin'] as const).map(r => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg border transition-colors ${
                  role === r ? 'bg-[var(--text)] text-white border-[var(--text)]' : 'bg-[var(--surface)] text-[var(--subtle)] border-[var(--border)]'
                }`}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-[var(--subtle)]">User will be asked to change their password on first login.</p>
        {error && <p className="text-[12px] text-red-600">{error}</p>}
        <button onClick={handleSubmit} disabled={saving}
          className="w-full py-3 text-[14px] font-semibold rounded-lg bg-[var(--text)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
          {saving ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </ModalShell>
  );
}

function EditUserModal({ user, onClose, onDone }: { user: User; onClose: () => void; onDone: () => void }) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [role, setRole] = useState(user.role);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError('');
    setSaving(true);
    try {
      const res = await apiFetch(`/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName.trim(), role }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Failed to update user');
      } else {
        onDone();
      }
    } catch { setError('Failed to update user'); }
    finally { setSaving(false); }
  }

  return (
    <ModalShell title={`Edit ${user.display_name}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Display Name" value={displayName} onChange={setDisplayName} />
        <div>
          <label className="block text-[12px] font-semibold text-[var(--subtle)] uppercase tracking-wider mb-1.5">Role</label>
          <div className="flex gap-2">
            {(['manager', 'office', 'admin'] as const).map(r => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg border transition-colors ${
                  role === r ? 'bg-[var(--text)] text-white border-[var(--text)]' : 'bg-[var(--surface)] text-[var(--subtle)] border-[var(--border)]'
                }`}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-[12px] text-red-600">{error}</p>}
        <button onClick={handleSubmit} disabled={saving}
          className="w-full py-3 text-[14px] font-semibold rounded-lg bg-[var(--text)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </ModalShell>
  );
}

function ResetPasswordModal({ user, onClose, onDone }: { user: User; onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      const res = await apiFetch(`/users/${user.id}/reset-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Failed to reset password');
      } else {
        onDone();
      }
    } catch { setError('Failed to reset password'); }
    finally { setSaving(false); }
  }

  return (
    <ModalShell title={`Reset Password — ${user.display_name}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-[13px] text-[var(--subtle)]">Set a temporary password. {user.display_name} will be asked to change it on next login.</p>
        <Field label="New Temporary Password" value={password} onChange={setPassword} placeholder="Min 8 characters" type="password" />
        {error && <p className="text-[12px] text-red-600">{error}</p>}
        <button onClick={handleSubmit} disabled={saving}
          className="w-full py-3 text-[14px] font-semibold rounded-lg bg-[var(--text)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
          {saving ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </ModalShell>
  );
}

function ConfirmModal({ title, message, confirmLabel, confirmDanger, onClose, onConfirm }: {
  title: string; message: string; confirmLabel: string; confirmDanger?: boolean;
  onClose: () => void; onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-[13px] text-[var(--text)] leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-[13px] font-semibold rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-stone-50 transition-colors">
            Cancel
          </button>
          <button onClick={async () => { setLoading(true); await onConfirm(); }} disabled={loading}
            className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg text-white transition-opacity disabled:opacity-50 ${
              confirmDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-[var(--text)] hover:opacity-90'
            }`}>
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---- Shared helpers ---- */

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-[var(--surface)] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-[var(--text)]">{title}</h2>
          <button onClick={onClose} className="text-[var(--subtle)] hover:text-[var(--text)] text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-[var(--subtle)] uppercase tracking-wider mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:border-[var(--text)] transition-colors" />
    </div>
  );
}
