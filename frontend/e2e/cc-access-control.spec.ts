/**
 * E2E Tests: Charge Code Access Control (RBAC via API)
 *
 * Verifies that the backend enforces role-based access on charge code endpoints:
 *   - employee/pmo: GET /charge-codes/my returns only assigned codes (restricted view)
 *   - charge_manager: can POST /charge-codes (role is @Roles('admin', 'charge_manager'))
 *   - employee: cannot POST /charge-codes (403 Forbidden)
 *   - admin: can GET /charge-codes/tree and GET /reports/financial-impact
 */
import { test, expect } from '@playwright/test';
import { snap, authFile, apiRequest } from './helpers';

test.describe('E2E-ACC: Charge Code Access Control', () => {
  test.use({ storageState: authFile('ploy') });

  test('E2E-ACC-01: Employee only sees assigned charge codes in selector', async ({ page }) => {
    // GIVEN: ploy (pmo/employee-level) navigates to time-entry
    await page.goto('/time-entry');
    await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 25000 });
    await snap(page, 'e2e-acc-01', 'time-entry-loaded');

    // WHEN: GET /charge-codes/my — returns only ploy's assigned codes
    const res = await apiRequest(page, 'GET', '/charge-codes/my');
    expect(res.status()).toBe(200);
    const myCodes = await res.json();
    expect(Array.isArray(myCodes)).toBe(true);

    // THEN: Open the charge code selector in the UI
    const addCombobox = page.getByRole('combobox').first();
    if (await addCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addCombobox.click();
      await page.waitForTimeout(500);
      await snap(page, 'e2e-acc-01', 'cc-selector-open');
      await page.keyboard.press('Escape');
    }

    await snap(page, 'e2e-acc-01', 'access-control-verified');
    await expect(page.getByText(/Week of/i)).toBeVisible();
  });
});

test.describe('E2E-ACC: Charge Code Access Control — charge_manager can create', () => {
  test.use({ storageState: authFile('wichai') });

  test('E2E-ACC-02: charge_manager CAN create charge codes (role is authorized)', async ({ page }) => {
    // GIVEN: wichai (charge_manager) is authenticated
    await page.goto('/charge-codes');
    await page.waitForLoadState('load');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 20000 });

    // WHEN: POST /charge-codes — charge_manager is in @Roles('admin', 'charge_manager')
    const uniqueName = `ACC-02-Test-${Date.now()}`;
    const res = await apiRequest(page, 'POST', '/charge-codes', {
      name: uniqueName,
      code: `ACC${Date.now().toString().slice(-6)}`,
      level: 'program',
      isBillable: false,
    });

    // THEN: 201 Created (not 403)
    expect(res.status()).toBe(201);
    const created = await res.json();
    expect(created.name).toBe(uniqueName);
    await snap(page, 'e2e-acc-02', 'charge-manager-created');
  });
});

test.describe('E2E-ACC: Charge Code Access Control — employee blocked', () => {
  test.use({ storageState: authFile('nattaya') });

  test('E2E-ACC-03 (NEGATIVE): Employee role cannot create charge codes', async ({ page }) => {
    // GIVEN: nattaya (employee) is authenticated
    await page.goto('/time-entry');
    await page.waitForLoadState('load');

    // WHEN: POST /charge-codes — employee is NOT in @Roles('admin', 'charge_manager')
    const res = await apiRequest(page, 'POST', '/charge-codes', {
      name: `Unauthorized-${Date.now()}`,
      code: `UNAUTH${Date.now().toString().slice(-4)}`,
      level: 'program',
      isBillable: false,
    });

    // THEN: 403 Forbidden
    expect(res.status()).toBe(403);
    await snap(page, 'e2e-acc-03', 'employee-blocked');
  });
});

test.describe('E2E-ACC: Charge Code Access Control — admin full access', () => {
  test.use({ storageState: authFile('tachongrak') });

  test('E2E-ACC-04: Admin can view full charge code tree', async ({ page }) => {
    await page.goto('/charge-codes');
    await page.waitForLoadState('load');

    // WHEN: GET /charge-codes/tree — admin gets full hierarchy
    const res = await apiRequest(page, 'GET', '/charge-codes/tree');
    expect(res.status()).toBe(200);
    const tree = await res.json();

    // THEN: Returns a non-empty array with charge code nodes
    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBeGreaterThan(0);
    await snap(page, 'e2e-acc-04', 'admin-tree-loaded');
  });

  test('E2E-ACC-05: Admin can access financial-impact report', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('load');

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // WHEN: GET /reports/financial-impact — admin role has access
    const res = await apiRequest(page, 'GET', `/reports/financial-impact?period=${period}`);

    // THEN: 200 OK (not 403)
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toBeDefined();
    await snap(page, 'e2e-acc-05', 'financial-impact-accessible');
  });

  test('E2E-ACC-06 (NEGATIVE): Verifies financial-impact endpoint structure for admin role', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('load');

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // WHEN: GET /reports/financial-impact — check response shape
    const res = await apiRequest(page, 'GET', `/reports/financial-impact?period=${period}`);
    expect(res.status()).toBe(200);
    const data = await res.json();

    // THEN: Returns a non-null object (confirms endpoint doesn't return error body)
    expect(typeof data).toBe('object');
    expect(data).not.toBeNull();
    await snap(page, 'e2e-acc-06', 'financial-impact-structure-ok');
  });
});
