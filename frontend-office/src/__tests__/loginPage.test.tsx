import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../auth/AuthContext';
import LoginPage from '../auth/LoginPage';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
  });

  function renderPage() {
    return render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );
  }

  it('renders username, password, remember-me, and submit button', () => {
    renderPage();

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByText('Keep me signed in')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('submit button is disabled when username and password are empty', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });

  it('submit button is enabled when username and password are filled', async () => {
    renderPage();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
  });

  it('shows spinner during submission', async () => {
    // Keep fetch pending so submitting state remains
    mockFetch.mockImplementation(() => new Promise(() => {}));

    renderPage();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Signing in…')).toBeInTheDocument();
  });

  it('shows error message on failed login', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 })
    );

    renderPage();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('submit button is disabled after submission starts', async () => {
    // Keep fetch pending so submitting state remains
    mockFetch.mockImplementation(() => new Promise(() => {}));

    renderPage();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });

  it('renders sign-in heading', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /sign in to control/i })).toBeInTheDocument();
  });
});
