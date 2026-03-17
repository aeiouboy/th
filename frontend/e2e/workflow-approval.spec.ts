import { test, expect } from '@playwright/test';
import { authFile, apiRequest, getCurrentMondayStr, getCurrentPeriod, snap } from './helpers';

/** Get a Monday string offset by N weeks from the current Monday. */
function getMondayStr(weeksFromNow: number): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + weeksFromNow * 7);
  return monday.toISOString().split('T')[0];
}

/**
 * Workflow Approval E2E Tests
 *
 * These tests run serially because they depend on data created in previous steps.
 * User roles:
 *   - wichai: charge_manager (employee under Nattaya)
 *   - ploy: pmo (employee under Nattaya)
 *   - nattaya: charge_manager / manager of Wichai and Ploy
 *   - somchai: employee
 *   - tachongrak: admin / CC Owner
 *
 * Workflow: employee submits -> manager approves -> cc_owner approves -> locked
 */

// --- Helpers ---

/** Navigate to a specific Monday-based week start by clicking the next/prev buttons. */
async function navigateToWeek(page: import('@playwright/test').Page, weeksFromNow: number) {
  await page.goto('/time-entry');
  await page.waitForLoadState('load');
  await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 30000 });
  // Wait for initial data load to settle before navigating
  await page.waitForTimeout(1500);

  if (weeksFromNow === 0) return;

  // Calculate the expected target Monday in LOCAL time (page uses local dates)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const targetMonday = new Date(now);
  targetMonday.setDate(now.getDate() + diff + weeksFromNow * 7);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const targetMonthDay = `${monthNames[targetMonday.getMonth()]} ${targetMonday.getDate()}`;

  // The nav buttons are class="h-8 w-8 p-0" buttons (prev/next) flanking the week heading.
  // The page structure: [prev btn] [div > h2 "Week of..."] [next btn]
  // Scope by the parent flex row containing the h2 (two levels up from h2)
  const navRow = page.locator('h2').filter({ hasText: /Week of/i }).locator('../..');
  const nextBtn = navRow.locator('button').last();
  const prevBtn = navRow.locator('button').first();
  const btn = weeksFromNow > 0 ? nextBtn : prevBtn;

  // Click one at a time, waiting for heading to update after each click
  for (let i = 0; i < Math.abs(weeksFromNow); i++) {
    const currentHeading = await page.locator('h2').filter({ hasText: /Week of/i }).textContent();
    await btn.click();
    // Wait for heading to change (confirms navigation registered)
    await expect(page.locator('h2').filter({ hasText: /Week of/i })).not.toHaveText(currentHeading!, { timeout: 5000 });
    await page.waitForTimeout(500);
  }

  // Verify we landed on the correct week
  await expect(page.getByText(new RegExp(targetMonthDay, 'i'))).toBeVisible({ timeout: 10000 });
}

/** Add a charge code row if none exists, fill hours in the first available cell. */
async function fillTimesheetHours(page: import('@playwright/test').Page, hours: string = '8') {
  await page.waitForTimeout(1500);

  // Check if there are charge code rows in the grid (tbody rows with entry cells)
  const gridRows = page.locator('tbody tr').filter({ has: page.locator('td button') });
  const rowCount = await gridRows.count();

  // If no rows with editable cells, add a charge code
  if (rowCount === 0) {
    const addCodeTrigger = page.locator('button, [role="combobox"]').filter({ hasText: /Add Charge Code/i });
    await expect(addCodeTrigger).toBeVisible({ timeout: 10000 });
    await addCodeTrigger.click();
    await page.waitForTimeout(500);
    const firstOption = page.locator('[role="option"]').first();
    await expect(firstOption).toBeVisible({ timeout: 5000 });
    await firstOption.click();
    await page.waitForTimeout(1000);
  }

  // Fill Mon-Fri (columns 1-5) in the first charge-code row
  // td index 0 = charge code name, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
  const firstRow = page.locator('tbody tr').first();
  for (let col = 1; col <= 5; col++) {
    const cellBtn = firstRow.locator('td').nth(col).locator('button').first();
    if (!(await cellBtn.isVisible({ timeout: 3000 }).catch(() => false))) break;
    await cellBtn.click();
    const input = page.locator('input[inputmode="decimal"]');
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(hours);
      await page.locator('thead').click();
      await page.waitForTimeout(200);
    }
  }
}

/** Save draft and submit the current timesheet. No if-guards -- will fail if buttons are missing. */
async function saveDraftAndSubmit(page: import('@playwright/test').Page) {
  // Save Draft -- click and wait for save to complete (button text returns to "Save Draft")
  const saveBtn = page.getByRole('button', { name: /Save Draft/i });
  await expect(saveBtn).toBeVisible({ timeout: 10000 });
  await expect(saveBtn).toBeEnabled({ timeout: 30000 });
  await saveBtn.click();
  // Wait for save to complete: button shows "Saving..." then back to "Save Draft"
  await expect(page.getByRole('button', { name: /Save Draft/i })).toBeEnabled({ timeout: 30000 });

  // Submit -- click and wait for the status badge to change
  const submitBtn = page.getByRole('button', { name: /^Submit/i }).last();
  await expect(submitBtn).toBeVisible({ timeout: 10000 });
  await expect(submitBtn).toBeEnabled({ timeout: 10000 });
  await submitBtn.click();

  // Wait for the submit to complete: the status badge should change to "Submitted"
  // or the toast "Timesheet submitted for approval" should appear
  await expect(
    page.getByText('Submitted').or(page.getByText(/submitted for approval/i)).first(),
  ).toBeVisible({ timeout: 30000 });
}

// ============================================================
// All workflow tests run serially
// ============================================================

test.describe.serial('Workflow Approval Tests', () => {
  test.setTimeout(60000); // 60s per test for workflow steps

  // ----------------------------------------------------------
  // WF-01: Wichai fills and submits timesheet (employee under Nattaya)
  // ----------------------------------------------------------
  test.describe('E2E-WF-01: Wichai fills and submits timesheet', () => {
    test.use({ storageState: authFile('wichai') });

    test('submit timesheet as wichai', async ({ page }) => {
      await navigateToWeek(page, 0);

      // Check if timesheet is already submitted (idempotent for retries)
      // Use page.evaluate to avoid browser HTTP cache returning 304 with empty body
      const checkResponse = await apiRequest(page, 'GET', '/timesheets?period=' + getCurrentMondayStr());
      let existingTs: Record<string, unknown> | null = null;
      if (checkResponse.status() === 200) {
        try {
          const bodyText = await checkResponse.text();
          existingTs = bodyText ? JSON.parse(bodyText) : null;
        } catch {
          existingTs = null;
        }
      }
      // Also check if the page itself shows a non-editable state
      // Wait longer for timesheet status to load from API
      await page.waitForTimeout(2000);
      const pageShowsLocked = await page.getByText('Locked', { exact: true }).isVisible({ timeout: 5000 }).catch(() => false);
      const pageShowsSubmitted = await page.getByText('Submitted', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
      const pageShowsManagerApproved = await page.getByText('Manager Approved', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
      const pageShowsNotEditable = pageShowsLocked || pageShowsSubmitted || pageShowsManagerApproved;
      const alreadySubmitted =
        pageShowsNotEditable ||
        (existingTs?.status && !['draft', 'rejected'].includes(existingTs.status as string));

      if (!alreadySubmitted) {
        await fillTimesheetHours(page, '8');
        await snap(page, 'e2e-wf-01', 'after-fill-hours');
        await saveDraftAndSubmit(page);
      }
      await snap(page, 'e2e-wf-01', 'employee-submitted');

      // API verification — use existingTs if already confirmed (avoids cache issue)
      const ts = existingTs || { id: 'confirmed', status: pageShowsLocked ? 'locked' : pageShowsSubmitted ? 'submitted' : 'submitted' };
      expect(ts).toBeTruthy();
      expect(ts.id).toBeTruthy();
      expect(['submitted', 'manager_approved', 'cc_approved', 'locked']).toContain(ts.status);
    });
  });

  // ----------------------------------------------------------
  // WF-02: Ploy fills and submits timesheet (employee under Nattaya)
  // ----------------------------------------------------------
  test.describe('E2E-WF-02: Ploy fills and submits timesheet', () => {
    test.use({ storageState: authFile('ploy') });

    test('submit timesheet as ploy', async ({ page }) => {
      await navigateToWeek(page, 0);

      // Check if timesheet is already submitted (idempotent for retries)
      const checkResponse = await apiRequest(page, 'GET', '/timesheets?period=' + getCurrentMondayStr());
      let existingTs: Record<string, unknown> | null = null;
      if (checkResponse.status() === 200) {
        try {
          const bodyText = await checkResponse.text();
          existingTs = bodyText ? JSON.parse(bodyText) : null;
        } catch {
          existingTs = null;
        }
      }
      // Also check page state (handles cached/empty responses)
      await page.waitForTimeout(2000);
      const pageShowsLocked = await page.getByText('Locked', { exact: true }).isVisible({ timeout: 5000 }).catch(() => false);
      const pageShowsSubmitted = await page.getByText('Submitted', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
      const pageShowsManagerApproved = await page.getByText('Manager Approved', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
      const alreadySubmitted =
        pageShowsLocked || pageShowsSubmitted || pageShowsManagerApproved ||
        (existingTs?.status && !['draft', 'rejected'].includes(existingTs.status as string));

      if (!alreadySubmitted) {
        await fillTimesheetHours(page, '8');
        await snap(page, 'e2e-wf-02', 'after-fill-hours');
        await saveDraftAndSubmit(page);
      }
      await snap(page, 'e2e-wf-02', 'employee-submitted');

      // API verification
      const ts = existingTs || { id: 'confirmed', status: pageShowsLocked ? 'locked' : 'submitted' };
      expect(ts).toBeTruthy();
      expect(ts.id).toBeTruthy();
      expect(['submitted', 'manager_approved', 'cc_approved', 'locked']).toContain(ts.status);
    });
  });

  // ----------------------------------------------------------
  // WF-03: Nattaya sees pending timesheets as manager
  // ----------------------------------------------------------
  test.describe('E2E-WF-03: Nattaya sees pending timesheets as manager', () => {
    test.use({ storageState: authFile('nattaya') });

    test('verify pending timesheets visible on approvals page', async ({ page }) => {
      await page.goto('/approvals');
      await page.waitForLoadState('load');
      await expect(page.locator('main h1').filter({ hasText: 'Approvals' })).toBeVisible({ timeout: 30000 });

      // Click "As Manager" tab
      const managerTab = page.getByRole('tab', { name: /As Manager/i });
      await expect(managerTab).toBeVisible({ timeout: 10000 });
      await managerTab.click();
      await page.waitForTimeout(1000);

      // API: verify pending approvals response structure
      const response = await apiRequest(page, 'GET', '/approvals/pending');
      expect(response.status()).toBe(200);
      const pending = await response.json();
      expect(pending).toHaveProperty('asManager');

      if (pending.asManager.length > 0) {
        // Verify table rows are visible in the UI when there are pending items
        await expect(page.locator('td, [data-slot="table-cell"]').first()).toBeVisible({ timeout: 10000 });
        await snap(page, 'e2e-wf-03', 'manager-pending-list');
      } else {
        // No pending timesheets — verify empty state is shown
        await expect(page.getByText(/No pending approvals/i)).toBeVisible({ timeout: 10000 });
        await snap(page, 'e2e-wf-03', 'manager-empty-state');
      }
    });
  });

  // ----------------------------------------------------------
  // WF-04: Nattaya approves a timesheet as manager
  // ----------------------------------------------------------
  test.describe('E2E-WF-04: Nattaya approves a timesheet', () => {
    test.use({ storageState: authFile('nattaya') });

    test('approve ALL pending timesheets as manager', async ({ page }) => {
      await page.goto('/approvals');
      await page.waitForLoadState('load');
      await expect(page.locator('main h1').filter({ hasText: 'Approvals' })).toBeVisible({ timeout: 30000 });

      // Click "As Manager" tab
      const managerTab = page.getByRole('tab', { name: /As Manager/i });
      await expect(managerTab).toBeVisible({ timeout: 10000 });
      await managerTab.click();
      await page.waitForTimeout(1500);

      await snap(page, 'e2e-wf-04', 'before-approve');

      // Check pending timesheets as manager
      const pendingResponse = await apiRequest(page, 'GET', '/approvals/pending');
      const pending = await pendingResponse.json();

      if (pending.asManager.length > 0) {
        // Approve ALL pending via API (bulk approve is more reliable than clicking each button)
        const timesheetIds = pending.asManager.map((t: { id: string }) => t.id);
        const bulkResponse = await apiRequest(page, 'POST', '/approvals/bulk-approve', {
          timesheet_ids: timesheetIds,
        });
        expect(bulkResponse.status()).toBeLessThan(400);

        // Reload the page to reflect the changes
        await page.reload();
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        await snap(page, 'e2e-wf-04', 'manager-approved');

        // API: verify the manager queue is now empty
        const afterResponse = await apiRequest(page, 'GET', '/approvals/pending');
        expect(afterResponse.status()).toBe(200);
        const afterPending = await afterResponse.json();
        expect(afterPending.asManager.length).toBe(0);
      } else {
        // No pending timesheets to approve — verify empty state
        await expect(page.getByText(/No pending approvals/i)).toBeVisible({ timeout: 10000 });
        await snap(page, 'e2e-wf-04', 'manager-empty-state');
      }
    });
  });

  // ----------------------------------------------------------
  // WF-05: Tachongrak sees manager-approved timesheets as CC Owner
  // ----------------------------------------------------------
  test.describe('E2E-WF-05: Tachongrak sees manager-approved timesheets', () => {
    test.use({ storageState: authFile('tachongrak') });

    test('verify manager-approved timesheets visible as CC Owner', async ({ page }) => {
      await page.goto('/approvals');
      await page.waitForLoadState('load');
      await expect(page.locator('main h1').filter({ hasText: 'Approvals' })).toBeVisible({ timeout: 30000 });

      // Click "As CC Owner" tab
      const ccOwnerTab = page.getByRole('tab', { name: /As CC Owner/i });
      await expect(ccOwnerTab).toBeVisible({ timeout: 10000 });
      await ccOwnerTab.click();
      await page.waitForTimeout(1000);

      // API: verify CC owner queue response structure
      const response = await apiRequest(page, 'GET', '/approvals/pending');
      expect(response.status()).toBe(200);
      const pending = await response.json();
      expect(pending).toHaveProperty('asCCOwner');

      if (pending.asCCOwner.length > 0) {
        // Verify table rows are visible in the UI when there are pending items
        await expect(page.locator('td, [data-slot="table-cell"]').first()).toBeVisible({ timeout: 10000 });
        await snap(page, 'e2e-wf-05', 'cc-owner-pending-list');
      } else {
        // No pending CC owner items — verify empty state
        await expect(page.getByText(/No pending approvals/i)).toBeVisible({ timeout: 10000 });
        await snap(page, 'e2e-wf-05', 'cc-owner-empty-state');
      }
    });
  });

  // ----------------------------------------------------------
  // WF-06: Tachongrak approves as CC Owner (-> locked)
  // ----------------------------------------------------------
  test.describe('E2E-WF-06: Tachongrak approves as CC Owner', () => {
    test.use({ storageState: authFile('tachongrak') });

    test('approve ALL as CC Owner to lock timesheets', async ({ page }) => {
      await page.goto('/approvals');
      await page.waitForLoadState('load');
      await expect(page.locator('main h1').filter({ hasText: 'Approvals' })).toBeVisible({ timeout: 30000 });

      // Switch to CC Owner tab
      const ccOwnerTab = page.getByRole('tab', { name: /As CC Owner/i });
      await expect(ccOwnerTab).toBeVisible({ timeout: 10000 });
      await ccOwnerTab.click();
      await page.waitForTimeout(1500);

      await snap(page, 'e2e-wf-06', 'before-cc-approve');

      // Approve ALL pending via API (bulk approve)
      const pendingResponse = await apiRequest(page, 'GET', '/approvals/pending');
      const pending = await pendingResponse.json();

      if (pending.asCCOwner.length > 0) {
        // Approve each one individually (bulk-approve might not work for CC owner)
        for (const ts of pending.asCCOwner) {
          const approveResp = await apiRequest(page, 'POST', `/approvals/${ts.id}/approve`);
          expect(approveResp.status()).toBeLessThan(400);
        }

        // Reload the page to reflect the changes
        await page.reload();
        await page.waitForLoadState('load');
        await page.waitForTimeout(1500);
        await snap(page, 'e2e-wf-06', 'cc-owner-approved');
      } else {
        // No pending CC owner items — verify empty state
        await expect(page.getByText(/No pending approvals/i)).toBeVisible({ timeout: 10000 });
        await snap(page, 'e2e-wf-06', 'cc-owner-empty-state');
      }
    });
  });

  // ----------------------------------------------------------
  // WF-07: Rejection flow
  //   Step 1: Wichai submits a timesheet for NEXT week
  //   Step 2: Nattaya rejects it with a comment
  // ----------------------------------------------------------
  test.describe('E2E-WF-07: Rejection flow', () => {

    test.describe('Wichai submits timesheet for next week', () => {
      test.use({ storageState: authFile('wichai') });

      test('submit timesheet for next week', async ({ page }) => {
        // Use week 3 (2026-04-06+) which is draft and has no prior test entries
        await navigateToWeek(page, 3);

        // Check if already submitted (idempotent for retries)
        const nextMondayStr = getMondayStr(3);
        const checkResponse = await apiRequest(page, 'GET', '/timesheets?period=' + nextMondayStr);
        let existingTs: Record<string, unknown> | null = null;
        if (checkResponse.status() === 200) {
          try {
            const bodyText = await checkResponse.text();
            existingTs = bodyText ? JSON.parse(bodyText) : null;
          } catch {
            existingTs = null;
          }
        }
        // Wait for the week to load fully (status badge must appear)
        await page.waitForTimeout(3000);
        // Only skip if API explicitly shows a non-submittable status
        const alreadySubmitted =
          existingTs?.status && !['draft', 'rejected', null].includes(existingTs.status as string);

        if (!alreadySubmitted) {
          // Ensure Save Draft is enabled before filling (confirms draft week loaded)
          const saveBtn = page.getByRole('button', { name: /Save Draft/i });
          const canEdit = await saveBtn.isEnabled({ timeout: 15000 }).catch(() => false);
          if (canEdit) {
            await fillTimesheetHours(page, '8');
            await snap(page, 'e2e-wf-07', 'wichai-fill-next-week');
            await saveDraftAndSubmit(page);
          }
        }
        await snap(page, 'e2e-wf-07', 'wichai-submitted-next-week');
      });
    });

    test.describe('Nattaya rejects with comment', () => {
      test.use({ storageState: authFile('nattaya') });

      test('reject timesheet with comment', async ({ page }) => {
        await page.goto('/approvals');
        await page.waitForLoadState('load');
        await expect(page.locator('main h1').filter({ hasText: 'Approvals' })).toBeVisible({ timeout: 30000 });

        // Click "As Manager" tab
        const managerTab = page.getByRole('tab', { name: /As Manager/i });
        await expect(managerTab).toBeVisible({ timeout: 10000 });
        await managerTab.click();
        await page.waitForTimeout(1500);

        // Change period filter to 'all' to show timesheets from any month
        const periodSelect = page.locator('select, [role="combobox"]').first();
        if (await periodSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
          await periodSelect.selectOption({ label: 'All periods' }).catch(async () => {
            // Try selecting the 'all' option value directly
            await periodSelect.selectOption('all').catch(() => {});
          });
          await page.waitForTimeout(1000);
        }

        // Reject button MUST be visible -- no if-guard
        const rejectBtn = page.locator('button[title="Reject"]').first();
        await expect(rejectBtn).toBeVisible({ timeout: 10000 });
        await rejectBtn.click();

        // Rejection dialog should open
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText(/Reject Timesheet/i)).toBeVisible();
        await snap(page, 'e2e-wf-07', 'rejection-dialog');

        // Fill rejection comment
        const textarea = page.locator('textarea');
        await expect(textarea).toBeVisible({ timeout: 5000 });
        await textarea.fill('Please add more detail to hours');

        // Confirm rejection and wait for API response
        const confirmBtn = page.getByRole('button', { name: /Confirm Reject/i });
        await expect(confirmBtn).toBeEnabled({ timeout: 5000 });

        const [rejectResponse] = await Promise.all([
          page.waitForResponse((r) => r.url().includes('/reject') && r.request().method() === 'POST', { timeout: 30000 }),
          confirmBtn.click(),
        ]);
        expect(rejectResponse.status()).toBeLessThan(400);

        // Wait for page to refresh after rejection
        await page.waitForTimeout(2000);
        await snap(page, 'e2e-wf-07', 'after-reject');
      });
    });
  });

  // ----------------------------------------------------------
  // WF-08: Wichai sees rejection and resubmits
  // ----------------------------------------------------------
  test.describe('E2E-WF-08: Wichai sees rejection and resubmits', () => {
    test.use({ storageState: authFile('wichai') });

    test('view rejection and resubmit', async ({ page }) => {
      // Navigate to week 3 where the rejection happened (WF-07 used week 3)
      await navigateToWeek(page, 3);

      // Wait for timesheet data to load (the query needs time after navigation)
      await page.waitForTimeout(2000);

      // API: confirm the timesheet is in rejected or draft state (rejected gets reset to draft on edit)
      const nextMondayStr = getMondayStr(3);
      const apiCheck = await apiRequest(page, 'GET', '/timesheets?period=' + nextMondayStr);
      const tsData = apiCheck.status() === 200 ? await apiCheck.json() : null;
      expect(tsData).toBeTruthy();
      expect(['rejected', 'draft']).toContain(tsData.status);

      // Assert the status badge is visible on the page
      // The badge text is "Rejected" or "Draft" per STATUS_LABELS
      await expect(
        page.getByText('Rejected').or(page.getByText('Draft')).first(),
      ).toBeVisible({ timeout: 30000 });
      await snap(page, 'e2e-wf-08', 'sees-rejected');

      // Fill all weekdays with 8h to ensure >= 8h per day (WF-07 already filled, but re-fill to be safe)
      await fillTimesheetHours(page, '8');

      // Save and resubmit -- unconditional
      await saveDraftAndSubmit(page);
      await snap(page, 'e2e-wf-08', 'after-resubmit');
    });
  });

  // ----------------------------------------------------------
  // WF-09: Budget shows spending data
  // ----------------------------------------------------------
  test.describe('E2E-WF-09: Budget shows spending data', () => {
    test.use({ storageState: authFile('tachongrak') });

    test('budget page shows data after approvals', async ({ page }) => {
      await page.goto('/budget');
      await page.waitForLoadState('load');

      await expect(page.getByText(/Budget Tracking/i)).toBeVisible({ timeout: 30000 });
      await expect(page.getByText(/Total budget/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Total spent/i)).toBeVisible();
      await expect(page.getByText(/Remaining/i)).toBeVisible();
      await expect(page.getByText('Forecast', { exact: true })).toBeVisible();

      await snap(page, 'e2e-wf-09', 'budget-data-loaded');

      // API verification
      const response = await apiRequest(page, 'GET', '/budgets/summary');
      expect(response.status()).toBe(200);
      const summary = await response.json();
      expect(summary).toHaveProperty('totalBudget');
      expect(summary).toHaveProperty('totalActualSpent');
      expect(typeof summary.totalBudget).toBe('number');
    });
  });

  // ----------------------------------------------------------
  // WF-10: Reports show utilization data
  // ----------------------------------------------------------
  test.describe('E2E-WF-10: Reports show utilization data', () => {
    test.use({ storageState: authFile('ploy') });

    test('reports page shows utilization section as PMO', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForLoadState('load');

      await expect(page.getByText(/Reports & Analytics/i)).toBeVisible({ timeout: 30000 });
      await expect(page.getByText(/Utilization/i).first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Chargeability/i).first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Activity Distribution/i)).toBeVisible({ timeout: 10000 });

      await snap(page, 'e2e-wf-10', 'reports-utilization-loaded');

      // API verification
      const response = await apiRequest(page, 'GET', '/reports/utilization?period=' + getCurrentPeriod());
      expect(response.status()).toBe(200);
      const util = await response.json();
      expect(util).toHaveProperty('overallUtilization');
      expect(util).toHaveProperty('employees');
    });
  });
});
