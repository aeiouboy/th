import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/test-results/screenshots');

function getViewportName(width: number): string {
  return width <= 375 ? 'mobile' : 'desktop';
}

const MOCK_USERS = [
  {
    id: 'u1',
    email: 'admin@company.com',
    fullName: 'Admin User',
    role: 'admin',
    department: 'Engineering',
    jobGrade: 'G5',
  },
  {
    id: 'u2',
    email: 'employee@company.com',
    fullName: 'John Employee',
    role: 'employee',
    department: 'Operations',
    jobGrade: 'G3',
  },
];

test.describe('Admin Users page', () => {
  test.beforeEach(async ({ page }) => {
    // Single route handler for all API calls
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      if (url.endsWith('/users') || url.includes('/users?')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_USERS),
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
    });
  });

  test('renders admin users page with core elements', async ({ page, viewport }) => {
    await page.goto('/admin/users');
    await expect(page).not.toHaveURL('/login');

    // Layout h1 shows "Users"
    await expect(page.getByRole('heading', { name: 'Users' }).first()).toBeVisible();

    // Screenshot
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    const vp = getViewportName(viewport?.width ?? 1280);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `admin-users--${vp}.png`),
      fullPage: false,
    });
  });

  test('search input is present', async ({ page }) => {
    await page.goto('/admin/users');
    const searchInput = page.getByPlaceholder(/[Ss]earch/);
    await expect(searchInput).toBeVisible();
  });

  test('add user button is present', async ({ page }) => {
    await page.goto('/admin/users');
    const addButton = page.getByRole('button', { name: /Add User/ });
    await expect(addButton).toBeVisible();
  });

  test('users table or list is rendered', async ({ page }) => {
    await page.goto('/admin/users');
    // Wait for data to load and table to appear
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });
  });

  test('role filter dropdown is present', async ({ page }) => {
    await page.goto('/admin/users');
    const selects = page.locator('[role="combobox"]');
    await expect(selects.first()).toBeVisible();
  });
});
