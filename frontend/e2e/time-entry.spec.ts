import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/test-results/screenshots');

function getViewportName(width: number): string {
  return width <= 375 ? 'mobile' : 'desktop';
}

test.describe('Time Entry page', () => {
  test('renders time entry page with core elements', async ({ page, viewport }) => {
    await page.goto('/time-entry');
    await expect(page).not.toHaveURL('/login');

    // Check page heading (layout h1)
    await expect(page.getByRole('heading', { name: 'Time Entry' })).toBeVisible();

    // Check period navigator — "Week of ..." text in h2
    await expect(page.getByText(/Week of/)).toBeVisible();

    // Check Week / Bi-week toggle buttons
    await expect(page.getByRole('button', { name: 'Week', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bi-week', exact: true })).toBeVisible();

    // Check action buttons
    await expect(page.getByRole('button', { name: 'Save Draft' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Submit/ })).toBeVisible();

    // Screenshot
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    const vp = getViewportName(viewport?.width ?? 1280);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `time-entry--${vp}.png`),
      fullPage: false,
    });
  });

  test('week navigation buttons are present', async ({ page }) => {
    await page.goto('/time-entry');
    // Previous/next week chevron buttons
    const navButtons = page.locator('button.h-8.w-8.p-0');
    await expect(navButtons.first()).toBeVisible();
  });

  test('timesheet grid shows rows with mock data', async ({ page }) => {
    await page.goto('/time-entry');
    // Mock data includes "Web Portal", "Code Review", "Meetings"
    await expect(page.getByText('Web Portal').first()).toBeVisible();
    await expect(page.getByText('Code Review').first()).toBeVisible();
    await expect(page.getByText('Meetings').first()).toBeVisible();
  });

  test('biweek toggle switches view mode', async ({ page }) => {
    await page.goto('/time-entry');
    const biweekBtn = page.getByRole('button', { name: 'Bi-week', exact: true });
    await biweekBtn.click();
    // After click, bi-week should be active (has the teal background)
    // Check the button's class contains the active styling
    await expect(biweekBtn).toHaveAttribute('class', /bg-\[var\(--accent-teal\)\]/);
  });
});
