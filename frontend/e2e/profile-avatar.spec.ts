/**
 * E2E tests for CR-1 remaining:
 * - E2E-AVATAR-01: User profile page shows avatar upload area
 * - E2E-AVATAR-02: Profile page edit form shows and cancel preserves original value
 * - E2E-AVATAR-03: PUT /users/me/avatar validates URL format (NEGATIVE)
 */
import { test, expect } from '@playwright/test';
import { apiRequest, snap, takeScreenshots } from './helpers';

test.describe('Profile Avatar Upload', () => {
  test('E2E-AVATAR-01: Profile page shows avatar area with upload capability', async ({ page }) => {

    // Step 1: Navigate to Profile page
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Post-check: page renders with user profile info (h2 heading with user's name)
    const heading = page.locator('h2').first();
    await expect(heading).toBeVisible({ timeout: 15000 });
    await snap(page, 'e2e-avatar-01', 'profile-loaded');

    // Step 2: Verify Camera button overlay (aria-label="Change photo") is present
    const cameraBtn = page.locator('button[aria-label="Change photo"]');
    await expect(cameraBtn).toBeVisible({ timeout: 10000 });
    await snap(page, 'e2e-avatar-01', 'upload-area');

    // Step 3: Verify file input for avatar upload exists
    const fileInput = page.locator('input[type="file"]').first();
    const inputCount = await fileInput.count();
    expect(inputCount).toBeGreaterThan(0);

    const acceptAttr = await fileInput.getAttribute('accept');
    expect(acceptAttr).toMatch(/image/);
    await snap(page, 'e2e-avatar-01', 'file-input-present');

    // Step 4: Verify the upload API endpoint exists
    const response = await apiRequest(page, 'PUT', '/users/me/avatar', { avatarUrl: 'not-a-url' });
    expect(response.status()).not.toBe(404);
    expect([400, 401, 403, 422]).toContain(response.status());
    await snap(page, 'e2e-avatar-01', 'endpoint-verified');

    await takeScreenshots(page, 'profile');
  });

  test('E2E-AVATAR-02: Profile page edit form shows and cancel preserves original value', async ({ page }) => {

    // Step 1: Navigate to Profile page
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Post-check: profile loaded with user name heading
    const heading = page.locator('h2').first();
    await expect(heading).toBeVisible({ timeout: 15000 });
    const initialNameText = await heading.textContent();
    await snap(page, 'e2e-avatar-02', 'profile-before-edit');

    // Step 2: Click Edit button
    const editBtn = page.locator('button').filter({ hasText: /Edit/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await expect(editBtn).toBeEnabled();
    await editBtn.click();
    await page.waitForTimeout(500);

    // Post-check: Edit form appears with Full Name input
    const fullNameInput = page.locator('input[placeholder="Your full name"]').first();
    await expect(fullNameInput).toBeVisible({ timeout: 5000 });
    await snap(page, 'e2e-avatar-02', 'edit-form-open');

    // Step 3: Type a changed name
    await fullNameInput.clear();
    await fullNameInput.fill('Test Changed Name');
    await page.waitForTimeout(300);

    // Step 4: Click Cancel
    const cancelBtn = page.locator('button').filter({ hasText: /Cancel/i }).first();
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    await page.waitForTimeout(500);

    // Post-check: heading shows original name (not "Test Changed Name")
    await expect(page.locator('h2').first()).toBeVisible();
    const afterCancelText = await page.locator('h2').first().textContent();
    expect(afterCancelText).not.toBe('Test Changed Name');
    expect(afterCancelText).toBe(initialNameText);
    await snap(page, 'e2e-avatar-02', 'after-cancel');
  });

  test('E2E-AVATAR-03: PUT /users/me/avatar validates URL format (NEGATIVE)', async ({ page }) => {
    // Step 1: Navigate to profile to establish session
    // Note: page may crash due to getInitials bug — we only need the session/cookie
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Step 2: Send invalid avatar URL to the API
    const invalidResponse = await apiRequest(page, 'PUT', '/users/me/avatar', { avatarUrl: 'not-a-valid-url' });

    // Post-check: server returns 400 Bad Request for invalid URL
    expect(invalidResponse.status()).toBe(400);
    const errorBody = await invalidResponse.json();
    expect(errorBody).toHaveProperty('message');
    await snap(page, 'e2e-avatar-03', 'invalid-url-rejected');

    // Step 3: Send valid HTTPS URL — should succeed (200)
    const validResponse = await apiRequest(page, 'PUT', '/users/me/avatar', {
      avatarUrl: 'https://example.com/valid-avatar.png',
    });

    // Post-check: 200 OK for valid URL
    expect(validResponse.status()).toBe(200);
    await snap(page, 'e2e-avatar-03', 'valid-url-accepted');
  });
});
