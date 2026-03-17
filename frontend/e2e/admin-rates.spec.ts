import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/test-results/screenshots');

function getViewportName(width: number): string {
  return width <= 375 ? 'mobile' : 'desktop';
}

test.describe('Admin Rates page', () => {
  test('renders admin rates page with core elements', async ({ page, viewport }) => {
    await page.goto('/admin/rates');
    await expect(page).not.toHaveURL('/login');

    // Layout h1 shows "Rates"
    await expect(page.getByRole('heading', { name: 'Rates' })).toBeVisible();

    // Screenshot
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    const vp = getViewportName(viewport?.width ?? 1280);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `admin-rates--${vp}.png`),
      fullPage: false,
    });
  });

  test('add rate button is present', async ({ page }) => {
    await page.goto('/admin/rates');
    const addButton = page.getByRole('button', { name: /Add Rate/ });
    await expect(addButton).toBeVisible();
  });

  test('rates table is rendered', async ({ page }) => {
    await page.goto('/admin/rates');
    const table = page.locator('table').first();
    await expect(table).toBeVisible();
  });

  test('rate card or summary is visible', async ({ page }) => {
    await page.goto('/admin/rates');
    // Summary cards show "Active Rates", "Avg Hourly Rate", "Total Rate Records"
    await expect(page.getByText('Active Rates')).toBeVisible();
  });
});
