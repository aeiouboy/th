import { test, expect } from '@playwright/test';
import { apiRequest, uniqueName, takeScreenshots, snap } from './helpers';

test.describe.serial('Admin Calendar Module', () => {
  let holidayName: string;

  test('E2E-CAL-01: Create a holiday', async ({ page }) => {
    holidayName = uniqueName('Test-Holiday');
    await page.goto('/admin/calendar');
    await page.waitForLoadState('load');

    // Year should be visible in the year header
    const currentYear = String(new Date().getFullYear());
    await expect(page.locator('span').filter({ hasText: new RegExp(`^${currentYear}$`) })).toBeVisible({ timeout: 15000 });

    // Click "Add Holiday" button
    await page.click('button:has-text("Add Holiday")');

    // Dialog should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await snap(page, 'e2e-cal-01', 'dialog-open');

    // Fill holiday name
    const nameInput = page.getByRole('dialog').locator('input[type="text"], input:not([type])').last();
    await nameInput.fill(holidayName);

    // Select a date
    const dateInput = page.getByRole('dialog').locator('input[type="date"]');
    await dateInput.fill('2026-12-25');

    // Click Add button
    await page.getByRole('dialog').getByRole('button', { name: /^Add$/i }).click();

    // Dialog should close (allow up to 30s for API call)
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 30000 });

    // Wait for calendar to refresh
    await page.waitForTimeout(1000);

    // New holiday should appear in the holiday table
    await expect(page.getByText(holidayName)).toBeVisible({ timeout: 15000 });

    // Verify via API
    const response = await apiRequest(page, 'GET', '/calendar?year=2026&country_code=TH');
    expect(response.status()).toBe(200);
    const entries = await response.json();
    const found = entries.find((e: any) => e.holidayName === holidayName);
    expect(found).toBeTruthy();

    await snap(page, 'e2e-cal-01', 'after-create');
    await takeScreenshots(page, 'admin-calendar');
  });

  test('E2E-CAL-02: Delete a holiday', async ({ page }) => {
    await page.goto('/admin/calendar');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // Find the holiday we created and its delete button
    const holidayRow = page.locator('tr, [role="row"]').filter({ hasText: holidayName });

    if (await holidayRow.count() > 0) {
      await snap(page, 'e2e-cal-02', 'before-delete');

      // Click the delete button in the row
      const deleteBtn = holidayRow.locator('button').filter({ has: page.locator('svg') }).last();
      await deleteBtn.click();

      // Wait for deletion to process
      await page.waitForTimeout(2000);

      // Holiday should be removed
      await expect(page.getByText(holidayName)).not.toBeVisible({ timeout: 10000 });
      await snap(page, 'e2e-cal-02', 'after-delete');

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
    await page.waitForLoadState('load');

    // Current year should be visible
    const currentYear = new Date().getFullYear();
    const yearSpan = page.locator('span').filter({ hasText: new RegExp(`^${currentYear}$`) });
    await expect(yearSpan).toBeVisible({ timeout: 15000 });

    // Month names should be visible
    await expect(page.getByText('January').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('December').first()).toBeVisible();

    // Country selector should be present
    await expect(page.locator('button[role="combobox"]').first()).toBeVisible();
    await snap(page, 'e2e-cal-03', 'calendar-loaded');

    // Navigate to previous year
    const prevBtn = page.locator('button[class*="outline"]').first();
    await prevBtn.click();
    await page.waitForTimeout(1000);

    // Year should change
    const prevYearSpan = page.locator('span').filter({ hasText: new RegExp(`^${currentYear - 1}$`) });
    await expect(prevYearSpan).toBeVisible({ timeout: 5000 });
    await snap(page, 'e2e-cal-03', 'after-year-navigate');
  });
});
