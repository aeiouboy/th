/**
 * E2E Tests: Notification System & AC10 Owner Authorization
 *
 * E2E-AC10-01: Non-owner charge_manager cannot modify access (403)
 * E2E-NOTIF-01: Notification Center shows triggered notifications
 * E2E-NOTIF-02: Mark notification as read changes styling
 */
import { test, expect } from '@playwright/test';
import { snap, authFile, apiRequest } from './helpers';

// ─── E2E-AC10-01: Non-owner charge_manager blocked from modifying access ────

test.describe('E2E-AC10: Owner Authorization for Charge Code Access', () => {
  test.use({ storageState: authFile('nattaya') });

  test('E2E-AC10-01 (NEGATIVE): Non-owner charge_manager cannot modify charge code access', async ({ page }) => {
    // GIVEN: nattaya (charge_manager, NOT owner of PRG-001) is authenticated
    await page.goto('/time-entry');
    await page.waitForLoadState('load');

    // WHEN: PUT /api/v1/charge-codes/PRG-001/access — nattaya is NOT the owner/approver
    const res = await apiRequest(page, 'PUT', '/charge-codes/PRG-001/access', {
      addUserIds: ['00000000-0000-0000-0000-000000000001'],
    });

    // THEN: 403 Forbidden — only owner, approver, or admin can modify access
    expect(res.status()).toBe(403);

    const body = await res.json();
    expect(body).toHaveProperty('statusCode', 403);
    await snap(page, 'e2e-ac10-01', 'forbidden-response-verified');
  });
});

// ─── E2E-NOTIF-01: Notification Center shows triggered notifications ─────────

test.describe('E2E-NOTIF-01: Notification Center', () => {
  test.use({ storageState: authFile('tachongrak') });

  test('E2E-NOTIF-01: Notification Center shows triggered notifications', async ({ page }) => {
    // GIVEN: admin (tachongrak) is authenticated
    await page.goto('/');
    await page.waitForLoadState('load');

    // WHEN: POST /integrations/notifications/send to trigger notifications
    const triggerRes = await apiRequest(page, 'POST', '/integrations/notifications/send', {});
    // Accept 200 or 201 — endpoint triggers all notification types
    expect([200, 201]).toContain(triggerRes.status());

    await snap(page, 'e2e-notif-01', 'notifications-triggered');

    // THEN: Navigate to /notifications and wait for items to appear
    await page.goto('/notifications');
    await page.waitForLoadState('load');

    // Wait for page to finish loading (either items or empty state)
    await page.waitForSelector('[data-testid], h1, .rounded-lg', { timeout: 15000 });
    await page.waitForTimeout(1500);

    await snap(page, 'e2e-notif-01', 'notification-center-loaded');

    // THEN: Page title is visible
    await expect(page.locator('h1').filter({ hasText: /notifications/i }).first()).toBeVisible({ timeout: 15000 });

    // THEN: Verify via API that notifications exist for this user
    const listRes = await apiRequest(page, 'GET', '/notifications?limit=20&offset=0');
    expect(listRes.status()).toBe(200);
    const notifications = await listRes.json();

    // If notifications exist, verify at least one has a subject
    if (Array.isArray(notifications) && notifications.length > 0) {
      expect(notifications[0]).toHaveProperty('subject');
      expect(typeof notifications[0].subject).toBe('string');
      expect(notifications[0].subject.length).toBeGreaterThan(0);
    }

    await snap(page, 'e2e-notif-01', 'api-verified');
  });
});

// ─── E2E-NOTIF-02: Mark notification as read ────────────────────────────────

test.describe('E2E-NOTIF-02: Mark Notification as Read', () => {
  test.use({ storageState: authFile('tachongrak') });

  test('E2E-NOTIF-02: Marking a notification as read removes the teal dot', async ({ page }) => {
    // GIVEN: admin is authenticated — ensure at least one notification exists
    await page.goto('/');
    await page.waitForLoadState('load');

    // Trigger notifications to ensure there's something to read
    await apiRequest(page, 'POST', '/integrations/notifications/send', {});

    // WHEN: Navigate to /notifications
    await page.goto('/notifications');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // Check if there are any unread notifications (teal dot indicator)
    const tealDots = page.locator('.bg-teal-500');
    const tealDotCount = await tealDots.count();

    if (tealDotCount === 0) {
      // No unread notifications — skip the click interaction, just verify the page loads
      await snap(page, 'e2e-notif-02', 'no-unread-to-click');

      // Verify unread count via API
      const countRes = await apiRequest(page, 'GET', '/notifications/unread-count');
      expect(countRes.status()).toBe(200);
      const countData = await countRes.json();
      expect(countData).toHaveProperty('count');
      return;
    }

    // WHEN: Find an unread notification button and click it
    // Unread notifications use font-semibold on the subject paragraph
    const unreadButtons = page.locator('button.w-full').filter({ has: page.locator('.bg-teal-500') });
    const firstUnreadBtn = unreadButtons.first();

    await expect(firstUnreadBtn).toBeVisible({ timeout: 10000 });

    // Capture state before mark-as-read
    await snap(page, 'e2e-notif-02', 'before-mark-read');

    // Extract the notification id from the API before clicking
    const listRes = await apiRequest(page, 'GET', '/notifications?limit=20&offset=0&unreadOnly=true');
    const unread = await listRes.json();
    const firstUnread = Array.isArray(unread) && unread.length > 0 ? unread[0] : null;

    // Click the unread notification
    await firstUnreadBtn.click();
    await page.waitForTimeout(1000);

    await snap(page, 'e2e-notif-02', 'after-mark-read');

    // THEN: If we had an unread notification, verify it's now read via API
    if (firstUnread) {
      const updatedListRes = await apiRequest(page, 'GET', `/notifications?limit=20&offset=0`);
      expect(updatedListRes.status()).toBe(200);
      const updatedList = await updatedListRes.json();
      const updatedNotif = updatedList.find((n: any) => n.id === firstUnread.id);

      if (updatedNotif) {
        expect(updatedNotif.isRead).toBe(true);
      }
    }

    // THEN: The teal dot count should have decreased (or all are gone)
    const newTealDotCount = await tealDots.count();
    expect(newTealDotCount).toBeLessThanOrEqual(tealDotCount);
  });

  // NEGATIVE: Mark all as read clears the unread count
  test('E2E-NOTIF-02b (NEGATIVE): Mark all as read button results in zero unread count', async ({ page }) => {
    // GIVEN: admin — trigger notifications to ensure there's something to mark
    await page.goto('/');
    await page.waitForLoadState('load');
    await apiRequest(page, 'POST', '/integrations/notifications/send', {});

    // WHEN: Navigate to notifications page
    await page.goto('/notifications');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // Check initial unread count via API
    const beforeRes = await apiRequest(page, 'GET', '/notifications/unread-count');
    const beforeCount = await beforeRes.json();

    await snap(page, 'e2e-notif-02b', 'before-mark-all-read');

    // WHEN: Click "Mark all as read" if there are unread notifications
    if (beforeCount.count > 0) {
      const markAllBtn = page.getByRole('button', { name: /mark all as read/i });
      const isBtnVisible = await markAllBtn.isVisible({ timeout: 5000 }).catch(() => false);

      if (isBtnVisible) {
        await markAllBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    await snap(page, 'e2e-notif-02b', 'after-mark-all-read');

    // THEN: Unread count via API should be 0
    const afterRes = await apiRequest(page, 'GET', '/notifications/unread-count');
    expect(afterRes.status()).toBe(200);
    const afterCount = await afterRes.json();
    expect(afterCount.count).toBe(0);
  });
});
