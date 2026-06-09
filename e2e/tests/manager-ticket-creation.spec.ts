import { test, expect } from '@playwright/test';
import { loginAsManager } from '../helpers/auth';
import { cleanTickets } from '../helpers/db';

test.describe('Manager — Ticket Creation', () => {
  const TEST_DEV = 'E2E Test Developer';
  const TEST_SITE = 'E2E Test Site';
  const TEST_PLOT = 'E2E-001';

  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
  });

  test.afterEach(async () => {
    await cleanTickets();
  });

  test('shows ticket form on New Remedial tab', async ({ page }) => {
    // Click "New Remedial" tab
    await page.getByRole('button', { name: /new remedial/i }).click();
    await expect(page.getByRole('heading', { name: /new report/i })).toBeVisible();
    // Should have inputs for developer, site, plot number
    await expect(page.getByPlaceholder(/developer/i)).toBeVisible();
    await expect(page.getByPlaceholder(/site/i)).toBeVisible();
    await expect(page.getByPlaceholder(/plot number/i)).toBeVisible();
  });

  test('creates a ticket with required fields', async ({ page }) => {
    // Navigate to the new report tab
    await page.getByRole('button', { name: /new remedial/i }).click();
    await page.waitForLoadState('networkidle');

    // Fill location section
    await page.getByPlaceholder(/developer/i).fill(TEST_DEV);
    await page.getByPlaceholder(/site/i).fill(TEST_SITE);
    await page.getByPlaceholder(/plot number/i).fill(TEST_PLOT);

    // Add a line item — tap the first item row (shows "Tap to add")
    const addItemBtn = page.getByRole('button', { name: /tap to add/i });
    await addItemBtn.click();

    // The LineItemSheet modal appears
    await expect(page.getByRole('heading', { name: /item 1/i })).toBeVisible();

    // Fill description
    await page.getByPlaceholder(/e\.?g\.?/i).fill('Test missing hinge');
    // Set reason — click "Missing / Omission" button
    await page.getByRole('button', { name: /missing \/ omission/i }).click();
    // Click Save
    await page.getByRole('button', { name: /save/i }).click();
    // Wait for modal to close
    await expect(page.getByRole('heading', { name: /item 1/i })).not.toBeVisible();

    // Set delivery — "Next Delivery" should be available
    await page.getByRole('button', { name: /next delivery/i }).click();

    // Submit the form — the Submit Report button should be enabled
    const submitBtn = page.getByRole('button', { name: /submit report/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // After submission the app should show the reports tab with the new ticket
    // Wait for the success banner or ticket to appear
    await expect(page.getByText(/submitted/i).or(page.getByText(TEST_PLOT))).toBeVisible({ timeout: 15000 });

    // The ticket ref should appear in the reports list
    await expect(page.getByText(TEST_DEV).or(page.getByText(TEST_SITE))).toBeVisible();
  });

  test('shows validation state before form is complete', async ({ page }) => {
    await page.getByRole('button', { name: /new remedial/i }).click();

    // Submit button should be disabled initially (before any fields filled)
    const submitBtn = page.getByRole('button', { name: /submit report/i });
    await expect(submitBtn).toBeDisabled();

    // Fill location only (no items, no delivery) — still disabled
    await page.getByPlaceholder(/developer/i).fill('Dev');
    await page.getByPlaceholder(/site/i).fill('Site');
    await page.getByPlaceholder(/plot number/i).fill('P1');
    await expect(submitBtn).toBeDisabled();
  });
});
