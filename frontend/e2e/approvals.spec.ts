import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/test-results/screenshots');

function getViewportName(width: number): string {
  return width <= 375 ? 'mobile' : 'desktop';
}

test.describe('Approvals page', () => {
  test('renders approvals page with core elements', async ({ page, viewport }) => {
    await page.goto('/approvals');
    await expect(page).not.toHaveURL('/login');

    // Layout renders h1 "Approvals" in topbar, page also has h2 "Approvals"
    await expect(page.getByRole('heading', { name: 'Approvals' }).first()).toBeVisible();

    // Screenshot
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    const vp = getViewportName(viewport?.width ?? 1280);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `approvals--${vp}.png`),
      fullPage: false,
    });
  });

  test('search input is visible', async ({ page }) => {
    await page.goto('/approvals');
    const searchInput = page.getByPlaceholder(/[Ss]earch/);
    await expect(searchInput).toBeVisible();
  });

  test('tabs for approval queues are present', async ({ page }) => {
    await page.goto('/approvals');
    // Tabs: "As Manager", "As CC Owner", "History"
    await expect(page.getByText('As Manager')).toBeVisible();
  });

  test('filter dropdowns are present', async ({ page }) => {
    await page.goto('/approvals');
    const selects = page.locator('[role="combobox"]');
    await expect(selects.first()).toBeVisible();
  });
});
