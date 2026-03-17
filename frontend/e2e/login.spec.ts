import { test, expect } from '@playwright/test';
import { snap } from './helpers';

// Login tests do NOT use storageState — they test the actual login flow.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('load');
  });

  test('E2E-LOGIN-01: Successful login redirects to dashboard', async ({ page }) => {
    await page.fill('#login-email', 'tachongrak@central.co.th');
    await page.fill('#login-password', 'password1234');
    await page.click('button[type="submit"]:has-text("Sign In")');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/', { timeout: 30000 });
    await page.waitForLoadState('load');

    // Verify greeting text (needs longer timeout -- user data loads async after page load)
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible({ timeout: 30000 });
    await snap(page, 'e2e-login-01', 'after-login-redirect');
  });

  test('E2E-LOGIN-02: Invalid credentials show error (NEGATIVE)', async ({ page }) => {
    await page.fill('#login-email', 'tachongrak@central.co.th');
    await page.fill('#login-password', 'wrongpassword');
    await page.click('button[type="submit"]:has-text("Sign In")');

    // Error message should appear
    await expect(page.locator('.text-red-300, [class*="red"]').filter({ hasText: /invalid|credentials|error/i })).toBeVisible({ timeout: 10000 });
    await snap(page, 'e2e-login-02', 'error-shown');

    // URL should remain on login
    await expect(page).toHaveURL(/\/login/);
  });

  test('E2E-LOGIN-03: Empty form shows validation', async ({ page }) => {
    // Click sign in without filling fields — HTML5 required validation should prevent submission
    const emailInput = page.locator('#login-email');
    const passwordInput = page.locator('#login-password');

    // Verify fields are required (HTML5 validation)
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');

    // Click submit — browser should block submission due to required fields
    await page.click('button[type="submit"]:has-text("Sign In")');

    // URL should remain on login (form was not submitted)
    await expect(page).toHaveURL(/\/login/);
    await snap(page, 'e2e-login-03', 'validation-shown');
  });
});
