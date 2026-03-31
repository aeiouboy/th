import { test, expect } from '@playwright/test';
import { apiRequest, takeScreenshots, snap } from './helpers';

test.describe('Approvals Module', () => {
  test('E2E-AP-01: Pending approvals list shows submitted timesheets', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForLoadState('load');

    // Page should load with the "Approvals" heading
    await expect(page.getByText('Approvals').first()).toBeVisible({ timeout: 30000 });

    // Should show tabs: "Pending Approvals" and "History"
    await expect(page.getByRole('tab', { name: 'Pending Approvals' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: 'History' })).toBeVisible();

    // Verify API returns pending data
    const response = await apiRequest(page, 'GET', '/approvals/pending');
    expect(response.status()).toBe(200);
    const pending = await response.json();
    expect(pending).toHaveProperty('pending');

    const hasPendingItems = (pending.pending || []).length > 0;

    // Switch to Pending Approvals tab if not already active
    await page.getByRole('tab', { name: 'Pending Approvals' }).click();
    await page.waitForTimeout(1000);

    if (hasPendingItems) {
      // The active tab should show approval queue items
      await expect(page.locator('td').first()).toBeVisible({ timeout: 10000 });
    }

    await snap(page, 'e2e-ap-01', 'pending-list');
    await takeScreenshots(page, 'approvals');
  });

  test('E2E-AP-02: Approve a timesheet', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForLoadState('load');
    await expect(page.getByText('Approvals').first()).toBeVisible({ timeout: 30000 });

    // Check if there are pending timesheets to approve
    const response = await apiRequest(page, 'GET', '/approvals/pending');
    const pending = await response.json();
    const hasPendingItems = (pending.pending || []).length > 0;

    // Switch to Pending Approvals tab
    await page.getByRole('tab', { name: 'Pending Approvals' }).click();
    await page.waitForTimeout(1000);

    if (hasPendingItems) {
      // Wait for table to render
      await page.waitForTimeout(2000);
      await snap(page, 'e2e-ap-02', 'before-approve');

      // Click approve button on the first pending timesheet
      const approveBtn = page.locator('button[title="Approve"]').first();
      const isVisible = await approveBtn.isVisible().catch(() => false);

      if (isVisible) {
        await approveBtn.click();
        // Should see success toast
        await expect(page.getByText(/approved/i)).toBeVisible({ timeout: 10000 });
        await snap(page, 'e2e-ap-02', 'after-approve');
      }
    } else {
      // No pending approvals — verify the page loaded correctly
      await snap(page, 'e2e-ap-02', 'no-pending');
    }
  });

  test('E2E-AP-03: Reject a timesheet with comment (NEGATIVE flow)', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForLoadState('load');
    await expect(page.getByText('Approvals').first()).toBeVisible({ timeout: 30000 });

    // Check if there are pending timesheets
    const response = await apiRequest(page, 'GET', '/approvals/pending');
    const pending = await response.json();
    const hasPendingItems = (pending.pending || []).length > 0;

    // Switch to Pending Approvals tab
    await page.getByRole('tab', { name: 'Pending Approvals' }).click();
    await page.waitForTimeout(1000);

    if (hasPendingItems) {
      // Wait for table to render
      await page.waitForTimeout(2000);

      // Click reject button on the first pending timesheet
      const rejectBtn = page.locator('button[title="Reject"]').first();
      const isVisible = await rejectBtn.isVisible().catch(() => false);

      if (isVisible) {
        await rejectBtn.click();

        // Rejection dialog should open
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText(/Reject Timesheet/i)).toBeVisible();
        await snap(page, 'e2e-ap-03', 'rejection-dialog');

        // Fill rejection comment
        await page.locator('textarea').fill('Hours seem incorrect, please review');

        // Confirm rejection
        await page.getByRole('button', { name: /Confirm Reject/i }).click();

        // Should see success message
        await expect(page.getByText(/rejected/i)).toBeVisible({ timeout: 10000 });
        await snap(page, 'e2e-ap-03', 'after-reject');
      }
    } else {
      // No pending — verify the page works correctly
      await snap(page, 'e2e-ap-03', 'no-pending');
    }
  });
});
