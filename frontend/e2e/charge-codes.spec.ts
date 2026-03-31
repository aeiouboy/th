import { test, expect } from '@playwright/test';
import { apiRequest, uniqueName, takeScreenshots, findInTree, findInChildren, snap } from './helpers';

test.describe.serial('Charge Codes Module', () => {
  let programName: string;
  let projectName: string;
  const createdChargeCodeIds: string[] = [];

  test.afterAll(async ({ browser }) => {
    // Cleanup: delete any charge codes created during tests
    if (createdChargeCodeIds.length === 0) return;

    const context = await browser.newContext({ storageState: 'frontend/e2e/.auth/tachongrak.json' });
    const page = await context.newPage();
    await page.goto('/');

    // Delete children first (projects), then parents (programs)
    for (const id of createdChargeCodeIds.reverse()) {
      try {
        const res = await apiRequest(page, 'DELETE', `/charge-codes/${id}`);
        console.log(`Cleanup: deleted charge code ${id}, status=${res.status()}`);
      } catch (e) {
        console.warn(`Cleanup: failed to delete charge code ${id}:`, e);
      }
    }

    // Also cleanup any remaining Test-* or E2E-* charge codes via search
    try {
      const treeRes = await apiRequest(page, 'GET', '/charge-codes?search=Test-&limit=500');
      if (treeRes.ok()) {
        const data = await treeRes.json();
        const items = data.data || data;
        for (const item of items) {
          if (item.name?.startsWith('Test-') || item.name?.startsWith('E2E-')) {
            await apiRequest(page, 'DELETE', `/charge-codes/${item.id}`).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn('Cleanup: failed to search/delete remaining test charge codes:', e);
    }

    await context.close();
  });

  test('E2E-CC-01: Create a new program (top-level charge code)', async ({ page }) => {
    programName = uniqueName('Test-Program');
    const programCode = `PRG-T${Date.now().toString().slice(-5)}`;
    await page.goto('/charge-codes');
    await page.waitForLoadState('networkidle');

    // Wait for the "Create New" button (needs canManage state to resolve from /users/me API)
    const createBtn = page.getByRole('button', { name: /Create New/i });
    await expect(createBtn).toBeVisible({ timeout: 30000 });
    await createBtn.click();

    // Dialog should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await snap(page, 'e2e-cc-01', 'dialog-open');

    // Level should default to "program"
    // Fill the Charge Code ID
    const dialog = page.getByRole('dialog');
    const inputs = dialog.locator('input');

    // First input is Charge Code ID (placeholder "e.g. PRG-001, FY260001")
    await inputs.first().fill(programCode);

    // Second input is Name (placeholder "Charge code name")
    await dialog.locator('input[placeholder="Charge code name"]').fill(programName);

    // Select Owner (native select element)
    const ownerSelect = dialog.locator('select').first();
    await ownerSelect.waitFor({ state: 'visible', timeout: 10000 });
    // Wait for options to load
    await page.waitForTimeout(1000);
    const ownerOptions = await ownerSelect.locator('option').allTextContents();
    if (ownerOptions.length > 1) {
      // Select first actual user (skip "Select owner...")
      await ownerSelect.selectOption({ index: 1 });
    }

    // Fill cost center
    await dialog.locator('input[placeholder="e.g. CC-100"]').fill('CC-TEST');

    // Fill budget
    await dialog.locator('input[type="number"]').first().fill('500000');

    // Fill Valid From and Valid To
    await dialog.locator('input[type="date"]').first().fill('2026-01-01');
    await dialog.locator('input[type="date"]').last().fill('2026-12-31');

    // Click Create button
    await dialog.getByRole('button', { name: /Create/i }).click();

    // Dialog should close (allow up to 30s for API call)
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 30000 });

    // Wait for tree to reload
    await page.waitForTimeout(1000);

    // Verify via API
    const response = await apiRequest(page, 'GET', '/charge-codes/tree');
    expect(response.status()).toBe(200);
    const tree = await response.json();
    const found = findInTree(tree, programName);
    expect(found).toBeTruthy();
    if (found) createdChargeCodeIds.push(found.id);

    await snap(page, 'e2e-cc-01', 'after-create');
    await takeScreenshots(page, 'charge-codes');
  });

  test('E2E-CC-02: Create a project under a program (hierarchy + parent selector)', async ({ page }) => {
    test.setTimeout(240000);
    projectName = uniqueName('Test-Project');
    const projectCode = `PJ-T${Date.now().toString().slice(-5)}`;
    await page.goto('/charge-codes');
    await page.waitForLoadState('networkidle');

    // Click "Create New" button
    const createBtn = page.getByRole('button', { name: /Create New/i });
    await expect(createBtn).toBeVisible({ timeout: 30000 });
    await createBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await snap(page, 'e2e-cc-02', 'dialog-open');

    const dialog = page.getByRole('dialog');

    // Select level = "project" from dropdown
    const levelTrigger = dialog.locator('button[role="combobox"]').first();
    await levelTrigger.click();
    await page.getByRole('option', { name: 'Project' }).click();

    // Wait for parent dropdown to appear
    await page.waitForTimeout(500);

    // Parent dropdown should now be visible — select the program we created
    const parentTrigger = dialog.locator('button[role="combobox"]').nth(1);
    await parentTrigger.click();

    // Select the program created in CC-01
    await page.getByRole('option', { name: new RegExp(programName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click();

    // Fill Charge Code ID
    await dialog.locator('input').first().fill(projectCode);

    // Fill the project name
    await dialog.locator('input[placeholder="Charge code name"]').fill(projectName);

    // Select Owner
    const ownerSelect = dialog.locator('select').first();
    await ownerSelect.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(1000);
    const ownerOptions = await ownerSelect.locator('option').allTextContents();
    if (ownerOptions.length > 1) {
      await ownerSelect.selectOption({ index: 1 });
    }

    // Fill cost center
    await dialog.locator('input[placeholder="e.g. CC-100"]').fill('CC-TEST');

    // Fill budget
    await dialog.locator('input[type="number"]').first().fill('100000');

    // Fill Valid From and Valid To
    await dialog.locator('input[type="date"]').first().fill('2026-01-01');
    await dialog.locator('input[type="date"]').last().fill('2026-12-31');

    // Click Create
    await dialog.getByRole('button', { name: /Create/i }).click();

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 30000 });

    // Wait for tree to reload
    await page.waitForTimeout(1500);

    // Verify the project was created via API
    const verifyResponse = await apiRequest(page, 'GET', '/charge-codes/tree');
    expect(verifyResponse.status()).toBe(200);
    const verifyTree = await verifyResponse.json();
    const parentNode = findInTree(verifyTree, programName);
    expect(parentNode).toBeTruthy();
    const childNode = findInChildren(parentNode, projectName);
    expect(childNode).toBeTruthy();
    if (childNode) createdChargeCodeIds.push(childNode.id);

    await snap(page, 'e2e-cc-02', 'after-create');
  });

  test('E2E-CC-03: Project without parent fails (NEGATIVE)', async ({ page }) => {
    await page.goto('/charge-codes');
    await page.waitForLoadState('networkidle');

    // Click "Create New" button
    const createBtn = page.getByRole('button', { name: /Create New/i });
    await expect(createBtn).toBeVisible({ timeout: 30000 });
    await createBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    const dialog = page.getByRole('dialog');

    // Select level = "project"
    const levelTrigger = dialog.locator('button[role="combobox"]').first();
    await levelTrigger.click();
    await page.getByRole('option', { name: 'Project' }).click();

    // Do NOT select a parent
    await page.waitForTimeout(300);

    // Fill Charge Code ID
    await dialog.locator('input').first().fill(`ORPHAN-${Date.now()}`);

    // Fill name
    await dialog.locator('input[placeholder="Charge code name"]').fill('Orphan Project');

    // Click Create
    await dialog.getByRole('button', { name: /Create/i }).click();

    // Wait for validation to trigger
    await page.waitForTimeout(1000);

    // Dialog should remain open (validation prevents submission — either native HTML
    // required-field validation or custom error like "A project must have a parent")
    await expect(page.getByRole('dialog')).toBeVisible();
    await snap(page, 'e2e-cc-03', 'validation-prevented-submit');
  });

  test('E2E-CC-04: Edit an existing charge code', async ({ page }) => {
    const updatedName = uniqueName('Updated-Name');
    await page.goto('/charge-codes');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for tree to fully render

    // Wait for tree to load
    const programEscaped = programName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(page.locator('button').filter({ hasText: new RegExp(programEscaped) }).first()).toBeVisible({ timeout: 10000 });

    // Click on a tree item that is NOT the programName from CC-01
    const allPrgButtons = page.locator('main').locator('button').filter({ hasText: 'PRG' });
    const count = await allPrgButtons.count();
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

    const dialog = page.getByRole('dialog');

    // Change the name
    const nameInput = dialog.locator('input[placeholder="Charge code name"]');
    await nameInput.clear();
    await nameInput.fill(updatedName);

    // Ensure required fields are populated (they may be empty from existing data)
    // Owner
    const ownerSelect = dialog.locator('select').first();
    const ownerVal = await ownerSelect.inputValue();
    if (!ownerVal) {
      await page.waitForTimeout(1000); // Wait for user options to load
      await ownerSelect.selectOption({ index: 1 });
    }

    // Cost center
    const costCenterInput = dialog.locator('input[placeholder="e.g. CC-100"]');
    const costCenterVal = await costCenterInput.inputValue();
    if (!costCenterVal) {
      await costCenterInput.fill('CC-EDIT');
    }

    // Budget
    const budgetInput = dialog.locator('input[type="number"]').first();
    const budgetVal = await budgetInput.inputValue();
    if (!budgetVal) {
      await budgetInput.fill('100000');
    }

    // Valid From / Valid To
    const dateInputs = dialog.locator('input[type="date"]');
    const validFromVal = await dateInputs.first().inputValue();
    if (!validFromVal) {
      await dateInputs.first().fill('2026-01-01');
    }
    const validToVal = await dateInputs.last().inputValue();
    if (!validToVal) {
      await dateInputs.last().fill('2026-12-31');
    }

    // Click Update
    await dialog.getByRole('button', { name: /Update/i }).click();

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 30000 });

    // Detail panel should show the updated name
    await expect(page.locator('h2').filter({ hasText: updatedName })).toBeVisible({ timeout: 10000 });
    await snap(page, 'e2e-cc-04', 'after-edit');
  });

  test('E2E-CC-05: Search filters the charge code tree', async ({ page }) => {
    const searchTerm = programName.substring(0, 12);
    await page.goto('/charge-codes');
    await page.waitForLoadState('networkidle');

    // Wait for tree to fully load
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
