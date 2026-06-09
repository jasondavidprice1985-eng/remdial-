import { Page } from '@playwright/test';

/**
 * Navigate to the office login page and sign in with given credentials.
 * Assumes page is already on the office baseURL.
 */
export async function loginAsOffice(
  page: Page,
  username = 'office',
  password = 'office',
): Promise<void> {
  // If already logged in (token in storage), the login page won't show.
  // Navigate to clear any existing session.
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Check if we're already on the dashboard (already logged in)
  const loginForm = page.getByRole('heading', { name: /sign in/i });
  if (!(await loginForm.isVisible().catch(() => false))) {
    return; // already authenticated
  }

  await page.getByRole('textbox', { name: /username/i }).fill(username);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for navigation to dashboard — "Office Dashboard" heading disappears,
  // the kanban board appears
  await page.waitForURL('**/');
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to the manager login page and sign in with given credentials.
 */
export async function loginAsManager(
  page: Page,
  username = 'manager',
  password = 'manager',
): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Check if already logged in
  const heading = page.getByRole('heading', { name: /fieldrem/i });
  if (await heading.isVisible().catch(() => false)) {
    const signInBtn = page.getByRole('button', { name: /sign in/i });
    if (!(await signInBtn.isVisible().catch(() => false))) {
      return; // already authenticated
    }
  }

  await page.getByRole('textbox', { name: /username/i }).fill(username);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for the app to load (ticket form or ticket list)
  await page.waitForURL('**/');
  await page.waitForLoadState('networkidle');
}

/**
 * Clear auth token from localStorage to force logout on both apps.
 */
export async function clearAuth(page: Page): Promise<void> {
  // localStorage isn't accessible on about:blank; navigate to the app origin first.
  if (!page.url().startsWith('http')) {
    await page.goto('/');
  }
  await page.evaluate(() => localStorage.removeItem('auth_token'));
}
