import { test, expect } from '@playwright/test';
import { apiRequest, takeScreenshots } from './helpers';

test.describe('Budget Module', () => {
  test('E2E-BUD-01: Budget summary loads with real data', async ({ page }) => {
    await page.goto('/budget');
    await page.waitForLoadState('networkidle');

    // Page heading (use h2 to avoid topbar h1 conflict)
    await expect(page.locator('h2').filter({ hasText: /Budget/i })).toBeVisible({ timeout: 15000 });

    // "Total Budget" metric should show a formatted number
    await expect(page.getByText('Total Budget')).toBeVisible({ timeout: 10000 });

    // "Total Spent" metric should be visible
    await expect(page.getByText('Total Spent')).toBeVisible();

    // Verify API returns data
    const response = await apiRequest(page, 'GET', '/budgets/summary');
    expect(response.status()).toBe(200);
    const summary = await response.json();
    expect(summary).toHaveProperty('totalBudget');
    expect(summary).toHaveProperty('totalActualSpent');

    // Budget table or cards should display charge code info
    await expect(page.getByText('Budget by Charge Code').or(page.getByText('No budget data'))).toBeVisible({ timeout: 10000 });

    await takeScreenshots(page, 'budget');
  });

  test('E2E-BUD-02: Budget alerts section is visible', async ({ page }) => {
    await page.goto('/budget');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2').filter({ hasText: /Budget/i })).toBeVisible({ timeout: 15000 });

    // Alerts API should return data
    const response = await apiRequest(page, 'GET', '/budgets/alerts');
    expect(response.status()).toBe(200);
    const alerts = await response.json();
    expect(Array.isArray(alerts)).toBeTruthy();

    // If alerts exist, they should be visible in the budget table
    if (alerts.length > 0) {
      // Table should have rows with alert data (severity badges, progress bars, etc.)
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });
    } else {
      // Empty state or "on track" message
      await expect(page.getByText(/no budget data|on track/i)).toBeVisible({ timeout: 5000 });
    }
  });
});
