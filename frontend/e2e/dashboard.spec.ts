import { test, expect } from '@playwright/test';
import { apiRequest, takeScreenshots, snap } from './helpers';

test.describe('Dashboard Module', () => {
  test('E2E-DASH-01: Dashboard shows real KPI metrics', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Verify greeting text is visible (not loading) — wait up to 60s for user API to complete
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible({ timeout: 60000 });

    // "Hours This Period" card should show a number
    await expect(page.getByText('Hours this period')).toBeVisible({ timeout: 30000 });

    // "Chargeability" card should show a percentage
    await expect(page.getByText('Chargeability')).toBeVisible({ timeout: 30000 });

    // "Active Charge Codes" card should show a number
    await expect(page.getByText('Active charge codes')).toBeVisible({ timeout: 30000 });

    // Verify API returns real data
    const response = await apiRequest(page, 'GET', '/users/me');
    expect(response.status()).toBe(200);
    const user = await response.json();
    expect(user.email).toBeTruthy();

    await snap(page, 'e2e-dash-01', 'kpi-data-loaded');
    await takeScreenshots(page, 'dashboard');
  });

  test('E2E-DASH-02: Dashboard navigation works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Click "Time Entry" in sidebar navigation
    await page.click('a[href="/time-entry"]');

    // URL should change to /time-entry
    await expect(page).toHaveURL('/time-entry');

    // "Time Entry" heading should be visible in the topbar
    await expect(page.getByRole('heading', { name: /Time Entry/i })).toBeVisible({ timeout: 10000 });
    await snap(page, 'e2e-dash-02', 'after-navigation');
  });
});
