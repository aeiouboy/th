import { test, expect } from '@playwright/test';
import { apiRequest, uniqueName, takeScreenshots } from './helpers';

test.describe.serial('Admin Rates Module', () => {
  let testJobGrade: string;

  test('E2E-RATE-01: Rates table loads with real data', async ({ page }) => {
    await page.goto('/admin/rates');
    await page.waitForLoadState('networkidle');

    // "Active Rates" summary card should be visible
    await expect(page.getByText('Active Rates')).toBeVisible({ timeout: 15000 });

    // "Cost Rates" card title should be visible
    await expect(page.getByText('Cost Rates')).toBeVisible({ timeout: 10000 });

    // Table headers should include Job Grade, Hourly Rate, Effective From
    await expect(page.getByRole('columnheader', { name: 'Job Grade' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Hourly Rate' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Effective From' })).toBeVisible();

    await takeScreenshots(page, 'admin-rates');
  });

  test('E2E-RATE-02: Add a new cost rate', async ({ page }) => {
    testJobGrade = uniqueName('L-TEST');
    await page.goto('/admin/rates');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Cost Rates')).toBeVisible({ timeout: 15000 });

    // Click "Add Rate" button
    await page.click('button:has-text("Add Rate")');

    // Dialog should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Add New Rate')).toBeVisible();

    // Fill job grade
    const jobGradeInput = page.getByRole('dialog').locator('input').first();
    await jobGradeInput.fill(testJobGrade);

    // Fill hourly rate
    const rateInput = page.getByRole('dialog').locator('input[type="number"]');
    await rateInput.fill('125.50');

    // Fill effective from date
    const dateInputs = page.getByRole('dialog').locator('input[type="date"]');
    await dateInputs.first().fill('2026-01-01');

    // Click Add Rate button
    await page.getByRole('dialog').getByRole('button', { name: /Add.*Rate/i }).click();

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

    // Wait for table to refresh
    await page.waitForTimeout(1000);

    // New rate should appear in the rates table
    await expect(page.getByText(testJobGrade)).toBeVisible({ timeout: 10000 });
  });
});
