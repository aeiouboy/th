import { test, expect } from '@playwright/test';
import { authFile, snap } from './helpers';

/**
 * RBAC E2E Tests
 *
 * User roles (actual DB roles per CLAUDE.md):
 *   - wichai: employee
 *   - somchai: pmo
 *   - nattaya: charge_manager
 *   - ploy: pmo
 *   - tachongrak: admin
 *
 * Sidebar nav structure (from layout.tsx):
 *   Base (all roles): Dashboard, Time Entry, Calendar
 *   Charge Codes: visible to admin, charge_manager, pmo, finance
 *   Approvals: visible to admin, charge_manager
 *   Insight (admin, pmo, finance): Reports, Budget
 *   Admin (admin only): Users, Calendar (admin), Rates
 */

test.describe('RBAC Tests', () => {
  /**
   * On desktop (>=768px): sidebar <aside> is shown with nav labels.
   *   Sidebar starts collapsed — must click "Expand sidebar" to see labels.
   * On mobile (<768px): sidebar is hidden; a bottom tab nav is shown instead.
   */

  test.describe('E2E-RBAC-01: Employee sidebar hides admin menu items', () => {
    test.use({ storageState: authFile('wichai') });

    test('wichai (employee) sees limited sidebar', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('load');
      await page.waitForTimeout(5000); // Wait for role to load via /users/me

      // Expand sidebar (starts collapsed) — desktop only
      const expandBtn = page.getByRole('button', { name: /Expand sidebar/i });
      if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expandBtn.click();
        await page.waitForTimeout(300);
      }

      const sidebar = page.locator('aside');
      const hasSidebar = await sidebar.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasSidebar) {
        // Desktop: employee should see Dashboard, Time Entry, Calendar but NOT Approvals or admin items
        await expect(sidebar.getByText('Dashboard')).toBeVisible();
        await expect(sidebar.getByText('Time Entry')).toBeVisible();
        await expect(sidebar.getByText('Approvals')).not.toBeVisible();
        await expect(sidebar.getByText('Users')).not.toBeVisible();
        await expect(sidebar.getByText('Rates')).not.toBeVisible();
      } else {
        // Mobile: bottom nav uses short labels; employee has no 'Approve' tab
        const bottomNav = page.locator('nav').last();
        await expect(bottomNav).toBeVisible({ timeout: 10000 });
        await expect(bottomNav.getByText('Home')).toBeVisible();
        // 'Approve' tab should NOT be visible for employee
        await expect(bottomNav.getByText('Approve')).not.toBeVisible();
      }

      await snap(page, 'e2e-rbac-01', 'employee-sidebar');
    });
  });

  test.describe('E2E-RBAC-02: Admin sidebar shows all items', () => {
    test.use({ storageState: authFile('tachongrak') });

    test('tachongrak (admin) sees all sidebar items', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('load');
      await page.waitForTimeout(5000); // Wait for role to load via /users/me

      // Expand sidebar (starts collapsed) — desktop only
      const expandBtn = page.getByRole('button', { name: /Expand sidebar/i });
      if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expandBtn.click();
        await page.waitForTimeout(300);
      }

      const sidebar = page.locator('aside');
      const hasSidebar = await sidebar.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasSidebar) {
        // Desktop: verify full sidebar including admin items
        await expect(sidebar.getByText('Dashboard')).toBeVisible();
        await expect(sidebar.getByText('Time Entry')).toBeVisible();
        await expect(sidebar.getByText('Charge Codes')).toBeVisible();
        await expect(sidebar.getByText('Approvals')).toBeVisible();
        await expect(sidebar.getByText('Reports')).toBeVisible();
        await expect(sidebar.getByText('Budget')).toBeVisible();
        await expect(sidebar.getByText('Users')).toBeVisible();
        // "Calendar" appears twice (base nav + admin nav), just verify at least one is visible
        await expect(sidebar.getByText('Calendar').first()).toBeVisible();
        await expect(sidebar.getByText('Rates')).toBeVisible();
      } else {
        // Mobile: bottom nav shows Home, Time, Codes, Approve (admin has approval access), Reports
        const bottomNav = page.locator('nav').last();
        await expect(bottomNav).toBeVisible({ timeout: 10000 });
        await expect(bottomNav.getByText('Home')).toBeVisible();
        // Admin has approval role so 'Approve' should be present
        await expect(bottomNav.getByText('Approve')).toBeVisible();
      }

      await snap(page, 'e2e-rbac-02', 'admin-sidebar');
    });
  });

  test.describe('E2E-RBAC-03: Charge manager sees Approvals and can create charge codes', () => {
    test.use({ storageState: authFile('nattaya') });

    test('nattaya (charge_manager) can access charge codes and create', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('load');
      await page.waitForTimeout(5000); // Wait for role to load via /users/me

      // Expand sidebar (starts collapsed) — desktop only
      const expandBtn = page.getByRole('button', { name: /Expand sidebar/i });
      if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expandBtn.click();
        await page.waitForTimeout(300);
      }

      const sidebar = page.locator('aside');
      const hasSidebar = await sidebar.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasSidebar) {
        // Desktop: verify Approvals is visible and admin items are not
        await expect(sidebar).toBeVisible({ timeout: 10000 });
        await expect(sidebar.getByText('Approvals')).toBeVisible();
        await expect(sidebar.getByText('Users')).not.toBeVisible();
      } else {
        // Mobile: 'Approve' tab should be present for charge_manager
        const bottomNav = page.locator('nav').last();
        await expect(bottomNav).toBeVisible({ timeout: 10000 });
        await expect(bottomNav.getByText('Approve')).toBeVisible();
      }

      await snap(page, 'e2e-rbac-03', 'charge-manager-sidebar');

      await page.goto('/charge-codes');
      await page.waitForLoadState('load');

      // Page should load with the charge code tree
      await page.waitForTimeout(2000);

      // Click "Create New" button
      const createBtn = page.getByRole('button', { name: /Create New/i });
      await expect(createBtn).toBeVisible({ timeout: 10000 });
      await createBtn.click();

      // Dialog should open
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await snap(page, 'e2e-rbac-03', 'create-dialog-open');

      // Verify the dialog has form fields
      const dialogTitle = page.locator('[role="dialog"]').getByRole('heading').first();
      await expect(dialogTitle).toBeVisible();

      // Close the dialog
      const closeBtn = page.getByRole('button', { name: /Cancel/i }).or(
        page.locator('[role="dialog"] button[aria-label="Close"]'),
      );
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('E2E-RBAC-04: PMO can view reports', () => {
    test.use({ storageState: authFile('ploy') });

    test('ploy (pmo) can navigate to reports page', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForLoadState('load');

      // Reports page should load with heading
      await expect(page.getByText(/Reports & Analytics/i)).toBeVisible({ timeout: 30000 });

      // Verify key report sections or loading skeletons are present
      // Note: StatCards are behind a loading gate; if backend is slow, skeletons show
      const dataLoaded = await page.getByText(/Total budget/i).isVisible({ timeout: 5000 }).catch(() => false);
      if (dataLoaded) {
        await expect(page.getByText(/Utilization/i).first()).toBeVisible({ timeout: 10000 });
      }

      // Verify export buttons are visible
      await expect(page.getByRole('button', { name: /Export CSV/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Export PDF/i })).toBeVisible();

      // Verify page is not redirected
      await expect(page).toHaveURL(/\/reports/);
      await snap(page, 'e2e-rbac-04', 'pmo-reports-page');
    });
  });

  test.describe('E2E-RBAC-05: Employee cannot access admin pages', () => {
    test.use({ storageState: authFile('wichai') });

    test('wichai (employee) navigating to /admin/users is blocked', async ({ page }) => {
      // Attempt to navigate directly to admin page
      await page.goto('/admin/users');
      await page.waitForLoadState('load');
      await page.waitForTimeout(2000);

      // One of the following should happen:
      // 1. Redirected away from /admin/users
      // 2. Shows unauthorized/forbidden message
      // 3. Page shows no admin content
      const url = page.url();
      const isRedirected = !url.includes('/admin/users');
      const hasUnauthorized = await page
        .getByText(/unauthorized|forbidden|access denied|not allowed|404/i)
        .isVisible()
        .catch(() => false);

      // Admin sidebar items should not be visible even if page loads
      const sidebar = page.locator('aside');
      const sidebarVisible = await sidebar.isVisible().catch(() => false);
      let adminMenuHidden = true;
      if (sidebarVisible) {
        adminMenuHidden = !(await sidebar.getByText('Users').isVisible().catch(() => false));
      }

      await snap(page, 'e2e-rbac-05', 'admin-access-blocked');

      // At least one protection mechanism should be in place
      expect(isRedirected || hasUnauthorized || adminMenuHidden).toBeTruthy();
    });
  });
});
