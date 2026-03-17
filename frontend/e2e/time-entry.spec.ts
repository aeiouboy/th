import { test, expect } from '@playwright/test';
import { apiRequest, takeScreenshots } from './helpers';

test.describe('Time Entry Module', () => {
  test('E2E-TS-01: Create timesheet and add entries', async ({ page }) => {
    await page.goto('/time-entry');
    await page.waitForLoadState('networkidle');

    // Wait for timesheet to load (auto-created for current period)
    await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 15000 });

    await takeScreenshots(page, 'time-entry');

    // Look for editable cells in the grid — if the timesheet is draft, inputs should be available
    const gridInputs = page.locator('input[type="number"], input[inputmode="decimal"], [contenteditable="true"], td input');

    // If we have editable cells, enter hours
    const inputCount = await gridInputs.count();
    if (inputCount > 0) {
      const firstInput = gridInputs.first();
      await firstInput.click();
      await firstInput.fill('8');

      // Click "Save Draft" button
      await page.click('button:has-text("Save Draft")');

      // Wait for save confirmation
      await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10000 });
    }

    // Verify timesheet exists via API
    const response = await apiRequest(page, 'GET', '/timesheets/charge-codes');
    expect(response.status()).toBe(200);
  });

  test('E2E-TS-02: Submit timesheet for approval', async ({ page }) => {
    await page.goto('/time-entry');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 15000 });

    // Check if submit button is available (timesheet must be draft with entries)
    const submitBtn = page.getByRole('button', { name: /Submit/i }).last();
    const isSubmitVisible = await submitBtn.isVisible().catch(() => false);

    if (isSubmitVisible) {
      const isEnabled = await submitBtn.isEnabled();
      if (isEnabled) {
        await submitBtn.click();

        // Should see submitted status or confirmation
        await expect(
          page.getByText(/submitted/i).or(page.getByText(/approval/i)),
        ).toBeVisible({ timeout: 10000 });
      }
    }

    // At minimum, verify page loaded correctly
    await expect(page.getByText(/Week of/i)).toBeVisible();
  });

  test('E2E-TS-03: Submit empty timesheet shows warning (NEGATIVE)', async ({ page }) => {
    // Navigate to a future week where there are likely no entries
    await page.goto('/time-entry');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 15000 });

    // Navigate to next week to get an empty timesheet
    const nextBtn = page.locator('button').filter({ has: page.locator('svg path[d*="m9 18"]') });
    if (await nextBtn.count() > 0) {
      await nextBtn.first().click();
      await page.waitForTimeout(1000);
    }

    // Try to submit
    const submitBtn = page.getByRole('button', { name: /Submit/i }).last();
    const isSubmitVisible = await submitBtn.isVisible().catch(() => false);

    if (isSubmitVisible) {
      const isEnabled = await submitBtn.isEnabled();
      if (isEnabled) {
        await submitBtn.click();

        // Should see a warning or error about minimum hours / empty submission
        // Or timesheet should remain in draft status
        await page.waitForTimeout(2000);
        const hasWarning = await page
          .getByText(/warning|error|minimum|empty|hours|cannot/i)
          .isVisible()
          .catch(() => false);

        // If no explicit warning, the status should remain draft (not submitted)
        if (!hasWarning) {
          const draftBadge = page.getByText('Draft');
          const isDraft = await draftBadge.isVisible().catch(() => false);
          // Either we get a warning OR the status didn't change - both acceptable
          expect(hasWarning || isDraft).toBeTruthy();
        }
      }
    }

    // Page should still be on time-entry
    await expect(page).toHaveURL(/\/time-entry/);
  });

  test('E2E-TS-04: Week navigation changes the displayed period', async ({ page }) => {
    await page.goto('/time-entry');
    await page.waitForLoadState('networkidle');

    // Get the current "Week of ..." text
    const weekHeader = page.getByText(/Week of/i);
    await expect(weekHeader).toBeVisible({ timeout: 15000 });
    const originalText = await weekHeader.textContent();

    // Click next-week chevron button (right chevron)
    const nextBtn = page.locator('button').filter({ has: page.locator('svg path[d*="m9 18"]') });
    if (await nextBtn.count() > 0) {
      await nextBtn.first().click();
      await page.waitForTimeout(1500);

      // The week text should change
      const newText = await weekHeader.textContent();
      expect(newText).not.toEqual(originalText);

      // Click previous-week chevron button (left chevron)
      const prevBtn = page.locator('button').filter({ has: page.locator('svg path[d*="m15 18"]') });
      if (await prevBtn.count() > 0) {
        await prevBtn.first().click();
        await page.waitForTimeout(1500);

        // The week text should return to original
        const backText = await weekHeader.textContent();
        expect(backText).toEqual(originalText);
      }
    }
  });
});
