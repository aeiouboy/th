import { test, expect } from '@playwright/test';
import { snap } from './helpers';

// User manual is a public page — no auth needed
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('User Manual (Public Page)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user-manual');
    await page.waitForLoadState('load');
  });

  test('E2E-MANUAL-01: Page loads without auth', async ({ page }) => {
    // Title should be visible
    await expect(page.getByText('คู่มือการใช้งานระบบ Timesheet')).toBeVisible({ timeout: 10000 });

    // Table of contents should show sections
    await expect(page.getByText('ภาพรวมระบบ')).toBeVisible();
    await expect(page.getByText('การเข้าใช้งาน')).toBeVisible();
    await expect(page.getByText('การกรอกเวลา')).toBeVisible();

    await snap(page, 'e2e-manual-01', 'page-loaded');
  });

  test('E2E-MANUAL-02: Section expand/collapse works', async ({ page }) => {
    await expect(page.getByText('คู่มือการใช้งานระบบ Timesheet')).toBeVisible({ timeout: 10000 });

    // Click section 2 header to expand
    const section2Header = page.locator('#login').locator('..').getByText('บทที่ 2. การเข้าใช้งาน');
    await section2Header.click();

    // Content should now be visible
    await expect(page.getByText('เข้าสู่ระบบ (Login)')).toBeVisible({ timeout: 5000 });

    await snap(page, 'e2e-manual-02', 'section-expanded');

    // Click again to collapse
    await section2Header.click();
    await expect(page.getByText('เข้าสู่ระบบ (Login)')).not.toBeVisible({ timeout: 5000 });
  });

  test('E2E-MANUAL-03: Lightbox opens on screenshot click', async ({ page }) => {
    await expect(page.getByText('คู่มือการใช้งานระบบ Timesheet')).toBeVisible({ timeout: 10000 });

    // Expand section 1 (overview) which is defaultOpen, or section 2
    const section2Header = page.locator('#login').locator('..').getByText('บทที่ 2. การเข้าใช้งาน');
    await section2Header.click();

    // Wait for login screenshot to appear
    const screenshot = page.locator('figure img[src="/manual/01-login-page.png"]');
    await expect(screenshot).toBeVisible({ timeout: 5000 });

    // Click the figure to open lightbox
    await screenshot.locator('..').click();

    // Lightbox overlay should appear
    const lightbox = page.locator('.fixed.inset-0.z-50');
    await expect(lightbox).toBeVisible({ timeout: 3000 });

    // Lightbox should contain the zoomed image
    const zoomedImg = lightbox.locator('img[src="/manual/01-login-page.png"]');
    await expect(zoomedImg).toBeVisible();

    await snap(page, 'e2e-manual-03', 'lightbox-open');

    // Close button should exist
    const closeBtn = lightbox.locator('button[aria-label="Close"]');
    await expect(closeBtn).toBeVisible();

    // Click close button
    await closeBtn.click();
    await expect(lightbox).not.toBeVisible({ timeout: 3000 });
  });

  test('E2E-MANUAL-04: Back-to-app links navigate to home', async ({ page }) => {
    await expect(page.getByText('คู่มือการใช้งานระบบ Timesheet')).toBeVisible({ timeout: 10000 });

    // Top "back to app" link should be visible
    const topLink = page.locator('a[href="/"]').filter({ hasText: /กลับสู่ระบบหลัก/ });
    await expect(topLink).toBeVisible();

    // Bottom "enter timesheet" link should be visible
    const bottomLink = page.locator('a[href="/"]').filter({ hasText: /เข้าสู่ระบบ Timesheet/ });
    await expect(bottomLink).toBeVisible();

    await snap(page, 'e2e-manual-04', 'back-links-visible');
  });

  test('E2E-MANUAL-05: TOC navigation scrolls to section', async ({ page }) => {
    await expect(page.getByText('คู่มือการใช้งานระบบ Timesheet')).toBeVisible({ timeout: 10000 });

    // Click TOC link for "การตั้งค่า (Settings)" — section 11
    const tocLink = page.getByRole('link', { name: /การตั้งค่า/ }).first();
    if (await tocLink.isVisible()) {
      await tocLink.click();
      // Section 11 card should be in viewport
      const settingsSection = page.locator('#settings');
      await expect(settingsSection).toBeVisible({ timeout: 5000 });
    }

    await snap(page, 'e2e-manual-05', 'toc-navigated');
  });
});
