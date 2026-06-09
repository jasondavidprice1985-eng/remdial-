import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../auth/AuthContext';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeToken(overrides: Record<string, unknown>): string {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 3600,
    username: 'testuser',
    role: 'office',
    ...overrides,
  };
  const header = btoa(JSON.stringify({ alg: 'HS256' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

function TestComponent() {
  const auth = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);

  async function handleLogin() {
    setLoginError(null);
    try {
      await auth.login('user', 'pass', false);
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : 'error');
    }
  }

  async function handleLoginRemember() {
    setLoginError(null);
    try {
      await auth.login('user', 'pass', true);
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : 'error');
    }
  }

  return (
    <div>
      <div data-testid="loading">{String(auth.loading)}</div>
      <div data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</div>
      <div data-testid="token">{auth.token ?? 'null'}</div>
      <div data-testid="login-error">{loginError ?? 'none'}</div>
      <button data-testid="btn-login" onClick={handleLogin}>
        Login
      </button>
      <button data-testid="btn-login-remember" onClick={handleLoginRemember}>
        Login Remember
      </button>
      <button data-testid="btn-logout" onClick={auth.logout}>
        Logout
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
  });

  it('reads token from localStorage on mount and sets user state', async () => {
    const token = makeToken({});
    localStorage.setItem('auth_token', token);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('token')).toHaveTextContent(token);
    expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    expect(screen.getByTestId('user')).toHaveTextContent('office');
  });

  it('clears expired token from localStorage on mount', async () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) - 3600 });
    localStorage.setItem('auth_token', token);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('login calls apiFetch with correct URL and body, stores token on success', async () => {
    const token = makeToken({});
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ token, role: 'office' }), { status: 200 })
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByTestId('btn-login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toHaveTextContent('none');
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/auth/login');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      username: 'user',
      password: 'pass',
      remember: false,
    });
    expect(localStorage.getItem('auth_token')).toBe(token);
    expect(screen.getByTestId('token')).toHaveTextContent(token);
    expect(screen.getByTestId('user')).toHaveTextContent('office');
  });

  it('login with remember: true sends the flag', async () => {
    const token = makeToken({});
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ token, role: 'office' }), { status: 200 })
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByTestId('btn-login-remember').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toHaveTextContent('none');
    });

    const [, init] = mockFetch.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      username: 'user',
      password: 'pass',
      remember: true,
    });
  });

  it('login on 401 throws error, token not stored', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 })
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByTestId('btn-login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('login-error')).not.toHaveTextContent('none');
    });

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('logout clears token and user state', async () => {
    const token = makeToken({});
    localStorage.setItem('auth_token', token);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('token')).toHaveTextContent(token);

    await act(async () => {
      screen.getByTestId('btn-logout').click();
    });

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('loading state is false after mount', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
  });
});
