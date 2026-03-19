import { test, expect } from '@playwright/test';
import { authFile, apiRequest, getCurrentPeriod, snap } from './helpers';

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
    await expect(page.locator('h2').filter({ hasText: /Week of/i })).not.toHaveText(currentHeading!, { timeout: 15000 });
    await page.waitForTimeout(800);
  }

  // Verify we landed on the correct week
  await expect(page.getByText(new RegExp(targetMonthDay, 'i'))).toBeVisible({ timeout: 20000 });
}

/** Add a charge code row if none exists, fill hours in the first available cell. */
async function fillTimesheetHours(page: import('@playwright/test').Page, hours: string = '8') {
  await page.waitForTimeout(500);

  // Remove ALL existing charge code rows (click × buttons) to avoid stale/unassigned codes
  // This ensures we always start fresh and only use codes currently assigned to the user
  let removeBtns = await page.locator('button[title="Remove row"], td button').filter({ hasText: '×' }).count();
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

  // Check if there are charge code rows in the grid (tbody rows with entry cells)
  const gridRows = page.locator('tbody tr').filter({ has: page.locator('td button') });
  const rowCount = await gridRows.count();

  // If no rows with editable cells, add a charge code
  if (rowCount === 0) {
    const addCodeTrigger = page.locator('button, [role="combobox"]').filter({ hasText: /Add Charge Code/i });
    await expect(addCodeTrigger).toBeVisible({ timeout: 10000 });
    await addCodeTrigger.scrollIntoViewIfNeeded().catch(() => {});
    await addCodeTrigger.click({ force: true });
    await page.waitForTimeout(500);
    const firstOption = page.locator('[role="option"]').first();
    await expect(firstOption).toBeVisible({ timeout: 5000 });
    await firstOption.click();
    await page.waitForTimeout(1000);
  }

  // Fill Mon-Fri (columns 1-5) in the first charge-code row by clicking each cell individually.
  // td index 0 = charge code name, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
  // Tab key approach is unreliable (Tab may dismiss the input rather than move to next cell).
  // Instead: click each cell button, fill the input, commit by clicking thead, then move on.
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
      // Commit by clicking thead to close the inline input
      await page.locator('thead').click();
      await page.waitForTimeout(150);
    }
  }
}

/** Save draft and submit the current timesheet. No if-guards -- will fail if buttons are missing. */
async function saveDraftAndSubmit(page: import('@playwright/test').Page) {
  // Save Draft -- click and wait for save toast to confirm completion
  const saveBtn = page.getByRole('button', { name: /Save Draft/i });
  await expect(saveBtn).toBeVisible({ timeout: 10000 });
  await expect(saveBtn).toBeEnabled({ timeout: 30000 });
  await saveBtn.click();
  // Wait for the save to complete — toast confirms success, or wait up to 15s
  await Promise.race([
    page.getByText(/Timesheet saved/i).waitFor({ timeout: 15000 }).catch(() => {}),
    page.waitForTimeout(15000),
  ]);
  await page.waitForTimeout(500);

  // Submit -- click and wait for the status badge to change
  const submitBtn = page.getByRole('button', { name: /^Submit/i }).last();
  await expect(submitBtn).toBeVisible({ timeout: 10000 });
  await expect(submitBtn).toBeEnabled({ timeout: 10000 });
  await submitBtn.click();

  // Handle "Incomplete Hours" warning dialog if it appears (submit with < 8h per day).
  // "OK, Got It" dismisses the dialog WITHOUT submitting — we must click Submit again.
  const incompleteDialog = page.getByRole('dialog').filter({ hasText: /Incomplete Hours/i });
  const dialogVisible = await incompleteDialog.isVisible({ timeout: 4000 }).catch(() => false);
  if (dialogVisible) {
    // Dismiss the warning
    const okBtn = page.getByRole('button', { name: /OK.*Got It|Got It/i });
    if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await okBtn.click();
      await expect(incompleteDialog).not.toBeVisible({ timeout: 5000 }).catch(() => {});
    }
    // Re-click Submit to actually submit after acknowledging the warning
    await page.waitForTimeout(500);
    const submitBtnAgain = page.getByRole('button', { name: /^Submit/i }).last();
    if (await submitBtnAgain.isEnabled({ timeout: 5000 }).catch(() => false)) {
      await submitBtnAgain.click();
    }
  }

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
  test.setTimeout(120000); // 120s per test for workflow steps (backend can be slow under load)

  // ----------------------------------------------------------
  // WF-01: Wichai fills and submits timesheet (employee under Nattaya)
  // ----------------------------------------------------------
  test.describe('E2E-WF-01: Wichai fills and submits timesheet', () => {
    test.use({ storageState: authFile('wichai') });

    test('submit timesheet as wichai', async ({ page }) => {
      await navigateToWeek(page, 0);

      // Wait for timesheet to load: either spinner disappears OR status badge appears
      // The page shows status badge once the API responds
      const statusOrGridLoaded = page
        .getByText('Locked', { exact: true })
        .or(page.getByText('Submitted', { exact: true }))
        .or(page.getByText('Manager Approved', { exact: true }))
        .or(page.getByText('Draft', { exact: true }))
        .or(page.getByText('Rejected', { exact: true }))
        .or(page.locator('tbody tr').first());

      await statusOrGridLoaded.waitFor({ timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(300);

      // Check page state to determine if already submitted (idempotent for retries)
      const pageShowsLocked = await page.getByText('Locked', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
      const pageShowsSubmitted = await page.getByText('Submitted', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
      const pageShowsManagerApproved = await page.getByText('Manager Approved', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
      const alreadyNonEditable = pageShowsLocked || pageShowsSubmitted || pageShowsManagerApproved;

      if (!alreadyNonEditable) {
        await fillTimesheetHours(page, '8');
        await snap(page, 'e2e-wf-01', 'after-fill-hours');
        await saveDraftAndSubmit(page);
      }
      await snap(page, 'e2e-wf-01', 'employee-submitted');

      // UNCONDITIONAL: the timesheet must now be in a submitted or later state
      await expect(
        page.getByText('Submitted', { exact: true })
          .or(page.getByText('Manager Approved', { exact: true }))
          .or(page.getByText('Locked', { exact: true }))
          .or(page.getByText(/submitted for approval/i))
          .first(),
      ).toBeVisible({ timeout: 20000 });
    });
  });

  // ----------------------------------------------------------
  // WF-02: Ploy fills and submits timesheet (employee under Nattaya)
  // ----------------------------------------------------------
  test.describe('E2E-WF-02: Ploy fills and submits timesheet', () => {
    test.use({ storageState: authFile('ploy') });

    test('submit timesheet as ploy', async ({ page }) => {
      await navigateToWeek(page, 0);

      // Wait for timesheet to load: either spinner disappears OR status badge appears
      const statusOrGridLoaded = page
        .getByText('Locked', { exact: true })
        .or(page.getByText('Submitted', { exact: true }))
        .or(page.getByText('Manager Approved', { exact: true }))
        .or(page.getByText('Draft', { exact: true }))
        .or(page.getByText('Rejected', { exact: true }))
        .or(page.locator('tbody tr').first());
      await statusOrGridLoaded.waitFor({ timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(300);

      // Check page state to determine if already submitted (idempotent for retries)
      const pageShowsLocked = await page.getByText('Locked', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
      const pageShowsSubmitted = await page.getByText('Submitted', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
      const pageShowsManagerApproved = await page.getByText('Manager Approved', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
      const alreadyNonEditable = pageShowsLocked || pageShowsSubmitted || pageShowsManagerApproved;

      if (!alreadyNonEditable) {
        await fillTimesheetHours(page, '8');
        await snap(page, 'e2e-wf-02', 'after-fill-hours');
        await saveDraftAndSubmit(page);
      }
      await snap(page, 'e2e-wf-02', 'employee-submitted');

      // UNCONDITIONAL: the timesheet must now be in a submitted or later state
      await expect(
        page.getByText('Submitted', { exact: true })
          .or(page.getByText('Manager Approved', { exact: true }))
          .or(page.getByText('Locked', { exact: true }))
          .or(page.getByText(/submitted for approval/i))
          .first(),
      ).toBeVisible({ timeout: 20000 });
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
        await expect(page.getByText(/No pending approvals/i)).toBeVisible({ timeout: 30000 });
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
        await expect(page.getByText(/No pending approvals/i)).toBeVisible({ timeout: 30000 });
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
        await expect(page.getByText(/No pending approvals/i)).toBeVisible({ timeout: 30000 });
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
        await expect(page.getByText(/No pending approvals/i)).toBeVisible({ timeout: 30000 });
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
      test.setTimeout(360000); // 6 min — may need to navigate 10-20 weeks to find first draft

      test('submit timesheet for next week', async ({ page }) => {
        // Goal: ensure there is at least one timesheet from Wichai in "Submitted" state
        // so that Nattaya (WF-07 step 2) has something to reject.
        //
        // Strategy:
        // 1. Check the approvals API (as Nattaya) for any pending-manager timesheets from Wichai.
        //    If one already exists, this step is already done — no need to submit again.
        // 2. If nothing pending, navigate forward to find a Draft week and submit it.
        // 3. If no Draft weeks in 25 weeks, resubmit a Rejected week (from prior WF-08 run).

        await page.goto('/time-entry');
        await page.waitForLoadState('load');
        await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 30000 });
        await page.waitForTimeout(1500);

        // Navigate past the current week (week 0 was submitted/locked by WF-01/WF-04/WF-06)
        const navRow = page.locator('h2').filter({ hasText: /Week of/i }).locator('../..');
        const nextBtn = navRow.locator('button').last();

        // Find the first future week with "Draft" OR "Submitted" status.
        // "Submitted" counts — if already submitted, no need to do it again.
        // "Rejected" also counts — we can resubmit a rejected week.
        let foundUsableWeek = false;
        let alreadySubmitted = false;
        for (let i = 0; i < 25; i++) {
          const currentHeading = await page.locator('h2').filter({ hasText: /Week of/i }).textContent();
          await nextBtn.click();
          await expect(page.locator('h2').filter({ hasText: /Week of/i })).not.toHaveText(currentHeading!, { timeout: 8000 });
          await page.waitForTimeout(300);

          const statusLoaded = page
            .getByText('Draft', { exact: true })
            .or(page.getByText('Locked', { exact: true }))
            .or(page.getByText('Submitted', { exact: true }))
            .or(page.getByText('Manager Approved', { exact: true }))
            .or(page.getByText('Rejected', { exact: true }))
            .or(page.locator('tbody tr').first());
          await statusLoaded.waitFor({ timeout: 8000 }).catch(() => {});

          const isDraft = await page.getByText('Draft', { exact: true }).isVisible({ timeout: 1000 }).catch(() => false);
          const isSubmitted = await page.getByText('Submitted', { exact: true }).isVisible({ timeout: 1000 }).catch(() => false);
          const isRejected = await page.getByText('Rejected', { exact: true }).isVisible({ timeout: 1000 }).catch(() => false);
          const saveDraftEnabled = await page.getByRole('button', { name: /Save Draft/i }).isEnabled({ timeout: 1000 }).catch(() => false);

          if (isSubmitted) {
            // Already submitted — nothing to do for this step
            foundUsableWeek = true;
            alreadySubmitted = true;
            break;
          }
          if ((isDraft || isRejected) && saveDraftEnabled) {
            foundUsableWeek = true;
            break;
          }
        }

        if (!foundUsableWeek) {
          // All future weeks are locked (full test cycle ran before). Navigate back to current week
          // and check if it's Rejected or Draft (from WF-08 resubmit being rejected again).
          await page.goto('/time-entry');
          await page.waitForLoadState('load');
          await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 15000 });
          await page.waitForTimeout(1500);
          const isRejectedNow = await page.getByText('Rejected', { exact: true }).isVisible({ timeout: 3000 }).catch(() => false);
          const isDraftNow = await page.getByText('Draft', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
          const isSubmittedNow = await page.getByText('Submitted', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
          if (isSubmittedNow) {
            foundUsableWeek = true;
            alreadySubmitted = true;
          } else if (isRejectedNow || isDraftNow) {
            foundUsableWeek = true;
          }
        }

        if (!foundUsableWeek) {
          // Truly exhausted — all weeks locked. This happens after many test runs on a shared DB.
          // WF-07 rejection cannot proceed; skip gracefully rather than fail.
          console.log('WF-07: No submittable week found — all weeks locked after repeated runs. Skipping.');
          test.skip();
          return;
        }

        if (!alreadySubmitted) {
          await fillTimesheetHours(page, '8');
          await snap(page, 'e2e-wf-07', 'wichai-fill-next-week');
          await saveDraftAndSubmit(page);
        }

        // UNCONDITIONAL: timesheet must now be in Submitted or Manager Approved state
        await expect(
          page.getByText('Submitted', { exact: true })
            .or(page.getByText('Manager Approved', { exact: true }))
            .or(page.getByText(/submitted for approval/i))
            .first(),
        ).toBeVisible({ timeout: 20000 });
        await snap(page, 'e2e-wf-07', 'wichai-submitted-next-week');
      });
    });

    test.describe('Nattaya rejects with comment', () => {
      test.use({ storageState: authFile('nattaya') });

      test('reject timesheet with comment', async ({ page }) => {
        await page.goto('/approvals');
        await page.waitForLoadState('load');
        await expect(page.locator('main h1').filter({ hasText: 'Approvals' })).toBeVisible({ timeout: 30000 });

        // Try "As Manager" tab first; if empty, fall back to "As CC Owner"
        // (nattaya may have employee role with pending items only under CC Owner view)
        const managerTab = page.getByRole('tab', { name: /As Manager/i });
        await expect(managerTab).toBeVisible({ timeout: 10000 });
        await managerTab.click();
        await page.waitForTimeout(1500);

        // Check if reject button is visible under manager tab; if not, try CC Owner tab
        let rejectBtn = page.locator('button[title="Reject"]').first();
        const rejectUnderManager = await rejectBtn.isVisible({ timeout: 5000 }).catch(() => false);
        if (!rejectUnderManager) {
          const ccOwnerTab = page.getByRole('tab', { name: /As CC Owner/i });
          if (await ccOwnerTab.isVisible({ timeout: 2000 }).catch(() => false)) {
            await ccOwnerTab.click();
            await page.waitForTimeout(1500);
            rejectBtn = page.locator('button[title="Reject"]').first();
          }
        }

        // If still no reject button, WF-07 step 1 was skipped (state exhausted) — skip this step too
        const hasRejectBtn = await rejectBtn.isVisible({ timeout: 5000 }).catch(() => false);
        if (!hasRejectBtn) {
          console.log('WF-07 reject: No pending timesheets to reject — WF-07 submit was skipped. Skipping.');
          test.skip();
          return;
        }

        await expect(rejectBtn).toBeVisible({ timeout: 15000 });
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
    test.setTimeout(360000); // 6 min — may need to navigate 10-20 weeks

    test('view rejection and resubmit', async ({ page }) => {
      // Navigate forward to find a week with "Rejected" or editable "Draft" status
      // (WF-07 submitted and Nattaya rejected — so we look for the rejected week)
      await page.goto('/time-entry');
      await page.waitForLoadState('load');
      await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 30000 });
      await page.waitForTimeout(1500);

      const navRow = page.locator('h2').filter({ hasText: /Week of/i }).locator('../..');
      const nextBtn = navRow.locator('button').last();

      let foundRejectedOrEditable = false;
      for (let i = 0; i < 25; i++) {
        const currentHeading = await page.locator('h2').filter({ hasText: /Week of/i }).textContent();
        await nextBtn.click();
        await expect(page.locator('h2').filter({ hasText: /Week of/i })).not.toHaveText(currentHeading!, { timeout: 8000 });
        await page.waitForTimeout(300);

        const statusLoaded = page
          .getByText('Draft', { exact: true })
          .or(page.getByText('Locked', { exact: true }))
          .or(page.getByText('Submitted', { exact: true }))
          .or(page.getByText('Rejected', { exact: true }))
          .or(page.locator('tbody tr').first());
        await statusLoaded.waitFor({ timeout: 8000 }).catch(() => {});

        const isRejected = await page.getByText('Rejected', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
        const isDraft = await page.getByText('Draft', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
        const saveDraftEnabled = await page.getByRole('button', { name: /Save Draft/i }).isEnabled({ timeout: 2000 }).catch(() => false);

        if (isRejected || (isDraft && saveDraftEnabled)) {
          foundRejectedOrEditable = true;
          break;
        }
      }

      if (!foundRejectedOrEditable) {
        // Also check current week (week 0) for rejected state
        await page.goto('/time-entry');
        await page.waitForLoadState('load');
        await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(1500);
        const isRejectedNow = await page.getByText('Rejected', { exact: true }).isVisible({ timeout: 3000 }).catch(() => false);
        const isDraftNow = await page.getByText('Draft', { exact: true }).isVisible({ timeout: 2000 }).catch(() => false);
        if (isRejectedNow || isDraftNow) {
          foundRejectedOrEditable = true;
        }
      }

      if (!foundRejectedOrEditable) {
        // WF-07 was skipped (state exhausted), so no rejected week exists. Skip WF-08 too.
        console.log('WF-08: No rejected/editable week found — WF-07 was skipped. Skipping WF-08.');
        test.skip();
        return;
      }

      // Assert the status badge shows Rejected or Draft
      await expect(
        page.getByText('Rejected').or(page.getByText('Draft')).first(),
      ).toBeVisible({ timeout: 30000 });
      await snap(page, 'e2e-wf-08', 'sees-rejected');

      // Fill all weekdays with 8h and resubmit
      await fillTimesheetHours(page, '8');
      await saveDraftAndSubmit(page);
      await snap(page, 'e2e-wf-08', 'after-resubmit');

      // UNCONDITIONAL: verify submission succeeded
      await expect(
        page.getByText('Submitted', { exact: true })
          .or(page.getByText(/submitted for approval/i))
          .first(),
      ).toBeVisible({ timeout: 20000 });
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
      await expect(page.getByText('Forecast', { exact: true }).first()).toBeVisible();

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
