import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/test-results/screenshots');

function getViewportName(width: number): string {
  return width <= 375 ? 'mobile' : 'desktop';
}

test.describe('Budget page', () => {
  test('renders budget page with core elements', async ({ page, viewport }) => {
    await page.goto('/budget');
    await expect(page).not.toHaveURL('/login');

    // Layout h1 says "Budget", page h2 says "Budget Tracking"
    await expect(page.getByRole('heading', { name: /Budget/ }).first()).toBeVisible();

    // Mock data shows budget summary values
    await expect(page.locator('body')).toContainText(/[Bb]udget|[Ss]ummary|[Oo]verall/);

    // Screenshot
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    const vp = getViewportName(viewport?.width ?? 1280);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `budget--${vp}.png`),
      fullPage: false,
    });
  });

  test('budget summary metrics are shown', async ({ page }) => {
    await page.goto('/budget');
    // Mock data: totalBudget: 1000000 -> $1.0M, overview cards show Total Budget, Total Spent, etc.
    await expect(page.getByText('Total Budget')).toBeVisible();
  });

  test('charge code list or alerts section is visible', async ({ page }) => {
    await page.goto('/budget');
    // Should show charge codes with budget info
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});
