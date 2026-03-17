import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/test-results/screenshots');

function getViewportName(width: number): string {
  return width <= 375 ? 'mobile' : 'desktop';
}

test.describe('Settings page', () => {
  test('renders settings page with core elements', async ({ page, viewport }) => {
    await page.goto('/settings');
    await expect(page).not.toHaveURL('/login');

    // Check for the "Appearance" card title which is always present
    await expect(page.getByText('Appearance', { exact: true })).toBeVisible();

    // Screenshot
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    const vp = getViewportName(viewport?.width ?? 1280);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `settings--${vp}.png`),
      fullPage: false,
    });
  });

  test('theme toggle is present', async ({ page }) => {
    await page.goto('/settings');
    // Light/Dark theme toggle — the page shows "Theme" text
    await expect(page.getByText('Theme', { exact: true })).toBeVisible();
  });

  test('notification preferences section is visible', async ({ page }) => {
    await page.goto('/settings');
    // "Notifications" card title — use exact to avoid matching description text
    await expect(page.getByText('Notifications', { exact: true })).toBeVisible();
  });

  test('timezone selector is present', async ({ page }) => {
    await page.goto('/settings');
    // Timezone card title — use exact to avoid matching description
    await expect(page.getByText('Timezone', { exact: true })).toBeVisible();
  });

  test('save settings button is present', async ({ page }) => {
    await page.goto('/settings');
    const saveButton = page.getByRole('button', { name: /Save Settings/ });
    await expect(saveButton).toBeVisible();
  });
});
