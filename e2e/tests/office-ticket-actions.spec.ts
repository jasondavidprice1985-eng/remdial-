import { test, expect } from '@playwright/test';
import { loginAsOffice } from '../helpers/auth';
import { seedTicket, cleanTickets } from '../helpers/db';

test.describe('Office — Ticket Actions', () => {
  let ticketId: string;
  let ticketRef: string;

  test.beforeEach(async ({ page }) => {
    // Seed a fresh pending ticket for each test
    const seeded = await seedTicket({ status: 'pending' });
    ticketId = seeded.id;
    ticketRef = seeded.ref;
    await loginAsOffice(page);
  });

  test.afterEach(async () => {
    await cleanTickets();
  });

  test('displays seeded tickets in the queue', async ({ page }) => {
    // The office dashboard loads tickets from the API
    await page.waitForLoadState('networkidle');
    // The queue should contain the seeded ticket
    await expect(page.getByText(ticketRef)).toBeVisible({ timeout: 10000 });
  });

  test('selects a ticket and shows details panel', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    // Click the ticket row
    const ticketRow = page.getByText(ticketRef);
    await ticketRow.click();

    // The details panel should show ticket info
    await expect(page.getByText(/developer/i).or(page.getByText(/site/i))).toBeVisible();
    // Status stepper should be visible
    await expect(page.getByText(/logged/i)).toBeVisible();
    await expect(page.getByText(/accepted/i)).toBeVisible();
  });

  test('accepts a pending ticket', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Select the ticket
    await page.getByText(ticketRef).click();

    // The "Accept Ticket" button should be visible for pending unaccepted tickets
    const acceptBtn = page.getByRole('button', { name: /accept ticket/i });
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    // After accepting, the status stepper should show "Accepted"
    await expect(page.getByText(/accepted/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('marks a ticket as query (needs clarification)', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Select the ticket
    await page.getByText(ticketRef).click();

    // Click "Needs Clarification"
    const flagBtn = page.getByRole('button', { name: /needs clarification/i });
    await expect(flagBtn).toBeVisible();
    await flagBtn.click();

    // After flagging, the ticket should show query status
    await expect(page.getByText(/awaiting clarification/i).or(page.getByText(/query/i))).toBeVisible({ timeout: 10000 });
  });

  test('places an order on an accepted ticket', async ({ page }) => {
    // First accept the ticket
    await page.waitForLoadState('networkidle');
    await page.getByText(ticketRef).click();
    await page.getByRole('button', { name: /accept ticket/i }).click();
    await page.waitForTimeout(500);

    // The order form should now appear
    const orderInput = page.getByPlaceholder(/order number/i);
    await expect(orderInput).toBeVisible({ timeout: 10000 });

    // Fill in PO number and date
    await orderInput.fill('PO-E2E-001');
    const dateInput = page.locator('input[type="date"]');
    if (await dateInput.isVisible()) {
      await dateInput.fill('2026-06-15');
    }

    // Click "Mark ordered"
    await page.getByRole('button', { name: /mark ordered/i }).click();

    // After ordering, the "Ordered" step should show
    await expect(page.getByText(/ordered/i).first()).toBeVisible({ timeout: 10000 });
  });
});
