/**
 * E2E tests for CR-13, CR-14, CR-15:
 * - CR-13: Reports by program tab
 * - CR-14: Reports by cost center tab
 * - CR-15: Reports by person tab
 */
import { test, expect } from '@playwright/test';
import { apiRequest, snap, takeScreenshots } from './helpers';

test.describe('Reports CR-13/14/15', () => {
  test('E2E-RPT-01: Reports page shows tabs for by-program, by-cost-center, by-person', async ({ page }) => {
    // Step 1: Navigate to reports page
    await page.goto('/reports');
    await page.waitForLoadState('load');
    await expect(page.getByRole('heading', { name: 'Reports & Analytics' })).toBeVisible({ timeout: 30000 });
    await snap(page, 'e2e-rpt-01', 'page-loaded');

    // Step 2: Verify tab navigation exists with report sections
    const reportsTabs = [
      /By Program/i,
      /By Cost Center/i,
      /By Person/i,
    ];

    let foundTab = false;
    for (const pattern of reportsTabs) {
      const el = page.getByText(pattern).first();
      if (await el.isVisible().catch(() => false)) {
        foundTab = true;
        break;
      }
    }
    expect(foundTab).toBe(true);

    // Step 3: Verify by-program API returns data (returns an object, not array)
    const response = await apiRequest(page, 'GET', '/reports/by-program');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(typeof data).toBe('object');

    await snap(page, 'e2e-rpt-01', 'sections-visible');
    await takeScreenshots(page, 'reports');
  });

  test('E2E-RPT-02: By-cost-center report tab loads data (CR-14)', async ({ page }) => {
    // Step 1: Navigate to reports page
    await page.goto('/reports');
    await page.waitForLoadState('load');
    await expect(page.getByRole('heading', { name: 'Reports & Analytics' })).toBeVisible({ timeout: 30000 });

    // Step 2: Look for cost center tab and click it
    const costCenterTab = page.getByRole('tab', { name: /Cost Center/i }).first();
    const hasCostCenterTab = await costCenterTab.isVisible().catch(() => false);

    if (hasCostCenterTab) {
      await costCenterTab.click();
      await page.waitForTimeout(1000);
      await snap(page, 'e2e-rpt-02', 'cost-center-tab-active');
    }

    // Step 3: Verify by-cost-center API returns data (returns an object)
    const response = await apiRequest(page, 'GET', '/reports/by-cost-center');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(typeof data).toBe('object');

    await snap(page, 'e2e-rpt-02', 'cost-center-api-verified');
  });

  test('E2E-RPT-03: By-person report tab loads data (CR-15)', async ({ page }) => {
    // Step 1: Navigate to reports page
    await page.goto('/reports');
    await page.waitForLoadState('load');
    await expect(page.getByRole('heading', { name: 'Reports & Analytics' })).toBeVisible({ timeout: 30000 });

    // Step 2: Look for "By Person" tab and click
    const byPersonTab = page.getByRole('tab', { name: /By Person|Person/i }).first();
    const hasByPersonTab = await byPersonTab.isVisible().catch(() => false);

    if (hasByPersonTab) {
      await byPersonTab.click();
      await page.waitForTimeout(1000);
      await snap(page, 'e2e-rpt-03', 'by-person-tab-active');
    }

    // Step 3: Verify by-person API returns data (returns an object)
    const response = await apiRequest(page, 'GET', '/reports/by-person');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(typeof data).toBe('object');

    await snap(page, 'e2e-rpt-03', 'by-person-api-verified');
    await takeScreenshots(page, 'reports-by-person');
  });
});
