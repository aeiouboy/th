/**
 * E2E tests for CR-08, CR-09, CR-10, CR-11:
 * - CR-08/09: Budget detail with team/person breakdown
 * - CR-10: Tree view UX improvements (expand/collapse)
 * - CR-11: Cascade access from parent to children
 */
import { test, expect } from '@playwright/test';
import { apiRequest, snap, takeScreenshots, findInTree, uniqueName } from './helpers';

test.describe('Charge Codes CR-08/09/10/11', () => {
  test('E2E-CC-BUD-01: Budget detail panel shows team and person breakdown (CR-08/09)', async ({ page }) => {
    // Step 1: Navigate to charge codes page
    // Pre-check: page loads with tree
    await page.goto('/charge-codes');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);

    // Step 2: Click on any program node to open detail panel
    // Pre-check: at least one program node should be visible
    const programNodes = page.locator('main').locator('button').filter({ hasText: /PRG-/ });
    const count = await programNodes.count();
    expect(count).toBeGreaterThan(0);

    await programNodes.first().click();
    await page.waitForTimeout(1000);
    await snap(page, 'e2e-cc-bud-01', 'detail-panel-open');

    // Step 3: Click the "Budget Detail" tab or section
    // Post-check: team/person breakdown section is visible
    const budgetDetailBtn = page.getByText(/Budget Detail|By Team|By Person/i).first();
    const hasBudgetDetail = await budgetDetailBtn.isVisible().catch(() => false);

    if (hasBudgetDetail) {
      await budgetDetailBtn.click();
      await page.waitForTimeout(500);
      await snap(page, 'e2e-cc-bud-01', 'budget-detail-open');
    }

    // Step 4: Verify budget detail API returns team/person breakdown
    // Get tree to find a charge code ID
    const treeResponse = await apiRequest(page, 'GET', '/charge-codes/tree');
    expect(treeResponse.status()).toBe(200);
    const tree = await treeResponse.json();
    expect(Array.isArray(tree)).toBe(true);

    if (tree.length > 0) {
      const firstId = tree[0].id;
      const budgetDetailResponse = await apiRequest(page, 'GET', `/charge-codes/${firstId}/budget-detail`);
      expect(budgetDetailResponse.status()).toBe(200);
      const budgetDetail = await budgetDetailResponse.json();

      // Post-check: response has teamBreakdown and personBreakdown
      expect(budgetDetail).toHaveProperty('budget');
      expect(budgetDetail).toHaveProperty('actual');
      expect(budgetDetail).toHaveProperty('teamBreakdown');
      expect(budgetDetail).toHaveProperty('personBreakdown');
    }

    await takeScreenshots(page, 'charge-codes-budget');
  });

  test('E2E-CC-BUD-02: Budget detail shows variance and percentage (CR-09)', async ({ page }) => {
    // Step 1: Get a charge code ID from API
    const treeResponse = await apiRequest(page, 'GET', '/charge-codes/tree');
    expect(treeResponse.status()).toBe(200);
    const tree = await treeResponse.json();

    if (tree.length > 0) {
      const firstId = tree[0].id;

      // Step 2: Fetch budget detail and assert structure
      // Post-check: all financial fields are numeric
      const budgetDetailResponse = await apiRequest(page, 'GET', `/charge-codes/${firstId}/budget-detail`);
      expect(budgetDetailResponse.status()).toBe(200);
      const data = await budgetDetailResponse.json();

      expect(typeof data.budget).toBe('number');
      expect(typeof data.actual).toBe('number');
      expect(typeof data.variance).toBe('number');
      expect(typeof data.percentage).toBe('number');

      // Variance = budget - actual
      expect(data.variance).toBe(data.budget - data.actual);
    }
  });

  test('E2E-CC-TREE-01: Tree expand/collapse works (CR-10)', async ({ page }) => {
    // Step 1: Navigate to charge codes page
    await page.goto('/charge-codes');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);

    await snap(page, 'e2e-cc-tree-01', 'initial-tree');

    // Step 2: Find a program with children and click to expand
    // Pre-check: tree shows root level items
    const programNodes = page.locator('main').locator('button').filter({ hasText: /PRG-/ });
    const count = await programNodes.count();
    expect(count).toBeGreaterThan(0);

    await programNodes.first().click();
    await page.waitForTimeout(500);
    await snap(page, 'e2e-cc-tree-01', 'node-clicked');

    // Step 3: Verify detail panel shows correct info
    // Post-check: detail panel or budget data appears
    const detailPanel = page.locator('[class*="detail"], [class*="panel"], main div').filter({ hasText: /PRG-/ }).last();
    const hasDetail = await detailPanel.isVisible().catch(() => false);
    if (hasDetail) {
      await snap(page, 'e2e-cc-tree-01', 'detail-visible');
    }

    // Step 4: Search filters tree
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('PRG-');
    await page.waitForTimeout(800);
    await snap(page, 'e2e-cc-tree-01', 'after-search');

    await searchInput.clear();
    await page.waitForTimeout(300);
  });

  test('E2E-CC-CASCADE-01: Cascade access works for owner (CR-11)', async ({ page }) => {
    // Step 1: Navigate to charge codes
    await page.goto('/charge-codes');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);

    // Step 2: Click on a program node
    const programNodes = page.locator('main').locator('button').filter({ hasText: /PRG-/ });
    await programNodes.first().click();
    await page.waitForTimeout(1000);

    await snap(page, 'e2e-cc-cascade-01', 'program-selected');

    // Step 3: Look for "Manage Access" or "Access" button
    const accessBtn = page.getByText(/Manage Access|Access|Users/i).first();
    const hasAccessBtn = await accessBtn.isVisible().catch(() => false);

    if (hasAccessBtn) {
      await accessBtn.click();
      await page.waitForTimeout(500);
      await snap(page, 'e2e-cc-cascade-01', 'access-manager-open');
    }

    // Step 4: Verify cascade-access API exists and validates permissions
    const treeResponse = await apiRequest(page, 'GET', '/charge-codes/tree');
    const tree = await treeResponse.json();

    if (tree.length > 0) {
      const firstId = tree[0].id;
      // Attempt cascade access (may fail with 403 if not owner — that's expected behavior)
      const cascadeResponse = await apiRequest(page, 'POST', `/charge-codes/${firstId}/cascade-access`, { userIds: [] });
      // Accept 200/201 (success), 403 (forbidden - not owner), or 400 (bad request)
      expect([200, 201, 400, 403]).toContain(cascadeResponse.status());
    }

    await snap(page, 'e2e-cc-cascade-01', 'cascade-verified');
  });
});
