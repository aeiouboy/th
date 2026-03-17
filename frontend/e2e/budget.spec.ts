import { test, expect } from '@playwright/test';
import { apiRequest, takeScreenshots, snap } from './helpers';

test.describe('Budget Module', () => {
  test('E2E-BUD-01: Budget summary loads with real data', async ({ page }) => {
    await page.goto('/budget');
    await page.waitForLoadState('load');

    // Page heading
    await expect(page.locator('main h1').filter({ hasText: 'Budget Tracking' })).toBeVisible({ timeout: 30000 });

    // StatCards are behind loading gate; wait for data to load
    await expect(page.getByText('Total budget')).toBeVisible({ timeout: 30000 });

    // "Total Spent" metric should be visible
    await expect(page.getByText('Total spent')).toBeVisible();

    // Verify API returns data
    const response = await apiRequest(page, 'GET', '/budgets/summary');
    expect(response.status()).toBe(200);
    const summary = await response.json();
    expect(summary).toHaveProperty('totalBudget');
    expect(summary).toHaveProperty('totalActualSpent');

    // Budget table or cards should display charge code info
    await expect(page.getByText('Budget by Charge Code').or(page.getByText('No budget data')).first()).toBeVisible({ timeout: 15000 });

    await snap(page, 'e2e-bud-01', 'budget-data-loaded');
    await takeScreenshots(page, 'budget');
  });

  test('E2E-BUD-02: Budget alerts section is visible', async ({ page }) => {
    await page.goto('/budget');
    await page.waitForLoadState('load');
    await expect(page.locator('main h1').filter({ hasText: 'Budget Tracking' })).toBeVisible({ timeout: 30000 });

    // Alerts API should return data
    const response = await apiRequest(page, 'GET', '/budgets/alerts');
    expect(response.status()).toBe(200);
    const alerts = await response.json();
    expect(Array.isArray(alerts)).toBeTruthy();

    // Wait for loading skeleton to disappear and content to render
    await page.waitForTimeout(2000);

    // If alerts exist, they should be visible in the budget table
    if (alerts.length > 0) {
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 30000 });
    } else {
      // Empty state shows an h3 heading "No budget data"
      await expect(page.locator('h3').filter({ hasText: /no budget data/i }).first()).toBeVisible({ timeout: 30000 });
    }
    await snap(page, 'e2e-bud-02', 'alerts-section');
  });
});
