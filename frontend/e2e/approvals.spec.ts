import { test, expect } from '@playwright/test';
import { apiRequest, takeScreenshots } from './helpers';

test.describe('Approvals Module', () => {
  test('E2E-AP-01: Pending approvals list shows submitted timesheets', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Page should load with the "Approvals" heading (use h2 to avoid topbar h1 conflict)
    await expect(page.locator('h2').filter({ hasText: 'Approvals' })).toBeVisible({ timeout: 15000 });

    // Should show tabs: "As Manager" and "As CC Owner"
    await expect(page.getByText('As Manager')).toBeVisible();
    await expect(page.getByText('As CC Owner')).toBeVisible();

    // Verify API returns pending data
    const response = await apiRequest(page, 'GET', '/approvals/pending');
    expect(response.status()).toBe(200);
    const pending = await response.json();
    expect(pending).toHaveProperty('asManager');
    expect(pending).toHaveProperty('asCCOwner');

    const hasManagerItems = (pending.asManager || []).length > 0;
    const hasCCOwnerItems = (pending.asCCOwner || []).length > 0;

    // If CC Owner tab has items but Manager tab doesn't, switch to CC Owner tab
    if (!hasManagerItems && hasCCOwnerItems) {
      await page.getByText('As CC Owner').click();
      await page.waitForTimeout(1000);
    }

    if (hasManagerItems || hasCCOwnerItems) {
      // The active tab should show approval queue items (not "No pending approvals")
      await expect(page.locator('[data-slot="table-cell"], td').first()).toBeVisible({ timeout: 10000 });
    } else {
      // Empty state
      await expect(page.getByText(/No pending approvals/i)).toBeVisible({ timeout: 5000 });
    }

    await takeScreenshots(page, 'approvals');
  });

  test('E2E-AP-02: Approve a timesheet', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2').filter({ hasText: 'Approvals' })).toBeVisible({ timeout: 15000 });

    // Check if there are pending timesheets to approve
    const response = await apiRequest(page, 'GET', '/approvals/pending');
    const pending = await response.json();
    const hasManagerItems = (pending.asManager || []).length > 0;
    const hasCCOwnerItems = (pending.asCCOwner || []).length > 0;

    // Switch to the tab that has items
    if (!hasManagerItems && hasCCOwnerItems) {
      await page.getByText('As CC Owner').click();
      await page.waitForTimeout(1000);
    }

    if (hasManagerItems || hasCCOwnerItems) {
      // Wait for table to render
      await page.waitForTimeout(2000);

      // Click approve button (green checkmark) on the first pending timesheet
      const approveBtn = page.locator('button[title="Approve"]').first();
      const isVisible = await approveBtn.isVisible().catch(() => false);

      if (isVisible) {
        await approveBtn.click();
        // Should see success toast
        await expect(page.getByText(/approved/i)).toBeVisible({ timeout: 10000 });
      }
    } else {
      // No pending approvals — verify empty state is shown
      await expect(page.getByText(/No pending approvals/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('E2E-AP-03: Reject a timesheet with comment (NEGATIVE flow)', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2').filter({ hasText: 'Approvals' })).toBeVisible({ timeout: 15000 });

    // Check if there are pending timesheets
    const response = await apiRequest(page, 'GET', '/approvals/pending');
    const pending = await response.json();
    const hasManagerItems = (pending.asManager || []).length > 0;
    const hasCCOwnerItems = (pending.asCCOwner || []).length > 0;

    // Switch to the tab that has items
    if (!hasManagerItems && hasCCOwnerItems) {
      await page.getByText('As CC Owner').click();
      await page.waitForTimeout(1000);
    }

    if (hasManagerItems || hasCCOwnerItems) {
      // Wait for table to render
      await page.waitForTimeout(2000);

      // Click reject button (X icon) on the first pending timesheet
      const rejectBtn = page.locator('button[title="Reject"]').first();
      const isVisible = await rejectBtn.isVisible().catch(() => false);

      if (isVisible) {
        await rejectBtn.click();

        // Rejection dialog should open
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText(/Reject Timesheet/i)).toBeVisible();

        // Fill rejection comment
        await page.locator('textarea').fill('Hours seem incorrect, please review');

        // Confirm rejection
        await page.getByRole('button', { name: /Confirm Reject/i }).click();

        // Should see success message
        await expect(page.getByText(/rejected/i)).toBeVisible({ timeout: 10000 });
      }
    } else {
      // No pending — verify the page works correctly
      await expect(page.getByText(/No pending approvals/i)).toBeVisible({ timeout: 5000 });
    }
  });
});
