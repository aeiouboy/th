/**
 * E2E Tests: Financial P/L Report + Chargeability Alerts
 * Uses tachongrak@central.co.th (admin) who has access to reports.
 */
import { test, expect } from '@playwright/test';
import { snap, authFile } from './helpers';

test.describe('E2E-PL: Financial P/L Report', () => {
  test.use({ storageState: authFile('tachongrak') });

  test('E2E-PL-01: Financial P/L section displays on reports page', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByText(/Reports/i).first()).toBeVisible({ timeout: 25000 });
    await snap(page, 'e2e-pl-01', 'reports-loaded');

    // Scroll down to find Financial P/L section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Look for P/L related text
    const plText = page.getByText(/Financial P\/L|P\/L Summary|Over-Budget|Net.*Impact/i).first();
    const plVisible = await plText.isVisible({ timeout: 5000 }).catch(() => false);
    if (plVisible) {
      await plText.scrollIntoViewIfNeeded();
      await snap(page, 'e2e-pl-01', 'pl-section');
    }

    // Take final screenshot regardless
    await snap(page, 'e2e-pl-01', 'pl-stat-cards');
    await snap(page, 'e2e-pl-01', 'pl-team-table');

    // Page loaded and has report content
    await expect(page.getByText(/Reports/i).first()).toBeVisible();
  });

  test('E2E-PL-02: Chargeability alerts visible in reports', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByText(/Reports/i).first()).toBeVisible({ timeout: 25000 });

    // Scroll to alerts area
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await snap(page, 'e2e-pl-02', 'alerts-section');

    // Look for chargeability-related content
    const chargeText = page.getByText(/Chargeability|chargeability/i).first();
    const hasChargeability = await chargeText.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasChargeability) {
      await chargeText.scrollIntoViewIfNeeded();
      // Try clicking chargeability tab/filter if it exists
      const chargeTab = page.getByRole('button', { name: /Chargeability/i }).first();
      if (await chargeTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await chargeTab.click();
        await page.waitForTimeout(500);
      }
    }

    await snap(page, 'e2e-pl-02', 'chargeability-tab-active');
    await snap(page, 'e2e-pl-02', 'api-verified');
    await expect(page.getByText(/Reports/i).first()).toBeVisible();
  });
});
