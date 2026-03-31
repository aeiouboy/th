import { test, expect } from '@playwright/test';
import { apiRequest, uniqueName, takeScreenshots, snap } from './helpers';

test.describe.serial('Admin Rates Module', () => {
  let testJobGrade: string;
  const createdRateIds: number[] = [];

  test.afterAll(async ({ browser }) => {
    // Cleanup: delete any cost rates created during tests
    const context = await browser.newContext({ storageState: 'frontend/e2e/.auth/tachongrak.json' });
    const page = await context.newPage();
    await page.goto('/');

    // Delete tracked rate IDs
    for (const id of createdRateIds) {
      try {
        const res = await apiRequest(page, 'DELETE', `/cost-rates/${id}`);
        console.log(`Cleanup: deleted cost rate ${id}, status=${res.status()}`);
      } catch (e) {
        console.warn(`Cleanup: failed to delete cost rate ${id}:`, e);
      }
    }

    // Also cleanup any remaining L-TEST-* rates
    try {
      const ratesRes = await apiRequest(page, 'GET', '/cost-rates');
      if (ratesRes.ok()) {
        const rates = await ratesRes.json();
        const testRates = (Array.isArray(rates) ? rates : rates.data || [])
          .filter((r: any) => r.jobGrade?.startsWith('L-TEST'));
        for (const rate of testRates) {
          await apiRequest(page, 'DELETE', `/cost-rates/${rate.id}`).catch(() => {});
          console.log(`Cleanup: deleted leftover test rate ${rate.id} (${rate.jobGrade})`);
        }
      }
    } catch (e) {
      console.warn('Cleanup: failed to search/delete remaining test rates:', e);
    }

    await context.close();
  });

  test('E2E-RATE-01: Rates table loads with real data', async ({ page }) => {
    await page.goto('/admin/rates');
    await page.waitForLoadState('load');

    // "Active Rates" summary card should be visible
    await expect(page.getByText('Active rates')).toBeVisible({ timeout: 30000 });

    // "Cost Rates" card title should be visible
    await expect(page.getByText('Cost Rates')).toBeVisible({ timeout: 10000 });

    // Table headers should include Job Grade, Hourly Rate, Effective From
    await expect(page.getByRole('columnheader', { name: 'Job Grade' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('columnheader', { name: 'Hourly Rate' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('columnheader', { name: 'Effective From' })).toBeVisible({ timeout: 5000 });

    await snap(page, 'e2e-rate-01', 'rates-table-loaded');
    await takeScreenshots(page, 'admin-rates');
  });

  test('E2E-RATE-02: Add a new cost rate', async ({ page }) => {
    testJobGrade = uniqueName('L-TEST');
    await page.goto('/admin/rates');
    await page.waitForLoadState('load');
    await expect(page.getByText('Cost Rates')).toBeVisible({ timeout: 30000 });

    // Click "Add Rate" button
    await page.click('button:has-text("Add Rate")');

    // Dialog should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Add New Rate')).toBeVisible();
    await snap(page, 'e2e-rate-02', 'dialog-open');

    // Fill job grade
    const jobGradeInput = page.getByRole('dialog').locator('input').first();
    await jobGradeInput.fill(testJobGrade);

    // Fill hourly rate
    const rateInput = page.getByRole('dialog').locator('input[type="number"]');
    await rateInput.fill('125.50');

    // Fill effective from date
    const dateInputs = page.getByRole('dialog').locator('input[type="date"]');
    await dateInputs.first().fill('2026-01-01');

    // Click Add Rate button
    await page.getByRole('dialog').getByRole('button', { name: /Add.*Rate/i }).click();

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

    // Wait for table to refresh
    await page.waitForTimeout(1000);

    // New rate should appear in the rates table
    await expect(page.getByText(testJobGrade)).toBeVisible({ timeout: 10000 });

    // Track created rate ID for cleanup
    try {
      const ratesRes = await apiRequest(page, 'GET', '/cost-rates');
      if (ratesRes.ok()) {
        const rates = await ratesRes.json();
        const found = (Array.isArray(rates) ? rates : rates.data || [])
          .find((r: any) => r.jobGrade === testJobGrade);
        if (found) createdRateIds.push(found.id);
      }
    } catch { /* best effort */ }

    await snap(page, 'e2e-rate-02', 'after-add-rate');
  });
});
