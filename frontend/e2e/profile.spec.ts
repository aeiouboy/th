import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/test-results/screenshots');

function getViewportName(width: number): string {
  return width <= 375 ? 'mobile' : 'desktop';
}

const MOCK_USER = {
  id: 'd3055e90-4396-4fb6-95fa-3767eafb8349',
  email: 'tachongrak@central.co.th',
  fullName: 'Test Admin User',
  role: 'admin',
  department: 'Engineering',
  jobGrade: 'G5',
};

test.describe('Profile page', () => {
  test.beforeEach(async ({ page }) => {
    // Single route handler for all API calls
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/users/me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_USER),
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
    });
  });

  test('renders profile page with core elements', async ({ page, viewport }) => {
    await page.goto('/profile');
    await expect(page).not.toHaveURL('/login');

    // Check page renders — profile page shows 'Profile Details' in CardTitle
    await expect(page.getByText('Profile Details')).toBeVisible({ timeout: 10000 });

    // Screenshot
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    const vp = getViewportName(viewport?.width ?? 1280);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `profile--${vp}.png`),
      fullPage: false,
    });
  });

  test('profile fields are shown', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('Profile Details')).toBeVisible({ timeout: 10000 });
    // Should show profile fields
    await expect(page.getByText('Full Name')).toBeVisible();
    await expect(page.getByText('Email')).toBeVisible();
  });

  test('edit profile button is present', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('Profile Details')).toBeVisible({ timeout: 10000 });
    const editButton = page.getByRole('button', { name: /Edit/ });
    await expect(editButton.first()).toBeVisible();
  });

  test('avatar or user icon is shown', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('Profile Details')).toBeVisible({ timeout: 10000 });
    const avatar = page.locator('[class*="avatar"], [class*="Avatar"]').first();
    await expect(avatar).toBeVisible();
  });

  test('change password section is present', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('Profile Details')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Change Password')).toBeVisible();
  });
});
