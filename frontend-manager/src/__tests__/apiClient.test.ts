import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  apiFetch,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  setUnauthorizedHandler,
} from '../auth/apiClient';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('apiClient', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
  });

  describe('localStorage helpers', () => {
    it('setAuthToken stores token in localStorage', () => {
      setAuthToken('test-token');
      expect(localStorage.getItem('auth_token')).toBe('test-token');
    });

    it('getAuthToken retrieves token from localStorage', () => {
      localStorage.setItem('auth_token', 'my-token');
      expect(getAuthToken()).toBe('my-token');
    });

    it('getAuthToken returns null when no token is stored', () => {
      expect(getAuthToken()).toBeNull();
    });

    it('clearAuthToken removes token from localStorage', () => {
      localStorage.setItem('auth_token', 'my-token');
      clearAuthToken();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('apiFetch', () => {
    it('sends Authorization: Bearer header when token exists', async () => {
      localStorage.setItem('auth_token', 'my-jwt');
      mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

      await apiFetch('/test');

      const [, init] = mockFetch.mock.calls[0];
      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toBe('Bearer my-jwt');
    });

    it('does not send Authorization header when no token', async () => {
      mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

      await apiFetch('/test');

      const [, init] = mockFetch.mock.calls[0];
      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toBeNull();
    });

    it('on 401 clears token and calls unauthorized handler', async () => {
      const handler = vi.fn();
      setUnauthorizedHandler(handler);
      localStorage.setItem('auth_token', 'my-jwt');
      mockFetch.mockResolvedValue(new Response(null, { status: 401 }));

      await apiFetch('/test');

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('passes through non-401 errors without clearing token', async () => {
      localStorage.setItem('auth_token', 'my-jwt');
      mockFetch.mockResolvedValue(new Response(null, { status: 500 }));

      const res = await apiFetch('/test');

      expect(res.status).toBe(500);
      expect(localStorage.getItem('auth_token')).toBe('my-jwt');
    });

    it('constructs URL using VITE_API_URL base', async () => {
      mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

      await apiFetch('/auth/login');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/v1/auth/login');
    });

    it('returns the Response object', async () => {
      const res = new Response('{"ok":true}', { status: 200 });
      mockFetch.mockResolvedValue(res);

      const result = await apiFetch('/test');

      expect(result).toBe(res);
    });
  });
});
