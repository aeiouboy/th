import { test, expect } from '@playwright/test';
import { apiRequest, uniqueName, takeScreenshots } from './helpers';

test.describe.serial('Admin Calendar Module', () => {
  let holidayName: string;

  test('E2E-CAL-01: Create a holiday', async ({ page }) => {
    holidayName = uniqueName('Test-Holiday');
    await page.goto('/admin/calendar');
    await page.waitForLoadState('networkidle');

    // Year should be visible in the year header (use exact match on the year span)
    const currentYear = String(new Date().getFullYear());
    await expect(page.locator('span').filter({ hasText: new RegExp(`^${currentYear}$`) })).toBeVisible({ timeout: 15000 });

    // Click "Add Holiday" button
    await page.click('button:has-text("Add Holiday")');

    // Dialog should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Fill holiday name
    const nameInput = page.getByRole('dialog').locator('input[type="text"], input:not([type])').last();
    await nameInput.fill(holidayName);

    // Select a date (use a future date this year)
    const dateInput = page.getByRole('dialog').locator('input[type="date"]');
    await dateInput.fill('2026-12-25');

    // Click Add button
    await page.getByRole('dialog').getByRole('button', { name: /^Add$/i }).click();

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

    // Wait for calendar to refresh
    await page.waitForTimeout(1000);

    // New holiday should appear in the holiday table
    await expect(page.getByText(holidayName)).toBeVisible({ timeout: 10000 });

    // Verify via API
    const response = await apiRequest(page, 'GET', '/calendar?year=2026&country_code=TH');
    expect(response.status()).toBe(200);
    const entries = await response.json();
    const found = entries.find((e: any) => e.holidayName === holidayName);
    expect(found).toBeTruthy();

    await takeScreenshots(page, 'admin-calendar');
  });

  test('E2E-CAL-02: Delete a holiday', async ({ page }) => {
    await page.goto('/admin/calendar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find the holiday we created and its delete button
    const holidayRow = page.locator('tr, [role="row"]').filter({ hasText: holidayName });

    if (await holidayRow.count() > 0) {
      // Click the delete button (red trash icon) in the row
      const deleteBtn = holidayRow.locator('button').filter({ has: page.locator('svg') }).last();
      await deleteBtn.click();

      // Wait for deletion to process
      await page.waitForTimeout(2000);

      // Holiday should be removed
      await expect(page.getByText(holidayName)).not.toBeVisible({ timeout: 10000 });

      // Verify via API
      const response = await apiRequest(page, 'GET', '/calendar?year=2026&country_code=TH');
      expect(response.status()).toBe(200);
      const entries = await response.json();
      const found = entries.find((e: any) => e.holidayName === holidayName);
      expect(found).toBeFalsy();
    }
  });

  test('E2E-CAL-03: Calendar displays year and navigation', async ({ page }) => {
    await page.goto('/admin/calendar');
    await page.waitForLoadState('networkidle');

    // Current year should be visible in the year header span
    const currentYear = new Date().getFullYear();
    const yearSpan = page.locator('span').filter({ hasText: new RegExp(`^${currentYear}$`) });
    await expect(yearSpan).toBeVisible({ timeout: 15000 });

    // Month names should be visible in the calendar grid
    await expect(page.getByText('January').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('December').first()).toBeVisible();

    // Country selector should be present
    await expect(page.locator('button[role="combobox"]').first()).toBeVisible();

    // Navigate to previous year by clicking the left chevron button
    const prevBtn = page.locator('button[class*="outline"]').first();
    await prevBtn.click();
    await page.waitForTimeout(1000);

    // Year should change
    const prevYearSpan = page.locator('span').filter({ hasText: new RegExp(`^${currentYear - 1}$`) });
    await expect(prevYearSpan).toBeVisible({ timeout: 5000 });
  });
});
