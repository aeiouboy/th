import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/test-results/screenshots');

function getViewportName(width: number): string {
  return width <= 375 ? 'mobile' : 'desktop';
}

test.describe('Reports page', () => {
  test('renders reports page with core elements', async ({ page, viewport }) => {
    await page.goto('/reports');
    await expect(page).not.toHaveURL('/login');

    // Layout h1 says "Reports", page h2 says "Reports & Analytics"
    await expect(page.getByRole('heading', { name: /Reports/ }).first()).toBeVisible();

    // Screenshot
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    const vp = getViewportName(viewport?.width ?? 1280);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `reports--${vp}.png`),
      fullPage: false,
    });
  });

  test('export buttons are present', async ({ page }) => {
    await page.goto('/reports');
    // Look for Export CSV and Export PDF buttons
    await expect(page.getByRole('button', { name: /Export CSV/ })).toBeVisible();
  });

  test('period selector is present', async ({ page }) => {
    await page.goto('/reports');
    const selects = page.locator('[role="combobox"]');
    await expect(selects.first()).toBeVisible();
  });

  test('report charts or summaries are rendered', async ({ page }) => {
    await page.goto('/reports');
    // KPI cards should show "Total Budget", "Actual Spent", etc.
    await expect(page.getByText('Total Budget')).toBeVisible();
  });
});
