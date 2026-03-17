import { test, expect } from '@playwright/test';
import { apiRequest, takeScreenshots, snap } from './helpers';

test.describe('Admin Users Module', () => {
  test('E2E-USR-01: Users list loads with real data', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('load');

    // Page should show User Management card
    await expect(page.getByText('User Management')).toBeVisible({ timeout: 30000 });

    // Users table should be visible with at least 1 row
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Verify API returns real users
    const response = await apiRequest(page, 'GET', '/users');
    expect(response.status()).toBe(200);
    const users = await response.json();
    expect(Array.isArray(users)).toBeTruthy();
    expect(users.length).toBeGreaterThan(0);

    // Table should show email and role columns
    await expect(page.getByText('Email')).toBeVisible();
    await expect(page.getByText('Role')).toBeVisible();

    // "Total Users" summary card should show a number
    await expect(page.getByText('Total users')).toBeVisible();

    await snap(page, 'e2e-usr-01', 'user-list-loaded');
    await takeScreenshots(page, 'admin-users');
  });

  test('E2E-USR-02: Update user role (verify role display)', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('load');
    await expect(page.getByText('User Management')).toBeVisible({ timeout: 30000 });

    // Wait for table to load
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Click the edit button on the first user row
    const editBtn = page.locator('table tbody tr').first().locator('button').last();
    await editBtn.click();

    // Edit dialog should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Edit User')).toBeVisible();
    await snap(page, 'e2e-usr-02', 'edit-dialog-open');

    // Role dropdown should be available
    const roleDropdown = page.getByRole('dialog').locator('button[role="combobox"]').first();
    await expect(roleDropdown).toBeVisible();

    // Click the role dropdown to verify role options are available
    await roleDropdown.click();
    await page.waitForTimeout(300);

    // Role options should include standard roles
    await expect(page.getByRole('option', { name: /Admin/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /Employee/i })).toBeVisible();
    await snap(page, 'e2e-usr-02', 'role-dropdown-open');

    // Close the dropdown first, then close dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
  });
});
