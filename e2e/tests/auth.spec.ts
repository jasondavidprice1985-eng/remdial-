import { test, expect } from '@playwright/test';
import { loginAsOffice, loginAsManager, clearAuth } from '../helpers/auth';

test.describe('Office — Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
    await page.goto('/');
  });

  test('shows login page when unauthenticated', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /office dashboard/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /username/i })).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('logs in with valid credentials', async ({ page }) => {
    await loginAsOffice(page);
    // After login, the OfficeHeader component should show (no login form)
    await expect(page.getByRole('textbox', { name: /username/i })).not.toBeVisible();
  });

  test('shows error with invalid credentials', async ({ page }) => {
    await page.getByRole('textbox', { name: /username/i }).fill('wrong');
    await page.getByLabel(/password/i).fill('wrong');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid/i).or(page.getByText(/error/i))).toBeVisible();
  });

  test('redirects to login when token is cleared', async ({ page }) => {
    await loginAsOffice(page);
    // Token is now stored; clear it
    await clearAuth(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /office dashboard/i })).toBeVisible();
  });
});

test.describe('Manager — Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
    await page.goto('/');
  });

  test('shows login page when unauthenticated', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /fieldrem/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /username/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('logs in with valid credentials', async ({ page }) => {
    await loginAsManager(page);
    // After login, the tab bar or ticket form should appear
    await expect(page.getByText(/new remedial/i).or(page.getByText(/reports/i))).toBeVisible();
  });

  test('shows error with invalid credentials', async ({ page }) => {
    await page.getByRole('textbox', { name: /username/i }).fill('wrong');
    await page.getByLabel(/password/i).fill('wrong');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid/i).or(page.getByText(/error/i))).toBeVisible();
  });

  test('redirects to login when token is cleared', async ({ page }) => {
    await loginAsManager(page);
    await clearAuth(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});
