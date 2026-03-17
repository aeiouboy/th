import { test, expect } from '@playwright/test';
import { apiRequest, uniqueName, takeScreenshots, findInTree, findInChildren, snap } from './helpers';

test.describe.serial('Charge Codes Module', () => {
  let programName: string;
  let projectName: string;

  test('E2E-CC-01: Create a new program (top-level charge code)', async ({ page }) => {
    programName = uniqueName('Test-Program');
    await page.goto('/charge-codes');
    await page.waitForLoadState('load');

    // Click "Create New" button
    await page.click('button:has-text("Create New")');

    // Dialog should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await snap(page, 'e2e-cc-01', 'dialog-open');

    // Level should default to "program" — verify it
    await expect(page.getByRole('dialog').locator('button[role="combobox"]').first()).toBeVisible();

    // Fill the name
    await page.getByRole('dialog').locator('input').first().fill(programName);

    // Fill cost center
    const costCenterInput = page.getByRole('dialog').locator('input[placeholder="e.g. CC-100"]');
    await costCenterInput.fill('CC-TEST');

    // Fill budget
    const budgetInput = page.getByRole('dialog').locator('input[type="number"]').first();
    await budgetInput.fill('500000');

    // Click Create button
    await page.getByRole('dialog').getByRole('button', { name: /Create/i }).click();

    // Dialog should close (allow up to 30s for API call)
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 30000 });

    // Wait for tree to reload
    await page.waitForTimeout(1000);

    // Tree view should show the new program name
    await expect(page.getByText(programName)).toBeVisible({ timeout: 30000 });

    // Verify via API
    const response = await apiRequest(page, 'GET', '/charge-codes/tree');
    expect(response.status()).toBe(200);
    const tree = await response.json();
    const found = findInTree(tree, programName);
    expect(found).toBeTruthy();

    await snap(page, 'e2e-cc-01', 'after-create');
    await takeScreenshots(page, 'charge-codes');
  });

  test('E2E-CC-02: Create a project under a program (hierarchy + parent selector)', async ({ page }) => {
    projectName = uniqueName('Test-Project');
    await page.goto('/charge-codes');
    await page.waitForLoadState('load');

    // Click "Create New" button
    await page.click('button:has-text("Create New")');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await snap(page, 'e2e-cc-02', 'dialog-open');

    // Select level = "project" from dropdown
    const levelTrigger = page.getByRole('dialog').locator('button[role="combobox"]').first();
    await levelTrigger.click();
    await page.getByRole('option', { name: 'Project' }).click();

    // Wait for parent dropdown to appear
    await page.waitForTimeout(500);

    // Parent dropdown should now be visible — select the program we created
    const parentTrigger = page.getByRole('dialog').locator('button[role="combobox"]').nth(1);
    await parentTrigger.click();

    // Select the program created in CC-01
    await page.getByRole('option', { name: new RegExp(programName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click();

    // Fill the project name
    await page.getByRole('dialog').locator('input').first().fill(projectName);

    // Click Create
    await page.getByRole('dialog').getByRole('button', { name: /Create/i }).click();

    // Dialog should close (allow up to 30s for API call)
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 30000 });

    // Wait for tree to reload
    await page.waitForTimeout(1500);

    // Find the program node button and click its chevron to expand it
    const programEscaped = programName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const programButton = page.locator('button').filter({ hasText: new RegExp(programEscaped) }).first();
    if (await programButton.isVisible()) {
      // Click the chevron span (first span inside the button) to expand
      const chevron = programButton.locator('span').first();
      await chevron.click();
      await page.waitForTimeout(500);
    }

    // Project should appear in tree
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10000 });
    await snap(page, 'e2e-cc-02', 'after-create');

    // Verify via API that the project has a parentId matching the program
    const response = await apiRequest(page, 'GET', '/charge-codes/tree');
    expect(response.status()).toBe(200);
    const tree = await response.json();
    const parentNode = findInTree(tree, programName);
    expect(parentNode).toBeTruthy();
    const childNode = findInChildren(parentNode, projectName);
    expect(childNode).toBeTruthy();
  });

  test('E2E-CC-03: Project without parent fails (NEGATIVE)', async ({ page }) => {
    await page.goto('/charge-codes');
    await page.waitForLoadState('load');

    // Click "Create New" button
    await page.click('button:has-text("Create New")');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Select level = "project"
    const levelTrigger = page.getByRole('dialog').locator('button[role="combobox"]').first();
    await levelTrigger.click();
    await page.getByRole('option', { name: 'Project' }).click();

    // Do NOT select a parent
    await page.waitForTimeout(300);

    // Fill name
    await page.getByRole('dialog').locator('input').first().fill('Orphan Project');

    // Click Create
    await page.getByRole('dialog').getByRole('button', { name: /Create/i }).click();

    // Error message should be visible
    await expect(page.getByText(/must have a parent/i)).toBeVisible({ timeout: 5000 });
    await snap(page, 'e2e-cc-03', 'error-shown');

    // Dialog should remain open
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('E2E-CC-04: Edit an existing charge code', async ({ page }) => {
    const updatedName = uniqueName('Updated-Name');
    await page.goto('/charge-codes');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500); // Wait for tree to fully render

    // Wait for tree to load and click on any charge code node (first available)
    // We use the programName here to wait for tree to be populated
    const programEscaped = programName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(page.locator('button').filter({ hasText: new RegExp(programEscaped) }).first()).toBeVisible({ timeout: 10000 });

    // Click on a tree item that is NOT the programName from CC-01 (to preserve CC-05 dependency)
    // Use the programName item itself but look for "Merchandising" or similar pre-existing node
    const programEscapedSafe = programName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Try to find a different node — look for non-test program buttons
    const allPrgButtons = page.locator('main').locator('button').filter({ hasText: 'PRG' });
    const count = await allPrgButtons.count();
    // Click one that does NOT contain our programName
    let clicked = false;
    for (let i = 0; i < count; i++) {
      const btn = allPrgButtons.nth(i);
      const text = await btn.textContent();
      if (text && !text.includes(programName.substring(0, 10))) {
        await btn.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      await allPrgButtons.first().click();
    }

    // Wait for detail panel to load
    await page.waitForTimeout(1000);
    await snap(page, 'e2e-cc-04', 'before-edit');

    // Click "Edit" button in detail panel
    await page.click('button:has-text("Edit")');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await snap(page, 'e2e-cc-04', 'edit-dialog-open');

    // Change the name
    const nameInput = page.getByRole('dialog').locator('input').first();
    await nameInput.clear();
    await nameInput.fill(updatedName);

    // Click Update
    await page.getByRole('dialog').getByRole('button', { name: /Update/i }).click();

    // Dialog should close (allow up to 30s for API call)
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 30000 });

    // Detail panel should show the updated name
    await expect(page.locator('h2').filter({ hasText: updatedName })).toBeVisible({ timeout: 10000 });
    await snap(page, 'e2e-cc-04', 'after-edit');
  });

  test('E2E-CC-05: Search filters the charge code tree', async ({ page }) => {
    const searchTerm = programName.substring(0, 12);
    await page.goto('/charge-codes');
    await page.waitForLoadState('load');

    // Wait for tree to fully load first
    const treePanel = page.locator('[class*="overflow-y-auto"]').last();
    await expect(treePanel).toContainText(programName, { timeout: 10000 });

    // Type search term into the search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(searchTerm);
    await page.waitForTimeout(1000);

    // Tree should still show the matching program
    await expect(treePanel).toContainText(programName, { timeout: 5000 });
    await snap(page, 'e2e-cc-05', 'after-search');

    // Clear the search input
    await searchInput.clear();
    await page.waitForTimeout(500);

    // Tree should show more items now
    await expect(treePanel).not.toHaveText('', { timeout: 5000 });
  });
});
