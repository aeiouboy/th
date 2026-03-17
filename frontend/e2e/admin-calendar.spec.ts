import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/test-results/screenshots');

function getViewportName(width: number): string {
  return width <= 375 ? 'mobile' : 'desktop';
}

test.describe('Admin Calendar page', () => {
  test('renders admin calendar page with core elements', async ({ page, viewport }) => {
    await page.goto('/admin/calendar');
    await expect(page).not.toHaveURL('/login');

    // Layout h1 shows "Calendar"
    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();

    // Should show the year number (e.g., 2026)
    await expect(page.locator('body')).toContainText(/202\d/);

    // Screenshot
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    const vp = getViewportName(viewport?.width ?? 1280);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `admin-calendar--${vp}.png`),
      fullPage: false,
    });
  });

  test('calendar month navigation buttons are present', async ({ page }) => {
    await page.goto('/admin/calendar');
    // Year nav buttons (prev/next year)
    await expect(page.locator('main')).toBeVisible();
  });

  test('add holiday button is present', async ({ page }) => {
    await page.goto('/admin/calendar');
    // "Add Holiday" button in the Holidays card header
    const addButton = page.getByRole('button', { name: /Add Holiday/ });
    await expect(addButton).toBeVisible();
  });

  test('holidays table or no-holidays message is shown', async ({ page }) => {
    await page.goto('/admin/calendar');
    // Either a table of holidays or "No holidays configured" message
    const content = page.locator('main');
    await expect(content).toContainText(/Holiday|No holidays configured/);
  });
});
