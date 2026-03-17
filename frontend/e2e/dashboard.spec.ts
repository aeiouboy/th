import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/test-results/screenshots');

function getViewportName(width: number): string {
  return width <= 375 ? 'mobile' : 'desktop';
}

test.describe('Dashboard page', () => {
  test('renders dashboard with key UI elements', async ({ page, viewport }) => {
    await page.goto('/');
    // Should not redirect to login (auth bypassed)
    await expect(page).not.toHaveURL('/login');

    // Check page renders (heading in topbar — layout renders h1 with page title)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Check greeting is present (Good morning/afternoon/evening)
    const greeting = page.locator('h2').filter({ hasText: /Good (morning|afternoon|evening)/ });
    await expect(greeting).toBeVisible();

    // Check "Open Timesheet" button/link — the arrow is an HTML entity
    await expect(page.getByRole('link', { name: /Open Timesheet/ })).toBeVisible();

    // Check metric cards — use exact to avoid strict mode violations
    await expect(page.getByText('Hours This Period', { exact: true })).toBeVisible();
    await expect(page.getByText('Chargeability', { exact: true })).toBeVisible();
    await expect(page.getByText('Pending Approvals', { exact: true })).toBeVisible();
    await expect(page.getByText('Active Charge Codes', { exact: true })).toBeVisible();

    // Screenshot
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    const vp = getViewportName(viewport?.width ?? 1280);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `dashboard--${vp}.png`),
      fullPage: false,
    });
  });

  test('sidebar is visible on desktop', async ({ page, viewport }) => {
    if ((viewport?.width ?? 1280) < 768) return; // skip on mobile
    await page.goto('/');
    // Sidebar should be visible with nav items
    await expect(page.getByRole('link', { name: 'Time Entry' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Charge Codes' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Approv/ })).toBeVisible();
  });

  test('mobile bottom nav is visible on mobile', async ({ page, viewport }) => {
    if ((viewport?.width ?? 1280) > 767) return; // skip on desktop
    await page.goto('/');
    // Mobile nav should show bottom tab bar
    const nav = page.locator('nav.fixed');
    await expect(nav).toBeVisible();
  });

  test('notification bell is visible in topbar', async ({ page }) => {
    await page.goto('/');
    const bell = page.getByRole('button', { name: 'Notifications (3 unread)' });
    await expect(bell).toBeVisible();
  });
});
