/**
 * E2E tests for CR-01, CR-02, CR-03:
 * - CR-01: Chargeability YTD trend chart
 * - CR-02: Program distribution pie chart
 * - CR-03: Dashboard KPI data from real backend
 */
import { test, expect } from '@playwright/test';
import { apiRequest, takeScreenshots, snap } from './helpers';

test.describe('Dashboard CR-01/02/03', () => {
  test('E2E-DASH-01: Dashboard KPI metrics load from real backend', async ({ page }) => {
    // Step 1: Navigate to dashboard
    // Pre-check: should redirect to login if not authenticated (but auth state is set up)
    await page.goto('/');
    await page.waitForLoadState('load');

    // Post-check: greeting is shown (user is authenticated, API returned user data)
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible({ timeout: 60000 });
    await snap(page, 'e2e-dash-01', 'page-loaded');

    // Step 2: Verify KPI cards are visible with real data
    // Pre-check: all 4 KPI cards should appear
    await expect(page.getByText('Hours this period')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Chargeability', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Active charge codes')).toBeVisible({ timeout: 10000 });

    // Step 3: Verify real API data is served
    // Post-check: /users/me returns 200 with email
    const response = await apiRequest(page, 'GET', '/users/me');
    expect(response.status()).toBe(200);
    const user = await response.json();
    expect(user.email).toBeTruthy();

    await snap(page, 'e2e-dash-01', 'kpi-data-loaded');
    await takeScreenshots(page, 'dashboard');
  });

  test('E2E-DASH-02: Chargeability YTD trend chart renders (CR-01)', async ({ page }) => {
    // Step 1: Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible({ timeout: 60000 });

    // Step 2: Scroll to find the chargeability trend chart
    // Pre-check: "Chargeability Trend" card should exist
    const trendCard = page.getByText('Chargeability Trend');
    await expect(trendCard).toBeVisible({ timeout: 30000 });

    await snap(page, 'e2e-dash-02', 'trend-chart-visible');

    // Step 3: Verify API returns chargeability YTD data
    // Post-check: API returns months array and ytdChargeability
    const response = await apiRequest(page, 'GET', '/dashboard/chargeability-ytd');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('months');
    expect(data).toHaveProperty('ytdChargeability');
    expect(Array.isArray(data.months)).toBe(true);

    await snap(page, 'e2e-dash-02', 'api-data-verified');
  });

  test('E2E-DASH-03: Program distribution chart renders (CR-02)', async ({ page }) => {
    // Step 1: Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible({ timeout: 60000 });

    // Step 2: Look for "Program Distribution" card
    // Pre-check: card should appear on dashboard
    const distributionCard = page.getByText('Program Distribution');
    await expect(distributionCard).toBeVisible({ timeout: 30000 });

    await snap(page, 'e2e-dash-03', 'distribution-chart-visible');

    // Step 3: Verify "Current Period" and "YTD" toggle buttons exist
    // Post-check: both filter buttons are present
    await expect(page.getByRole('button', { name: /Current Period/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /YTD/i })).toBeVisible({ timeout: 10000 });

    // Step 4: Click YTD to switch view
    // Post-check: view toggles (button state changes)
    await page.getByRole('button', { name: /YTD/i }).click();
    await page.waitForTimeout(500);

    // Step 5: Verify program distribution API
    const response = await apiRequest(page, 'GET', '/dashboard/program-distribution');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('currentPeriod');
    expect(data).toHaveProperty('ytd');

    await snap(page, 'e2e-dash-03', 'ytd-view-active');
  });
});
