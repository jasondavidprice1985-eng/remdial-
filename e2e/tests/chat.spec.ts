import { test, expect, Page } from '@playwright/test';
import { loginAsOffice, loginAsManager } from '../helpers/auth';
import { seedTicket, cleanTickets } from '../helpers/db';

/**
 * Helper: office opens chat for a specific ticket.
 * Expects the office page to already be logged in.
 */
async function officeOpenChat(page: Page, ticketRef: string) {
  await page.waitForLoadState('networkidle');
  // Click the ticket in the queue
  await page.getByText(ticketRef).click();
  // Click the Messages button to open chat panel
  const msgBtn = page.getByRole('button', { name: /messages/i });
  if (await msgBtn.isVisible()) {
    await msgBtn.click();
  }
  // Chat panel should now be visible
  await expect(page.getByText(/messages/i).or(page.locator('textarea, input[type="text"]'))).toBeVisible({ timeout: 5000 });
}

/**
 * Helper: manager opens chat for a specific ticket (via TicketModal).
 */
async function managerOpenChat(page: Page, ticketRef: string) {
  await page.waitForLoadState('networkidle');
  // Click the ticket in the reports list
  await page.getByText(ticketRef).click();
  // The modal should open with the chat at the bottom
  await expect(page.getByRole('button', { name: /back/i })).toBeVisible({ timeout: 5000 });
}

test.describe('Chat — Office to Manager Communication', () => {
  let seededId: string;
  let seededRef: string;

  test.beforeEach(async () => {
    const seeded = await seedTicket({ status: 'pending' });
    seededId = seeded.id;
    seededRef = seeded.ref;
  });

  test.afterEach(async () => {
    await cleanTickets();
  });

  test('office can send a text message and manager can see it', async ({ browser }) => {
    // Create two separate pages: one for office (desktop), one for manager (mobile)
    const officeCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const managerCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });

    const officePage = await officeCtx.newPage();
    const managerPage = await managerCtx.newPage();

    try {
      // Both users log in
      await loginAsOffice(officePage);
      await loginAsManager(managerPage);

      // Office opens chat for the ticket
      await officeOpenChat(officePage, seededRef);

      // Type a message and send it
      const textArea = officePage.locator('textarea, input[type="text"]').first();
      await expect(textArea).toBeVisible({ timeout: 5000 });
      await textArea.fill('This item needs a replacement hinge');
      await textArea.press('Enter');

      // Wait for message to be sent
      await expect(officePage.getByText('This item needs a replacement hinge')).toBeVisible({ timeout: 10000 });

      // Manager should now see the message in their ticket modal
      await managerOpenChat(managerPage, seededRef);
      await expect(managerPage.getByText('This item needs a replacement hinge')).toBeVisible({ timeout: 10000 });

      // Manager can respond
      const managerTextArea = managerPage.locator('textarea, input[type="text"]').first();
      await expect(managerTextArea).toBeVisible({ timeout: 5000 });
      await managerTextArea.fill('Noted, will order one');
      await managerTextArea.press('Enter');

      // Both should see the response
      await expect(managerPage.getByText('Noted, will order one')).toBeVisible({ timeout: 10000 });

      // Office should also see the manager's reply
      // Check on the office page (may need to wait for socket event)
      await expect(officePage.getByText('Noted, will order one')).toBeVisible({ timeout: 10000 });

    } finally {
      await officeCtx.close();
      await managerCtx.close();
    }
  });

  test('chat with query flag triggers query status', async ({ browser }) => {
    const officeCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const managerCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });

    const officePage = await officeCtx.newPage();
    const managerPage = await managerCtx.newPage();

    try {
      await loginAsOffice(officePage);
      await loginAsManager(managerPage);

      // Open the ticket on office
      await officePage.waitForLoadState('networkidle');
      await officePage.getByText(seededRef).click();

      // Click "Needs Clarification" to send a query
      const flagBtn = officePage.getByRole('button', { name: /needs clarification/i });
      await expect(flagBtn).toBeVisible();
      await flagBtn.click();

      // The status should change to "query"
      await expect(officePage.getByText(/awaiting clarification/i).or(officePage.getByText(/query/i))).toBeVisible({ timeout: 10000 });

      // Manager should see the query status
      await managerOpenChat(managerPage, seededRef);
      await expect(managerPage.getByText(/needs clarification/i).or(managerPage.getByText(/office needs clarification/i))).toBeVisible({ timeout: 10000 });

    } finally {
      await officeCtx.close();
      await managerCtx.close();
    }
  });
});
