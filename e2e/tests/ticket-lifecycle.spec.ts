import { test, expect, type Page, type Dialog, type BrowserContext } from '@playwright/test';
import { loginAsOffice, loginAsManager } from '../helpers/auth';
import { cleanTickets } from '../helpers/db';

/**
 * Full end-to-end ticket lifecycle test:
 *
 *   Manager submits a new ticket
 *   → Office sees it in the inbox
 *   → Office accepts the ticket
 *   → Office flags it as needing clarification (query)
 *   → Manager sees the query and responds via chat
 *   → Office marks as clarified
 *   → Office places an order
 *   → Manager confirms fitted (archive)
 *
 * This test runs in the "cross-context" project using two browser contexts.
 */

const TEST_DEV = 'Lifecycle Dev';
const TEST_SITE = 'Lifecycle Site';
const TEST_PLOT = 'LC-001';

async function managerCreateTicket(page: Page): Promise<string> {
  await page.getByRole('button', { name: /new remedial/i }).click();
  await page.waitForLoadState('networkidle');

  // Fill location
  await page.getByPlaceholder(/developer/i).fill(TEST_DEV);
  await page.getByPlaceholder(/site/i).fill(TEST_SITE);
  await page.getByPlaceholder(/plot number/i).fill(TEST_PLOT);

  // Add line item
  await page.getByRole('button', { name: /tap to add/i }).click();
  await expect(page.getByRole('heading', { name: /item 1/i })).toBeVisible();
  await page.getByPlaceholder(/e\.?g\.?/i).fill('Replacement door hinge');
  await page.getByRole('button', { name: /missing \/ omission/i }).click();
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByRole('heading', { name: /item 1/i })).not.toBeVisible();

  // Set delivery
  await page.getByRole('button', { name: /next delivery/i }).click();

  // Submit
  await page.getByRole('button', { name: /submit report/i }).click();

  // Wait for submission to complete and get the ticket ref
  await expect(page.getByText(/submitted/i).or(page.getByText(TEST_PLOT))).toBeVisible({ timeout: 15000 });

  return TEST_PLOT; // We'll use plot number to identify the ticket
}

test.describe('Full Ticket Lifecycle (E2E)', () => {
  let managerCtx: BrowserContext;
  let officeCtx: BrowserContext;

  test.afterEach(async () => {
    await cleanTickets();
    if (managerCtx) await managerCtx.close().catch(() => {});
    if (officeCtx) await officeCtx.close().catch(() => {});
  });

  test('complete lifecycle: create → accept → query → respond → clarify → order → archive', async ({ browser }) => {
    // Set up two browser contexts
    managerCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    officeCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    const managerPage = await managerCtx.newPage();
    const officePage = await officeCtx.newPage();

    // ── Step 0: Both users log in ─────────────────────────────────
    await loginAsManager(managerPage);
    await loginAsOffice(officePage);

    // ── Step 1: Manager creates a ticket ──────────────────────────
    await managerCreateTicket(managerPage);
    console.log('[LIFECYCLE] Ticket created by manager');

    // ── Step 2: Office sees the ticket in the queue ───────────────
    await officePage.waitForLoadState('networkidle');
    await expect(officePage.getByText(TEST_PLOT)).toBeVisible({ timeout: 15000 });
    console.log('[LIFECYCLE] Office sees the new ticket');

    // ── Step 3: Office selects and accepts the ticket ─────────────
    await officePage.getByText(TEST_PLOT).click();

    // Accept
    const acceptBtn = officePage.getByRole('button', { name: /accept ticket/i });
    await expect(acceptBtn).toBeVisible({ timeout: 5000 });
    await acceptBtn.click();
    await expect(officePage.getByText(/accepted/i).first()).toBeVisible({ timeout: 10000 });
    console.log('[LIFECYCLE] Office accepted the ticket');

    // ── Step 4: Office flags as query (needs clarification) ───────
    await officePage.getByRole('button', { name: /needs clarification/i }).click();
    await expect(officePage.getByText(/awaiting clarification/i).or(officePage.getByText(/query/i))).toBeVisible({ timeout: 10000 });
    console.log('[LIFECYCLE] Office flagged the ticket as query');

    // ── Step 5: Manager sees query and responds via chat ──────────
    // Manager opens the ticket
    await managerPage.waitForLoadState('networkidle');
    await managerPage.getByText(TEST_PLOT).click();
    await expect(managerPage.getByRole('button', { name: /back/i })).toBeVisible({ timeout: 5000 });

    // Type a response in the chat
    const managerChatInput = managerPage.locator('textarea, input[type="text"]').first();
    await expect(managerChatInput).toBeVisible({ timeout: 5000 });
    await managerChatInput.fill('The hinge is on order, should arrive Friday');
    await managerChatInput.press('Enter');
    await expect(managerPage.getByText('The hinge is on order, should arrive Friday')).toBeVisible({ timeout: 10000 });
    console.log('[LIFECYCLE] Manager responded to query via chat');

    // Close the modal
    await managerPage.getByRole('button', { name: /back/i }).click();

    // ── Step 6: Office marks as clarified ─────────────────────────
    await officePage.waitForLoadState('networkidle');
    // Office may already have the ticket selected; confirm "Mark Clarified" is available
    const markClarifiedBtn = officePage.getByRole('button', { name: /mark clarified/i });
    await expect(markClarifiedBtn).toBeVisible({ timeout: 10000 });
    await markClarifiedBtn.click();
    // Ticket moves back to pending
    await expect(officePage.getByText(/accepted/i).first()).toBeVisible({ timeout: 10000 });
    console.log('[LIFECYCLE] Office marked ticket as clarified');

    // ── Step 7: Office places an order ───────────────────────────
    const orderInput = officePage.getByPlaceholder(/order number/i);
    await expect(orderInput).toBeVisible({ timeout: 5000 });
    await orderInput.fill('PO-LIFECYCLE-001');

    const dateInput = officePage.locator('input[type="date"]');
    if (await dateInput.isVisible()) {
      await dateInput.fill('2026-07-01');
    }

    await officePage.getByRole('button', { name: /mark ordered/i }).click();
    await expect(officePage.getByText(/ordered/i).first()).toBeVisible({ timeout: 10000 });
    console.log('[LIFECYCLE] Office placed the order');

    // ── Step 8: Manager confirms fitted (archive) ────────────────
    await managerPage.waitForLoadState('networkidle');
    // Switch to Archive tab
    // Actually the ticket is in "Reports" tab and has status "ordered" — 
    // user has to open it to see "Confirm Fitted"
    await managerPage.getByText(TEST_PLOT).click();
    await expect(managerPage.getByRole('button', { name: /back/i })).toBeVisible({ timeout: 5000 });

    // Click "Confirm Fitted"
    const confirmBtn = managerPage.getByRole('button', { name: /confirm fitted/i });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });

    // Handle the browser's native confirm dialog
    managerPage.once('dialog', (dialog: Dialog) => {
      dialog.accept();
    });
    await confirmBtn.click();

    // After archiving, the modal closes
    await expect(managerPage.getByRole('button', { name: /back/i })).not.toBeVisible({ timeout: 10000 });
    console.log('[LIFECYCLE] Manager confirmed fitted — ticket archived');

    // ── Step 9: Verify the ticket appears in the office archive view ──
    // Click archive toggle on office
    const archiveBtn = officePage.getByRole('button', { name: /archive/i });
    if (await archiveBtn.isVisible()) {
      await archiveBtn.click();
      await officePage.waitForLoadState('networkidle');
      // The archived ticket should appear (it will have a new ref starting with ARC or the plot)
      await expect(officePage.getByText(TEST_PLOT)).toBeVisible({ timeout: 10000 });
      console.log('[LIFECYCLE] Ticket visible in office archive view');
    }

    console.log('[LIFECYCLE] ✅ Full lifecycle test passed!');
  });
});
