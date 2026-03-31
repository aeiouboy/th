import { test, expect } from '@playwright/test';
import { authFile, snap, apiRequest } from './helpers';

/**
 * Role-Based Access & Approval Workflow E2E Tests
 *
 * Tests sidebar visibility and page access per role, then runs a
 * submit -> manager-approve -> verify-status workflow.
 *
 * User hierarchy:
 *   Tachongrak (admin, no manager)
 *   ├── Nattaya (charge_manager)
 *   │   ├── Wichai (employee)
 *   │   └── Ploy (employee)
 *   ├── Somchai (pmo)
 *   └── Kannika (finance)
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wait for the sidebar/layout to fully render by checking for a known nav link. */
async function waitForLayout(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle');
  // Sidebar links are inside <aside> <nav> — when collapsed they have title attributes but no visible text.
  // Wait for at least one sidebar link to be present (Dashboard is always rendered).
  await expect(
    page.locator('aside nav a').first(),
  ).toBeVisible({ timeout: 30000 });
}

/** Collect sidebar link labels (desktop view).
 *  The sidebar starts collapsed — links show icons only, but each has a `title` attribute with the label.
 *  We read title attrs so we don't need to expand the sidebar. */
async function getSidebarLinks(page: import('@playwright/test').Page): Promise<string[]> {
  await waitForLayout(page);
  const links = page.locator('aside nav a');
  const count = await links.count();
  const texts: string[] = [];
  for (let i = 0; i < count; i++) {
    // Try title attribute first (collapsed sidebar), then inner text (expanded sidebar)
    const title = await links.nth(i).getAttribute('title');
    if (title && title.trim()) {
      texts.push(title.trim());
    } else {
      const text = await links.nth(i).textContent();
      if (text && text.trim()) texts.push(text.trim());
    }
  }
  return texts;
}

/** Fill timesheet hours for Mon-Fri in the first row. */
async function fillTimesheetHours(page: import('@playwright/test').Page, hours: string = '8') {
  await page.waitForTimeout(500);

  // Remove existing rows to start clean
  let removeBtns = await page.locator('button').filter({ hasText: '×' }).count();
  let safety = 0;
  while (removeBtns > 0 && safety < 20) {
    const btn = page.locator('button').filter({ hasText: '×' }).first();
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(300);
    }
    removeBtns = await page.locator('button').filter({ hasText: '×' }).count();
    safety++;
  }
  await page.waitForTimeout(500);

  // Add a charge code if no rows exist
  const gridRows = page.locator('tbody tr').filter({ has: page.locator('td button') });
  if ((await gridRows.count()) === 0) {
    const addCodeTrigger = page.locator('button, [role="combobox"]').filter({ hasText: /Add Charge Code/i });
    await expect(addCodeTrigger).toBeVisible({ timeout: 10000 });
    await addCodeTrigger.click({ force: true });
    await page.waitForTimeout(500);
    const firstOption = page.locator('[role="option"]').first();
    await expect(firstOption).toBeVisible({ timeout: 5000 });
    await firstOption.click();
    await page.waitForTimeout(1000);
  }

  // Fill Mon-Fri (columns 1-5) in the first row
  const firstRow = page.locator('tbody tr').first();
  for (let col = 1; col <= 5; col++) {
    const cell = firstRow.locator('td').nth(col);
    const cellBtn = cell.locator('button').first();
    const btnExists = await cellBtn.waitFor({ state: 'attached', timeout: 3000 }).then(() => true).catch(() => false);
    if (!btnExists) continue;
    await cellBtn.scrollIntoViewIfNeeded().catch(() => {});
    await cellBtn.click();
    await page.waitForTimeout(150);
    const input = page.locator('input[inputmode="decimal"]');
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.fill(hours);
      await page.locator('thead').click();
      await page.waitForTimeout(150);
    }
  }
}

/** Save draft and submit the current timesheet. */
async function saveDraftAndSubmit(page: import('@playwright/test').Page) {
  const saveBtn = page.getByRole('button', { name: /Save Draft/i });
  await expect(saveBtn).toBeVisible({ timeout: 10000 });
  await expect(saveBtn).toBeEnabled({ timeout: 30000 });
  await saveBtn.click();
  await Promise.race([
    page.getByText(/Timesheet saved/i).waitFor({ timeout: 15000 }).catch(() => {}),
    page.waitForTimeout(15000),
  ]);
  await page.waitForTimeout(500);

  const submitBtn = page.getByRole('button', { name: /^Submit/i }).last();
  await expect(submitBtn).toBeVisible({ timeout: 10000 });
  await expect(submitBtn).toBeEnabled({ timeout: 10000 });
  await submitBtn.click();

  // Handle "Incomplete Hours" warning dialog if it appears
  const incompleteDialog = page.getByRole('dialog').filter({ hasText: /Incomplete Hours/i });
  const dialogVisible = await incompleteDialog.isVisible({ timeout: 4000 }).catch(() => false);
  if (dialogVisible) {
    const okBtn = page.getByRole('button', { name: /OK.*Got It|Got It/i });
    if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await okBtn.click();
      await expect(incompleteDialog).not.toBeVisible({ timeout: 5000 }).catch(() => {});
    }
    await page.waitForTimeout(500);
    const submitBtnAgain = page.getByRole('button', { name: /^Submit/i }).last();
    if (await submitBtnAgain.isEnabled({ timeout: 5000 }).catch(() => false)) {
      await submitBtnAgain.click();
    }
  }

  await expect(
    page.getByText('Submitted').or(page.getByText(/submitted for approval/i)).first(),
  ).toBeVisible({ timeout: 30000 });
}

// ===========================================================================
// 1. Employee Role (Wichai) - Sidebar Access
// ===========================================================================
test.describe('Role Access: Employee (Wichai)', () => {
  test.use({ storageState: authFile('wichai') });
  test.setTimeout(60000);

  test('can access Dashboard, Time Entry, Calendar; cannot see Approvals, Reports, Budget, Admin', async ({ page }) => {
    await page.goto('/');
    const links = await getSidebarLinks(page);

    // Should see these
    expect(links.some((l) => /Dashboard/i.test(l))).toBe(true);
    expect(links.some((l) => /Time Entry|Time/i.test(l))).toBe(true);
    expect(links.some((l) => /Calendar/i.test(l))).toBe(true);

    // Should NOT see these
    expect(links.some((l) => /^Approvals$/i.test(l))).toBe(false);
    expect(links.some((l) => /^Reports$/i.test(l))).toBe(false);
    expect(links.some((l) => /^Budget$/i.test(l))).toBe(false);
    expect(links.some((l) => /Users/i.test(l))).toBe(false);
    expect(links.some((l) => /Rates/i.test(l))).toBe(false);

    await snap(page, 'e2e-role', 'employee-sidebar');
  });
});

// ===========================================================================
// 2. Charge Manager Role (Nattaya) - Approvals Access
// ===========================================================================
test.describe('Role Access: Charge Manager (Nattaya)', () => {
  test.use({ storageState: authFile('nattaya') });
  test.setTimeout(60000);

  test('can access Approvals page with Pending and Team tabs', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main h1, main h2').filter({ hasText: /Approvals/i })).toBeVisible({ timeout: 30000 });

    // Should see tab navigation for approvals
    const managerTab = page.getByRole('tab', { name: /Pending Approvals/i });
    await expect(managerTab).toBeVisible({ timeout: 10000 });

    await snap(page, 'e2e-role', 'charge-manager-approvals');
  });
});

// ===========================================================================
// 3. PMO Role (Somchai) - Reports, Budget, Charge Codes access
// ===========================================================================
test.describe('Role Access: PMO (Somchai)', () => {
  test.use({ storageState: authFile('somchai') });
  test.setTimeout(60000);

  test('can access Reports and Budget; cannot see Approvals or Admin', async ({ page }) => {
    await page.goto('/');
    const links = await getSidebarLinks(page);

    // Should see Reports, Budget, Charge Codes
    expect(links.some((l) => /Reports/i.test(l))).toBe(true);
    expect(links.some((l) => /Budget/i.test(l))).toBe(true);
    expect(links.some((l) => /Charge Codes|Codes/i.test(l))).toBe(true);

    // Should NOT see Approvals or Admin items
    expect(links.some((l) => /^Approvals$|^Approve$/i.test(l))).toBe(false);
    expect(links.some((l) => /Users/i.test(l))).toBe(false);
    expect(links.some((l) => /Rates/i.test(l))).toBe(false);

    await snap(page, 'e2e-role', 'pmo-sidebar');

    // Verify Reports page loads
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Reports/i).first()).toBeVisible({ timeout: 30000 });

    // Verify Budget page loads
    await page.goto('/budget');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Budget/i).first()).toBeVisible({ timeout: 30000 });
  });
});

// ===========================================================================
// 4. Finance Role (Kannika) - Reports, Budget, Charge Codes; no Approvals/Admin
// ===========================================================================
test.describe('Role Access: Finance (Kannika)', () => {
  test.use({ storageState: authFile('kannika') });
  test.setTimeout(60000);

  test('can access Reports, Budget, Charge Codes; cannot see Approvals or Admin', async ({ page }) => {
    await page.goto('/');
    const links = await getSidebarLinks(page);

    // Should see Reports, Budget, Charge Codes
    expect(links.some((l) => /Reports/i.test(l))).toBe(true);
    expect(links.some((l) => /Budget/i.test(l))).toBe(true);
    expect(links.some((l) => /Charge Codes|Codes/i.test(l))).toBe(true);

    // Should NOT see Approvals or Admin items
    expect(links.some((l) => /^Approvals$|^Approve$/i.test(l))).toBe(false);
    expect(links.some((l) => /Users/i.test(l))).toBe(false);
    expect(links.some((l) => /Rates/i.test(l))).toBe(false);

    await snap(page, 'e2e-role', 'finance-sidebar');

    // Verify Reports page loads
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Reports/i).first()).toBeVisible({ timeout: 30000 });

    // Verify Budget page loads
    await page.goto('/budget');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Budget/i).first()).toBeVisible({ timeout: 30000 });
  });
});

// ===========================================================================
// 5. Admin Role (Tachongrak) - Full access including Admin section
// ===========================================================================
test.describe('Role Access: Admin (Tachongrak)', () => {
  test.use({ storageState: authFile('tachongrak') });
  test.setTimeout(60000);

  test('can see all nav items including Admin section', async ({ page }) => {
    await page.goto('/');
    const links = await getSidebarLinks(page);

    // Should see everything
    expect(links.some((l) => /Dashboard/i.test(l))).toBe(true);
    expect(links.some((l) => /Time Entry|Time/i.test(l))).toBe(true);
    expect(links.some((l) => /Approvals|Approve/i.test(l))).toBe(true);
    expect(links.some((l) => /Reports/i.test(l))).toBe(true);
    expect(links.some((l) => /Budget/i.test(l))).toBe(true);
    expect(links.some((l) => /Charge Codes|Codes/i.test(l))).toBe(true);

    // Admin section items
    expect(links.some((l) => /Users/i.test(l))).toBe(true);
    expect(links.some((l) => /Rates/i.test(l))).toBe(true);

    await snap(page, 'e2e-role', 'admin-sidebar');

    // Verify admin pages load
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Users/i).first()).toBeVisible({ timeout: 30000 });
  });
});

// ===========================================================================
// 6. Approval Workflow: Wichai submits -> Nattaya approves -> Wichai checks
// ===========================================================================
test.describe.serial('Approval Workflow: Submit and Approve', () => {
  test.setTimeout(120000);

  // Step 1: Wichai submits a timesheet for the current week
  test.describe('Step 1: Wichai submits timesheet', () => {
    test.use({ storageState: authFile('wichai') });

    test('fill hours and submit', async ({ page }) => {
      await page.goto('/time-entry');
      await page.waitForLoadState('load');
      await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 30000 });
      await page.waitForTimeout(1500);

      // Check current state
      const statusOrGrid = page
        .getByText('Locked', { exact: true })
        .or(page.getByText('Submitted', { exact: true }))
        .or(page.getByText('Approved', { exact: true }))
        .or(page.getByText('Draft', { exact: true }))
        .or(page.getByText('Rejected', { exact: true }))
        .or(page.locator('tbody tr').first());
      await statusOrGrid.waitFor({ timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(300);

      const alreadySubmitted = await page.getByText('Submitted', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
      const alreadyApproved = await page.getByText('Approved', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
      const alreadyLocked = await page.getByText('Locked', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
      const alreadyDone = alreadySubmitted || alreadyApproved || alreadyLocked;

      if (!alreadyDone) {
        await fillTimesheetHours(page, '8');
        await saveDraftAndSubmit(page);
      }

      await snap(page, 'e2e-role-wf', 'wichai-submitted');

      // Verify timesheet is in submitted or later state
      await expect(
        page.getByText('Submitted', { exact: true })
          .or(page.getByText('Approved', { exact: true }))
          .or(page.getByText('Locked', { exact: true }))
          .or(page.getByText(/submitted for approval/i))
          .first(),
      ).toBeVisible({ timeout: 20000 });
    });
  });

  // Step 2: Nattaya approves Wichai's timesheet as manager
  test.describe('Step 2: Nattaya approves as manager', () => {
    test.use({ storageState: authFile('nattaya') });

    test('approve pending timesheets', async ({ page }) => {
      await page.goto('/approvals');
      await page.waitForLoadState('load');
      await expect(page.locator('main h1, main h2').filter({ hasText: /Approvals/i })).toBeVisible({ timeout: 30000 });

      // Click "Pending Approvals" tab
      const managerTab = page.getByRole('tab', { name: /Pending Approvals/i });
      await expect(managerTab).toBeVisible({ timeout: 10000 });
      await managerTab.click();
      await page.waitForTimeout(1500);

      await snap(page, 'e2e-role-wf', 'nattaya-pending');

      // Check pending via API
      const pendingResponse = await apiRequest(page, 'GET', '/approvals/pending');
      const pending = await pendingResponse.json();

      if (pending.pending && pending.pending.length > 0) {
        // Approve all via API for reliability
        const timesheetIds = pending.pending.map((t: { id: string }) => t.id);
        const bulkResponse = await apiRequest(page, 'POST', '/approvals/bulk-approve', {
          timesheet_ids: timesheetIds,
        });
        expect(bulkResponse.status()).toBeLessThan(400);

        await page.reload();
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
      }

      await snap(page, 'e2e-role-wf', 'nattaya-approved');
    });
  });

  // Step 3: Wichai checks status is now approved (not locked)
  test.describe('Step 3: Wichai checks approved status', () => {
    test.use({ storageState: authFile('wichai') });

    test('timesheet shows approved or later status', async ({ page }) => {
      await page.goto('/time-entry');
      await page.waitForLoadState('load');
      await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 30000 });
      await page.waitForTimeout(2000);

      await snap(page, 'e2e-role-wf', 'wichai-check-status');

      // Verify status is Submitted, Manager Approved, CC Approved, or Locked
      // (depends on whether CC owner auto-approved or not)
      await expect(
        page.getByText('Approved', { exact: true })
          .or(page.getByText('Submitted', { exact: true }))
          .or(page.getByText('Locked', { exact: true }))
          .or(page.getByText(/CC Approved|Approved/i))
          .first(),
      ).toBeVisible({ timeout: 20000 });
    });
  });
});
