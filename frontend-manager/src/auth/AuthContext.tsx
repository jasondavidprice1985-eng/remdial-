import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiFetch, clearAuthToken, getAuthToken, setAuthToken, setUnauthorizedHandler } from './apiClient';

interface User {
  username: string;
  role: 'manager' | 'office';
  displayName: string;
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  loading: boolean;
  mustChangePassword: boolean;
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

function decodeJwt(token: string): { exp?: number; username?: string; role?: string } | null {
  try {
    const part = token.split('.')[1];
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    const stored = getAuthToken();
    if (stored) {
      const payload = decodeJwt(stored);
      if (payload?.exp && payload.exp * 1000 > Date.now() && payload.username && payload.role) {
        setToken(stored);
        setUser({ username: payload.username, role: payload.role as 'manager' | 'office', displayName: payload.username });
      } else {
        clearAuthToken();
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
      setMustChangePassword(false);
    });
  }, []);

  async function login(username: string, password: string, remember: boolean): Promise<void> {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, remember }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Invalid username or password');
    }
    const data = await res.json();
    const payload = decodeJwt(data.token);
    setAuthToken(data.token);
    setToken(data.token);
    setUser({
      username: payload?.username || username,
      role: data.role,
      displayName: data.display_name || username,
    });
    if (data.must_change_password) {
      setMustChangePassword(true);
    }
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await apiFetch('/users/me/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Password change failed');
    }
    setMustChangePassword(false);
  }

  function logout(): void {
    clearAuthToken();
    setToken(null);
    setUser(null);
    setMustChangePassword(false);
  }

  return <Ctx.Provider value={{ user, token, loading, mustChangePassword, login, changePassword, logout }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
