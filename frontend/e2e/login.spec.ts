import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/test-results/screenshots');

function getViewportName(width: number): string {
  return width <= 375 ? 'mobile' : 'desktop';
}

test.describe('Login page', () => {
  // Override storageState so we test the unauthenticated login page
  test.use({ storageState: { cookies: [], origins: [] } });
  test('renders login form with correct elements', async ({ page, viewport }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');

    // Check branding
    await expect(page.getByText('Timesheet System')).toBeVisible();
    await expect(page.getByText('Sign in to manage your timesheets')).toBeVisible();

    // Check form inputs — use id-based locator to avoid strict mode violation
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();

    // Check sign in button — use exact to differentiate from "Sign in with Microsoft"
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();

    // Check Microsoft SSO button
    await expect(page.getByRole('button', { name: 'Sign in with Microsoft' })).toBeVisible();

    // Check forgot password link
    await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeVisible();

    // Screenshot
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    const vp = getViewportName(viewport?.width ?? 1280);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `login--${vp}.png`),
      fullPage: false,
    });
  });

  test('shows password toggle button', async ({ page }) => {
    await page.goto('/login');
    // Use ID selector to avoid strict mode — the label also matches the toggle button
    const passwordInput = page.locator('#login-password');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = page.getByRole('button', { name: 'Show password' });
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('shows error when forgot password clicked without email', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(page.getByText('Please enter your email address first')).toBeVisible();
  });

  test('email input accepts text', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('#login-email');
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
  });
});
