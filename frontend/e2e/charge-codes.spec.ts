import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/test-results/screenshots');

function getViewportName(width: number): string {
  return width <= 375 ? 'mobile' : 'desktop';
}

test.describe('Charge Codes page', () => {
  test('renders charge codes page with core elements', async ({ page, viewport }) => {
    await page.goto('/charge-codes');
    await expect(page).not.toHaveURL('/login');

    // Check page heading in topbar (layout h1)
    await expect(page.getByRole('heading', { name: 'Charge Codes' })).toBeVisible();

    // Search input — actual placeholder is "Search codes..."
    await expect(page.getByPlaceholder('Search codes...')).toBeVisible();

    // Create New button
    await expect(page.getByRole('button', { name: /Create New/ })).toBeVisible();

    // Screenshot
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    const vp = getViewportName(viewport?.width ?? 1280);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `charge-codes--${vp}.png`),
      fullPage: false,
    });
  });

  test('shows filter selects', async ({ page }) => {
    await page.goto('/charge-codes');
    // Multiple filter selects: Level, Status, Billable
    const selects = page.locator('[role="combobox"]');
    await expect(selects.first()).toBeVisible();
  });

  test('search input is functional', async ({ page }) => {
    await page.goto('/charge-codes');
    const searchInput = page.getByPlaceholder('Search codes...');
    await searchInput.fill('Portal');
    await expect(searchInput).toHaveValue('Portal');
  });

  test('charge code tree data is loaded', async ({ page }) => {
    await page.goto('/charge-codes');
    // Mock tree includes "Digital Transformation" program — check it exists in DOM (may be scrolled out on mobile)
    await expect(page.locator('body')).toContainText('Digital Transformation', { timeout: 10000 });
  });
});
