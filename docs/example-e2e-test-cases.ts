/**
 * ============================================================
 * EXAMPLE E2E TEST CASES — Step-by-Step Narration Format
 * ============================================================
 *
 * ไฟล์นี้เป็นตัวอย่างจำลอง (NOT real runnable tests)
 * เพื่อแสดง format ที่ test-writer agent ควรเขียน
 * อ้างอิงจาก docs/prd-runbook.md
 *
 * แต่ละ test มี:
 *   - Step-by-step comments (// Step N:)
 *   - Pre-check: สิ่งที่ต้องตรวจก่อนทำ action
 *   - Action: สิ่งที่ user ทำ
 *   - Post-check: สิ่งที่ต้องเป็นหลังทำ action
 *   - Snap: evidence screenshot ที่จุดสำคัญ
 * ============================================================
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';

// --- Helpers ---
const SCREENSHOTS_DIR = path.join(__dirname, '../../docs/test-results/screenshots');

async function snap(page: Page, testId: string, stepName: string) {
  const fileName = `${testId}-${stepName}--desktop.png`.toLowerCase().replace(/\s+/g, '-');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, fileName), fullPage: false });
}

// ============================================================
// AC-1: Employee Time Entry — Weekly Logging
// Ref: PRD AC-1, AC-3, AC-4, AC-5, AC-6
// ============================================================

test.describe('Time Entry — Employee Weekly Flow', () => {

  test('E2E-TS-01: Employee logs hours to multiple charge codes and submits', async ({ page }) => {
    // Step 1: Login as employee (wichai.s@central.co.th)
    // Navigate to Time Entry page via sidebar menu "Time Entry"
    // Pre-check: page title should show "Time Entry"
    // Pre-check: weekly grid should display Mon–Sun columns for current week
    await page.goto('/time-entry');
    await expect(page.locator('h1')).toContainText('Time Entry');
    const weekGrid = page.locator('[data-testid="timesheet-grid"]');
    await expect(weekGrid).toBeVisible();
    await snap(page, 'e2e-ts-01', 'page-loaded');

    // Step 2: Verify week navigation controls
    // Pre-check: ">" (next week) button should be DISABLED because we're on current week
    // Pre-check: "<" (previous week) button should be ENABLED
    // This enforces AC-2: cannot log future time
    const nextWeekBtn = page.locator('button[aria-label="Next week"]');
    const prevWeekBtn = page.locator('button[aria-label="Previous week"]');
    await expect(nextWeekBtn).toBeDisabled();
    await expect(prevWeekBtn).toBeEnabled();

    // Step 3: Add a second charge code to the grid
    // Action: click "+ Add Charge Code" button → select a charge code from dropdown
    // Pre-check: the button should be visible in the sticky action bar
    // Post-check: a new row appears in the grid with the selected charge code name
    const addBtn = page.locator('button:has-text("Add Charge Code")');
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    const dropdown = page.locator('[data-testid="charge-code-select"]');
    await dropdown.selectOption({ label: 'OPS-002 Internal Support' });
    await expect(weekGrid.locator('text=OPS-002')).toBeVisible();
    await snap(page, 'e2e-ts-01', 'charge-code-added');

    // Step 4: Fill hours for Monday across multiple charge codes (AC-5: split time)
    // Action: click cell [PRJ-001, Monday] → type 4 → click cell [OPS-002, Monday] → type 4
    // Post-check: daily total for Monday should show "8h"
    // This demonstrates AC-5: splitting 8h across 2 charge codes in one day
    await page.locator('[data-testid="cell-PRJ001-mon"]').click();
    await page.keyboard.type('4');
    await page.keyboard.press('Tab');
    await page.locator('[data-testid="cell-OPS002-mon"]').click();
    await page.keyboard.type('4');
    const mondayTotal = page.locator('[data-testid="daily-total-mon"]');
    await expect(mondayTotal).toContainText('8');

    // Step 5: Fill remaining weekdays with 8h each (Tue–Fri)
    // Action: fill cells for each day, ensuring ≥8h per day (AC-3 requirement)
    // Post-check: weekly total should show ≥40h
    // (simplified — in real test, fill each cell)
    for (const day of ['tue', 'wed', 'thu', 'fri']) {
      await page.locator(`[data-testid="cell-PRJ001-${day}"]`).click();
      await page.keyboard.type('8');
    }
    const weeklyTotal = page.locator('[data-testid="weekly-total"]');
    await expect(weeklyTotal).toContainText('40');

    // Step 6: Add a description note to Monday's PRJ-001 entry (AC-6)
    // Action: hover over cell → click pencil icon → type description → save
    // Pre-check: pencil icon appears on hover
    // Post-check: cell shows orange triangle indicator after saving note
    await page.locator('[data-testid="cell-PRJ001-mon"]').hover();
    const noteIcon = page.locator('[data-testid="cell-PRJ001-mon"] [data-testid="note-icon"]');
    await expect(noteIcon).toBeVisible();
    await noteIcon.click();
    await expect(page.locator('text=Note for')).toBeVisible(); // dialog title
    await page.fill('[data-testid="note-textarea"]', 'API integration with payment gateway');
    await page.click('button:has-text("Save Note")');
    const noteIndicator = page.locator('[data-testid="cell-PRJ001-mon"] .note-indicator');
    await expect(noteIndicator).toBeVisible();
    await snap(page, 'e2e-ts-01', 'note-added');

    // Step 7: Submit the timesheet
    // Action: click "Submit →" button
    // Pre-check: button should be enabled (all weekdays have ≥8h)
    // Post-check: timesheet status badge changes from "Draft" to "Submitted"
    // Post-check: grid cells become read-only (cannot edit submitted timesheet)
    const submitBtn = page.locator('button:has-text("Submit")');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Submitted');
    await snap(page, 'e2e-ts-01', 'after-submit');

    // Step 8: Verify API state — timesheet is submitted in backend
    const response = await page.request.get('/api/v1/timesheets/my/current');
    const data = await response.json();
    expect(data.status).toBe('submitted');
    expect(data.entries.length).toBeGreaterThan(0);
  });

  test('E2E-TS-02: Submit blocked when hours < 8h on a weekday (AC-3 negative)', async ({ page }) => {
    // Step 1: Login as employee, navigate to Time Entry
    await page.goto('/time-entry');
    await expect(page.locator('h1')).toContainText('Time Entry');

    // Step 2: Fill Monday with only 4h (intentionally incomplete)
    // Post-check: daily total shows "4h" — below the 8h minimum
    await page.locator('[data-testid="cell-PRJ001-mon"]').click();
    await page.keyboard.type('4');
    await expect(page.locator('[data-testid="daily-total-mon"]')).toContainText('4');

    // Step 3: Attempt to submit
    // Action: click "Submit →"
    // Post-check: validation dialog appears listing incomplete days
    // Post-check: dialog shows "Mon (Mar 18) 4.0h / 8h"
    // Post-check: timesheet status remains "Draft" (NOT submitted)
    await page.click('button:has-text("Submit")');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Incomplete Hours');
    await expect(dialog).toContainText('4.0h / 8h');
    await snap(page, 'e2e-ts-02', 'validation-dialog');

    // Step 4: Dismiss dialog and verify timesheet is still draft
    // Action: click "OK, Got It"
    // Post-check: dialog closes, status badge still shows "Draft"
    await page.click('button:has-text("OK, Got It")');
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Draft');
    await snap(page, 'e2e-ts-02', 'still-draft');
  });
});

// ============================================================
// AC-12 & AC-13: Approval Workflow
// Ref: PRD AC-12, AC-13
// ============================================================

test.describe('Approval Workflow — Full Cycle', () => {

  test('E2E-WF-01: Full workflow: Employee submit → Manager approve → Auto-lock', async ({ page }) => {
    // --- Phase 1: Employee submits timesheet ---

    // Step 1: Login as employee (wichai.s@central.co.th)
    // Navigate to Time Entry
    // Pre-check: timesheet status is "Draft" or empty
    await page.goto('/time-entry');
    await expect(page.locator('h1')).toContainText('Time Entry');

    // Step 2: Fill 8h/day for Mon–Fri and submit
    // (assume helper fills all days — focus on workflow, not data entry)
    // Post-check: status changes to "Submitted" (yellow badge)
    // Post-check: grid cells become read-only
    // ... (fill hours)
    await page.click('button:has-text("Submit")');
    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Submitted');
    const firstCell = page.locator('[data-testid="cell-PRJ001-mon"] input');
    await expect(firstCell).toBeDisabled(); // cannot edit submitted timesheet
    await snap(page, 'e2e-wf-01', 'employee-submitted');

    // --- Phase 2: Manager approves ---

    // Step 3: Login as charge manager (nattaya.k@central.co.th)
    // Navigate to Approvals page via sidebar menu "Approvals"
    // Pre-check: "Pending Approvals" tab is active by default
    // Pre-check: Wichai's timesheet appears in the pending list
    // (login switch happens via storageState or re-auth)
    await page.goto('/approvals');
    await expect(page.locator('h1')).toContainText('Approvals');
    const pendingTab = page.locator('[data-testid="tab-pending"]');
    await expect(pendingTab).toHaveAttribute('aria-selected', 'true');
    const wichaiRow = page.locator('text=Wichai');
    await expect(wichaiRow).toBeVisible();
    await snap(page, 'e2e-wf-01', 'manager-sees-pending');

    // Step 4: Approve Wichai's timesheet
    // Action: click the ✓ (approve) button on Wichai's row
    // Post-check: Wichai's row disappears from pending list
    // Post-check: success toast "Timesheet approved" appears
    const approveBtn = page.locator('[data-testid="approve-btn"]').first();
    await approveBtn.click();
    await expect(page.locator('text=Timesheet approved')).toBeVisible();
    await expect(wichaiRow).not.toBeVisible();
    await snap(page, 'e2e-wf-01', 'manager-approved');

    // Step 5: Verify in History tab that approval is recorded
    // Action: click "History" tab
    // Post-check: Wichai's entry appears with status "Approved" and today's date
    await page.click('[data-testid="tab-history"]');
    const historyRow = page.locator('[data-testid="history-list"]').locator('text=Wichai');
    await expect(historyRow).toBeVisible();
    await snap(page, 'e2e-wf-01', 'approval-in-history');

    // --- Phase 3: Verify employee sees approved/locked status ---

    // Step 6: Login back as employee (wichai.s@central.co.th)
    // Navigate to Time Entry
    // Post-check: timesheet status should be "Approved" (green badge) or "Locked" (if period ended)
    // Post-check: all cells remain read-only — employee cannot modify approved timesheet
    await page.goto('/time-entry');
    const statusBadge = page.locator('[data-testid="status-badge"]');
    const statusText = await statusBadge.textContent();
    expect(['Approved', 'Locked']).toContain(statusText?.trim());
    await expect(firstCell).toBeDisabled();
    await snap(page, 'e2e-wf-01', 'employee-sees-approved');

    // Step 7: Verify API state confirms the workflow completed
    const response = await page.request.get('/api/v1/timesheets/my/current');
    const data = await response.json();
    expect(['approved', 'locked']).toContain(data.status);
  });

  test('E2E-WF-02: Manager rejects timesheet → Employee can re-edit and resubmit', async ({ page }) => {
    // Step 1: Login as charge manager (nattaya.k@central.co.th)
    // Navigate to Approvals → Pending tab
    // Pre-check: at least one submitted timesheet is visible
    await page.goto('/approvals');
    const pendingItem = page.locator('[data-testid="pending-list"] > div').first();
    await expect(pendingItem).toBeVisible();

    // Step 2: Reject the first pending timesheet
    // Action: click ✗ (reject) button → rejection dialog opens
    // Pre-check: dialog has a "comment" textarea (required)
    const rejectBtn = pendingItem.locator('[data-testid="reject-btn"]');
    await rejectBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('textarea')).toBeVisible();
    await snap(page, 'e2e-wf-02', 'rejection-dialog');

    // Step 3: Enter rejection reason and confirm
    // Action: type reason → click "Confirm"
    // Post-check: toast "Timesheet rejected" appears
    // Post-check: item disappears from pending list
    await dialog.locator('textarea').fill('Hours on OPS-002 seem too high for Monday, please review');
    await dialog.locator('button:has-text("Confirm")').click();
    await expect(page.locator('text=Timesheet rejected')).toBeVisible();
    await snap(page, 'e2e-wf-02', 'after-rejection');

    // Step 4: Login as the rejected employee
    // Navigate to Time Entry
    // Post-check: status badge shows "Rejected" (red badge)
    // Post-check: grid cells are EDITABLE again (employee can fix and resubmit)
    await page.goto('/time-entry');
    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Rejected');
    const cell = page.locator('[data-testid="cell-PRJ001-mon"] input');
    await expect(cell).toBeEnabled(); // can edit again after rejection
    await snap(page, 'e2e-wf-02', 'employee-can-reedit');

    // Step 5: Employee modifies hours and resubmits
    // Action: change OPS-002 Monday from 4h to 2h, add 2h to PRJ-001
    // Action: click "Submit →"
    // Post-check: status changes from "Rejected" back to "Submitted"
    await page.locator('[data-testid="cell-OPS002-mon"]').click();
    await page.keyboard.type('2');
    await page.click('button:has-text("Submit")');
    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Submitted');
    await snap(page, 'e2e-wf-02', 'resubmitted');

    // Step 6: Verify API — timesheet status is "submitted" again
    const response = await page.request.get('/api/v1/timesheets/my/current');
    expect((await response.json()).status).toBe('submitted');
  });
});

// ============================================================
// AC-7 & AC-8: Charge Code CRUD
// Ref: PRD AC-7, AC-8, AC-9
// ============================================================

test.describe('Charge Code Management', () => {

  test('E2E-CC-01: Admin creates a new Project under existing Program', async ({ page }) => {
    // Step 1: Login as admin (tachongrak@central.co.th)
    // Navigate to Charge Codes page
    // Pre-check: tree view (left panel) shows existing Programs
    await page.goto('/charge-codes');
    await expect(page.locator('h1')).toContainText('Charge Codes');
    const tree = page.locator('[data-testid="charge-code-tree"]');
    await expect(tree).toBeVisible();
    await snap(page, 'e2e-cc-01', 'tree-loaded');

    // Step 2: Click "+ Create New" to open creation dialog
    // Pre-check: button is visible at the top of left panel
    // Post-check: dialog opens with empty form
    await page.click('button:has-text("Create New")');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await snap(page, 'e2e-cc-01', 'dialog-open');

    // Step 3: Fill form fields for a new Project
    // Action: select Level = "Project"
    // Post-check: "Parent" dropdown appears and is REQUIRED (non-Program levels must have parent — AC-8)
    await dialog.locator('[name="level"]').selectOption('project');
    const parentSelect = dialog.locator('[name="parentId"]');
    await expect(parentSelect).toBeVisible();
    await expect(parentSelect).toHaveAttribute('required', '');

    // Step 4: Select parent Program and fill remaining fields
    // Action: select parent = "Digital Transformation", name = "Payment Gateway"
    await parentSelect.selectOption({ label: 'Digital Transformation' });
    await dialog.locator('[name="code"]').fill('PRJ-PAY-001');
    await dialog.locator('[name="name"]').fill('Payment Gateway');
    await dialog.locator('[name="isBillable"]').check();
    await dialog.locator('[name="budgetAmount"]').fill('500000');

    // Step 5: Submit the form
    // Action: click "Create"
    // Post-check: dialog closes, success toast appears
    // Post-check: new project "PRJ-PAY-001" appears in tree under "Digital Transformation"
    await dialog.locator('button:has-text("Create")').click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('text=Charge code created')).toBeVisible();
    await expect(tree.locator('text=PRJ-PAY-001')).toBeVisible();
    await snap(page, 'e2e-cc-01', 'after-create');

    // Step 6: Verify in API that the hierarchy is correct
    // Post-check: new project has parentId pointing to the Program
    const response = await page.request.get('/api/v1/charge-codes/tree');
    const treeData = await response.json();
    const program = treeData.find((n: any) => n.name === 'Digital Transformation');
    const newProject = program?.children?.find((c: any) => c.code === 'PRJ-PAY-001');
    expect(newProject).toBeTruthy();
    expect(newProject.level).toBe('project');
    expect(newProject.parentId).toBe(program.id);
  });

  test('E2E-CC-02: Creating Project without parent is blocked (AC-8 negative)', async ({ page }) => {
    // Step 1: Navigate to Charge Codes and open create dialog
    await page.goto('/charge-codes');
    await page.click('button:has-text("Create New")');
    const dialog = page.locator('[role="dialog"]');

    // Step 2: Select Level = "Project" but do NOT select a parent
    // Action: select level, fill name, leave parent empty
    await dialog.locator('[name="level"]').selectOption('project');
    await dialog.locator('[name="code"]').fill('PRJ-ORPHAN');
    await dialog.locator('[name="name"]').fill('Orphan Project');

    // Step 3: Attempt to create without parent
    // Action: click "Create"
    // Post-check: validation error appears — "Parent is required for Project level"
    // Post-check: dialog remains open (form not submitted)
    await dialog.locator('button:has-text("Create")').click();
    await expect(dialog.locator('text=Parent is required')).toBeVisible();
    await expect(dialog).toBeVisible(); // still open
    await snap(page, 'e2e-cc-02', 'parent-required-error');
  });
});

// ============================================================
// AC-10: Charge Code Access Control
// Ref: PRD AC-10
// ============================================================

test.describe('Charge Code Access Control', () => {

  test('E2E-ACC-01: CC Owner assigns user and user sees charge code in Time Entry', async ({ page }) => {
    // Step 1: Login as admin (who is CC Owner for PRG-001)
    // Navigate to Charge Codes → select PRG-001 in tree
    // Pre-check: detail panel shows on the right
    await page.goto('/charge-codes');
    await page.locator('[data-testid="charge-code-tree"]').locator('text=PRG-001').click();
    const detailPanel = page.locator('[data-testid="detail-panel"]');
    await expect(detailPanel).toBeVisible();

    // Step 2: Switch to "Access" tab
    // Pre-check: shows list of currently assigned users
    await detailPanel.locator('[data-testid="tab-access"]').click();
    const assignedList = page.locator('[data-testid="assigned-users"]');
    await expect(assignedList).toBeVisible();
    await snap(page, 'e2e-acc-01', 'access-tab-loaded');

    // Step 3: Add a new user (Ploy) to the charge code
    // Action: click "+ Add" → search for "ploy" → check the checkbox → click "Add (1)"
    // Post-check: Ploy appears in assigned users list
    await page.click('button:has-text("Add")');
    await page.fill('[data-testid="user-search"]', 'ploy');
    await page.locator('text=ploy.r@central.co.th').locator('..').locator('input[type="checkbox"]').check();
    await page.click('button:has-text("Add (1)")');
    await expect(assignedList.locator('text=Ploy')).toBeVisible();
    await snap(page, 'e2e-acc-01', 'user-added');

    // Step 4: Login as Ploy (ploy.r@central.co.th)
    // Navigate to Time Entry → click "+ Add Charge Code"
    // Post-check: PRG-001 appears in the dropdown (because Ploy is now assigned)
    await page.goto('/time-entry');
    await page.click('button:has-text("Add Charge Code")');
    const ccDropdown = page.locator('[data-testid="charge-code-select"]');
    await expect(ccDropdown.locator('option:has-text("PRG-001")')).toBeVisible();
    await snap(page, 'e2e-acc-01', 'ploy-sees-charge-code');
  });
});

// ============================================================
// RBAC: Role-Based Menu Visibility
// Ref: PRD สิทธิ์การเข้าถึงแต่ละเมนู
// ============================================================

test.describe('RBAC — Sidebar Menu Visibility', () => {

  test('E2E-RBAC-01: Employee sees only Time Entry in sidebar', async ({ page }) => {
    // Step 1: Login as employee (wichai.s@central.co.th)
    // Pre-check: sidebar is visible
    await page.goto('/');
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible();

    // Step 2: Verify visible menu items
    // Post-check: "Time Entry" is visible
    // Post-check: "Charge Codes", "Approvals", "Reports", "Budget", "Admin" are NOT visible
    await expect(sidebar.locator('text=Time Entry')).toBeVisible();
    await expect(sidebar.locator('text=Charge Codes')).not.toBeVisible();
    await expect(sidebar.locator('text=Approvals')).not.toBeVisible();
    await expect(sidebar.locator('text=Reports')).not.toBeVisible();
    await expect(sidebar.locator('text=Budget')).not.toBeVisible();
    await expect(sidebar.locator('text=Admin')).not.toBeVisible();
    await snap(page, 'e2e-rbac-01', 'employee-sidebar');
  });

  test('E2E-RBAC-02: Employee cannot access /reports by direct URL', async ({ page }) => {
    // Step 1: Login as employee
    // Action: navigate directly to /reports (bypassing sidebar)
    // Post-check: should be redirected to / or show "Access Denied"
    // This ensures route-level protection, not just UI hiding
    await page.goto('/reports');
    await page.waitForURL(url => !url.toString().includes('/reports'));
    await expect(page.locator('text=Reports')).not.toBeVisible();
    await snap(page, 'e2e-rbac-02', 'employee-blocked-from-reports');
  });

  test('E2E-RBAC-03: PMO sees Reports and Budget but NOT Approvals or Admin', async ({ page }) => {
    // Step 1: Login as PMO (somchai.p@central.co.th)
    await page.goto('/');
    const sidebar = page.locator('[data-testid="sidebar"]');

    // Step 2: Verify menu visibility matches PRD permission matrix
    // Post-check: Time Entry ✅, Charge Codes ✅, Reports ✅, Budget ✅
    // Post-check: Approvals ❌, Admin ❌
    await expect(sidebar.locator('text=Time Entry')).toBeVisible();
    await expect(sidebar.locator('text=Charge Codes')).toBeVisible();
    await expect(sidebar.locator('text=Reports')).toBeVisible();
    await expect(sidebar.locator('text=Budget')).toBeVisible();
    await expect(sidebar.locator('text=Approvals')).not.toBeVisible();
    await expect(sidebar.locator('text=Admin')).not.toBeVisible();
    await snap(page, 'e2e-rbac-03', 'pmo-sidebar');
  });
});

// ============================================================
// AC-15 & AC-16: Reports & Budget Alerts
// Ref: PRD AC-15, AC-16
// ============================================================

test.describe('Reports — KPI and Alerts', () => {

  test('E2E-RPT-01: Reports page shows KPI cards with correct data', async ({ page }) => {
    // Step 1: Login as admin, navigate to Reports
    // Pre-check: page loads with period selector and program filter
    await page.goto('/reports');
    await expect(page.locator('h1')).toContainText('Reports');

    // Step 2: Verify all 4 KPI cards are present
    // Post-check: "Total Budget", "Actual Spent", "Utilization", "Overrun Count" cards are visible
    // Post-check: each card shows a numeric value (not "N/A" or empty)
    const kpiCards = page.locator('[data-testid="kpi-cards"]');
    await expect(kpiCards.locator('text=Total Budget')).toBeVisible();
    await expect(kpiCards.locator('text=Actual Spent')).toBeVisible();
    await expect(kpiCards.locator('text=Utilization')).toBeVisible();
    await expect(kpiCards.locator('text=Overrun')).toBeVisible();
    await snap(page, 'e2e-rpt-01', 'kpi-cards-loaded');

    // Step 3: Verify KPI values match API data
    // Action: call reports API and compare with displayed values
    const response = await page.request.get('/api/v1/reports/summary');
    const apiData = await response.json();
    expect(apiData.totalBudget).toBeGreaterThan(0);
    expect(apiData.actualSpent).toBeGreaterThanOrEqual(0);
  });

  test('E2E-RPT-02: Budget alert severity colors match threshold rules', async ({ page }) => {
    // Step 1: Navigate to Reports → scroll to Alerts section
    await page.goto('/reports');
    const alertsSection = page.locator('[data-testid="budget-alerts"]');
    await alertsSection.scrollIntoViewIfNeeded();
    await expect(alertsSection).toBeVisible();
    await snap(page, 'e2e-rpt-02', 'alerts-section');

    // Step 2: Verify alert severity colors match PRD rules
    // Red = actual > 100% budget
    // Orange = actual > 90% budget
    // Yellow = actual > 80% budget OR forecast > budget
    // Post-check: each alert row has correct severity badge color
    const alerts = await page.request.get('/api/v1/reports/budget-alerts');
    const alertData = await alerts.json();

    for (const alert of alertData) {
      const ratio = alert.actual / alert.budget;
      if (ratio > 1.0) {
        expect(alert.severity).toBe('red');
      } else if (ratio > 0.9) {
        expect(alert.severity).toBe('orange');
      } else if (ratio > 0.8) {
        expect(alert.severity).toBe('yellow');
      }
    }
  });
});

// ============================================================
// AC-14: Cost Rate Management (Admin)
// Ref: PRD AC-14
// ============================================================

test.describe('Admin — Cost Rates', () => {

  test('E2E-RATE-01: Admin adds a new cost rate for job grade', async ({ page }) => {
    // Step 1: Login as admin, navigate to Admin → Rates
    // Pre-check: rates table is visible with existing rates
    await page.goto('/admin/rates');
    await expect(page.locator('h1')).toContainText('Rates');
    const ratesTable = page.locator('[data-testid="rates-table"]');
    await expect(ratesTable).toBeVisible();
    await snap(page, 'e2e-rate-01', 'rates-table-loaded');

    // Step 2: Click "Add Rate" button
    // Post-check: dialog opens with empty form
    await page.click('button:has-text("Add Rate")');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await snap(page, 'e2e-rate-01', 'add-rate-dialog');

    // Step 3: Fill rate details
    // Action: Job Grade = "L7", Hourly Rate = 850, Effective From = today
    await dialog.locator('[name="jobGrade"]').fill('L7');
    await dialog.locator('[name="hourlyRate"]').fill('850');
    await dialog.locator('[name="effectiveFrom"]').fill('2026-03-19');

    // Step 4: Submit and verify
    // Action: click "Create" / "Add"
    // Post-check: dialog closes, new rate "L7 — ฿850" appears in the table
    // Post-check: the rate has status "Active"
    await dialog.locator('button:has-text("Create")').click();
    await expect(dialog).not.toBeVisible();
    await expect(ratesTable.locator('text=L7')).toBeVisible();
    await expect(ratesTable.locator('text=850')).toBeVisible();
    await snap(page, 'e2e-rate-01', 'rate-created');

    // Step 5: Verify via API
    const response = await page.request.get('/api/v1/rates');
    const rates = await response.json();
    const l7Rate = rates.find((r: any) => r.jobGrade === 'L7');
    expect(l7Rate).toBeTruthy();
    expect(Number(l7Rate.hourlyRate)).toBe(850);
  });
});
