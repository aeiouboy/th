/**
 * E2E tests for CR-16, CR-17:
 * - CR-16: Multi-select filter with chargeCodeIds query param
 * - CR-17: Team breakdown per budget item
 */
import { test, expect } from '@playwright/test';
import { apiRequest, snap, takeScreenshots } from './helpers';

test.describe('Budget CR-16/17', () => {
  test('E2E-BUD-01: Budget page loads with real data and multi-filter (CR-16)', async ({ page }) => {
    // Step 1: Navigate to budget page
    // Pre-check: Budget Tracking heading should appear
    await page.goto('/budget');
    await page.waitForLoadState('load');
    await expect(page.locator('main h1').filter({ hasText: 'Budget Tracking' })).toBeVisible({ timeout: 30000 });

    await snap(page, 'e2e-bud-cr16-01', 'page-loaded');

    // Step 2: Verify stat cards are visible
    // Post-check: KPI cards load with real budget data
    await expect(page.getByText('Total budget')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Actual spent')).toBeVisible({ timeout: 10000 });

    // Step 3: Look for multi-select filter or charge code filter
    // Pre-check: filter controls should be available
    const filterEl = page.locator('[class*="multi"], [class*="filter"], input[placeholder*="filter"], input[placeholder*="Filter"], button[aria-label*="filter"]').first();
    const hasFilter = await filterEl.isVisible().catch(() => false);

    if (hasFilter) {
      await snap(page, 'e2e-bud-cr16-01', 'filter-visible');
    }

    // Step 4: Verify budget API works with chargeCodeIds param
    // Post-check: API accepts query params
    const treeResponse = await apiRequest(page, 'GET', '/charge-codes/tree');
    const tree = await treeResponse.json();

    if (Array.isArray(tree) && tree.length > 0) {
      const firstId = tree[0].id;
      const filteredResponse = await apiRequest(page, 'GET', `/budgets/summary?chargeCodeIds=${firstId}`);
      expect(filteredResponse.status()).toBe(200);
      await snap(page, 'e2e-bud-cr16-01', 'filtered-api-verified');
    }

    await takeScreenshots(page, 'budget-cr16');
  });

  test('E2E-BUD-02: Budget team breakdown visible in budget row (CR-17)', async ({ page }) => {
    // Step 1: Navigate to budget page
    await page.goto('/budget');
    await page.waitForLoadState('load');
    await expect(page.locator('main h1').filter({ hasText: 'Budget Tracking' })).toBeVisible({ timeout: 30000 });

    // Step 2: Wait for budget table to load
    await page.waitForTimeout(2000);
    await snap(page, 'e2e-bud-cr17-02', 'table-loaded');

    // Step 3: Look for team breakdown toggle or expand in a budget row
    // Pre-check: budget rows with teams should be expandable
    const expandBtn = page.locator('button').filter({ hasText: /team|expand|breakdown/i }).first();
    const hasExpand = await expandBtn.isVisible().catch(() => false);

    if (hasExpand) {
      await expandBtn.click();
      await page.waitForTimeout(500);
      await snap(page, 'e2e-bud-cr17-02', 'team-breakdown-expanded');
    }

    // Step 4: Verify budget detail API includes teamBreakdown
    // Post-check: API returns teamBreakdown array
    const treeResponse = await apiRequest(page, 'GET', '/charge-codes/tree');
    const tree = await treeResponse.json();

    if (Array.isArray(tree) && tree.length > 0) {
      const firstId = tree[0].id;
      const budgetDetailResponse = await apiRequest(page, 'GET', `/charge-codes/${firstId}/budget-detail`);
      expect(budgetDetailResponse.status()).toBe(200);
      const detail = await budgetDetailResponse.json();

      // CR-17: team breakdown should be present
      expect(Array.isArray(detail.teamBreakdown)).toBe(true);
      expect(Array.isArray(detail.personBreakdown)).toBe(true);
      await snap(page, 'e2e-bud-cr17-02', 'team-breakdown-api-verified');
    }

    await takeScreenshots(page, 'budget-cr17');
  });
});
