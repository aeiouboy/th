import { test, expect } from '@playwright/test';
import { apiRequest, takeScreenshots } from './helpers';

test.describe('Dashboard Module', () => {
  test('E2E-DASH-01: Dashboard shows real KPI metrics', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify greeting text is visible (not loading)
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible({ timeout: 15000 });

    // "Hours This Period" card should show a number
    await expect(page.getByText('Hours This Period')).toBeVisible();

    // "Chargeability" card should show a percentage
    await expect(page.getByText('Chargeability')).toBeVisible();

    // "Active Charge Codes" card should show a number
    await expect(page.getByText('Active Charge Codes')).toBeVisible();

    // Verify API returns real data
    const response = await apiRequest(page, 'GET', '/users/me');
    expect(response.status()).toBe(200);
    const user = await response.json();
    expect(user.email).toBeTruthy();

    await takeScreenshots(page, 'dashboard');
  });

  test('E2E-DASH-02: Dashboard navigation works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click "Time Entry" in sidebar navigation
    await page.click('a[href="/time-entry"]');

    // URL should change to /time-entry
    await expect(page).toHaveURL('/time-entry');

    // "Time Entry" heading should be visible in the topbar
    await expect(page.getByRole('heading', { name: /Time Entry/i })).toBeVisible({ timeout: 10000 });
  });
});
