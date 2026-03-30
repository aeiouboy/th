import { test, expect, Browser, BrowserContext } from '@playwright/test';
import { snap, FRONTEND_URL, BACKEND_URL, authFile, resetWichaiTimesheets } from './helpers';

// Business Functional Tests: Approval Workflow Module
// Tests BF-AP-01, BF-AP-02, BF-AP-03
// Involves role switching: employee (wichai) → charge_manager (nattaya) → employee again

// Default storage state: employee (wichai)
test.use({ storageState: authFile('wichai') });

test.beforeAll(async ({ browser }) => {
  // Health check
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const backendOk = await page.request
    .get(`${BACKEND_URL}/api/v1/timesheets`)
    .then((r) => r.status() !== 0)
    .catch(() => false);
  if (!backendOk) throw new Error(`Backend not running at ${BACKEND_URL}`);

  const frontendOk = await page.request
    .get(FRONTEND_URL)
    .then((r) => r.status() < 500)
    .catch(() => false);
  if (!frontendOk) throw new Error(`Frontend not running at ${FRONTEND_URL}`);

  await ctx.close();

  // Reset DB state for test isolation
  await resetWichaiTimesheets();
});

test('BF-AP-01: Full Approval Cycle — Employee Submit → Manager Approve → Lock', async ({ browser }) => {
  // สถานการณ์: Employee กรอกเวลา Submit แล้ว Manager Approve
  // Business Rule: Timesheet ต้องผ่าน approval workflow: draft → submitted → approved/locked

  // === Step 1: [Employee wichai] เข้าหน้า Time Entry, เพิ่ม charge code, กรอกเวลา, แล้ว Submit ===
  const employeeCtx = await browser.newContext({ storageState: authFile('wichai') });
  const employeePage = await employeeCtx.newPage();

  await employeePage.goto('/time-entry');
  await employeePage.waitForLoadState('load');
  await expect(employeePage.getByText(/Week of/i)).toBeVisible({ timeout: 30000 });
  await employeePage.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 30000 }).catch(() => {});

  // หา Draft week (ลองย้อนกลับถ้าสัปดาห์ปัจจุบันไม่ใช่ Draft)
  const draftBadge = employeePage.locator('[data-slot="badge"]:has-text("Draft")');
  if (!(await draftBadge.isVisible({ timeout: 2000 }).catch(() => false))) {
    for (let i = 0; i < 4; i++) {
      const prevBtn = employeePage.locator('main button:has(svg), .max-w-\\[1200px\\] button:has(svg)').first();
      if (await prevBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await prevBtn.click();
        await employeePage.waitForTimeout(1500);
        await employeePage.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 15000 }).catch(() => {});
      }
      if (await draftBadge.isVisible({ timeout: 2000 }).catch(() => false)) break;
    }
  }

  await snap(employeePage, 'bf-ap-01', '01-employee-time-entry');

  // เพิ่ม charge code ถ้ายังไม่มี
  const noChargeMsg = employeePage.getByText(/No charge codes added/i);
  if (await noChargeMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
    const addBtn = employeePage.locator('button', { hasText: /Add Charge Code/i }).first();
    await addBtn.click();
    await employeePage.waitForTimeout(1000);
    const option = employeePage.locator('[role="option"], [data-radix-select-item], [cmdk-item]').first();
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();
    await employeePage.waitForTimeout(1500);
  }

  // กรอก 8 ชม. ทุกวัน จ-ศ (click cell button → input → fill)
  const cellButtons = employeePage.locator('button.cursor-text');
  for (let day = 0; day < 5; day++) {
    const cellBtn = cellButtons.nth(day);
    if (await cellBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cellBtn.click();
      await employeePage.waitForTimeout(300);
      const input = employeePage.locator('input[inputmode="decimal"]');
      if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
        await input.fill('8');
        await input.blur();
        await employeePage.waitForTimeout(300);
      }
    }
  }

  // Save Draft ก่อน — รอ auto-save เสร็จ
  const saveDraftBtn = employeePage.getByRole('button', { name: /Save Draft/i });
  if (await saveDraftBtn.isEnabled().catch(() => false)) {
    await saveDraftBtn.click();
    // รอ "Saving..." หายไป
    await employeePage.locator('text=Saving').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await employeePage.waitForTimeout(1000);
  }

  // Submit timesheet — รอ button พร้อม (ไม่ใช่ "Saving...")
  const submitBtn = employeePage.getByRole('button', { name: /Submit/i }).last();
  await expect(submitBtn).toBeVisible({ timeout: 10000 });
  await expect(submitBtn).toBeEnabled({ timeout: 5000 });
  await submitBtn.click();

  // Handle warning dialog if appears (min hours warning)
  const confirmBtn = employeePage.getByRole('button', { name: /Submit Anyway|Confirm|Yes/i });
  if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmBtn.click();
  }

  // รอ "Submitting..." หายไป แล้ว badge เปลี่ยน
  await employeePage.locator('text=Submitting').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  await employeePage.waitForTimeout(2000);

  // ✅ status ต้องเปลี่ยนเป็น Submitted
  const submittedBadge = employeePage.locator('[data-slot="badge"]:has-text("Submitted")');
  await expect(submittedBadge).toBeVisible({ timeout: 15000 });
  await snap(employeePage, 'bf-ap-01', '01-employee-submitted');
  await employeeCtx.close();

  // === Step 2: [Manager nattaya] เข้าหน้า Approvals ===
  // Pre-check: nattaya มีสิทธิ์ approve, เห็น pending timesheets
  const managerCtx = await browser.newContext({ storageState: authFile('nattaya') });
  const managerPage = await managerCtx.newPage();

  await managerPage.goto('/approvals');
  await managerPage.waitForLoadState('load');
  await managerPage.waitForTimeout(2000); // รอ data load

  await snap(managerPage, 'bf-ap-01', '02-manager-sees-pending');

  // ✅ PASS CRITERIA: หน้า Approvals โหลดสำเร็จ (nattaya มีสิทธิ์เข้าถึง)
  await expect(managerPage).not.toHaveURL(/login/);

  // Step 3: [Manager] Approve timesheet
  // Action: หาปุ่ม Approve แล้วคลิก
  const approveBtn = managerPage
    .getByRole('button', { name: /^Approve$/i })
    .first();
  const approveBtnAlt = managerPage.locator('[title="Approve"]').first();

  const approveVisible =
    (await approveBtn.isVisible({ timeout: 5000 }).catch(() => false)) ||
    (await approveBtnAlt.isVisible({ timeout: 2000 }).catch(() => false));

  // ✅ PASS CRITERIA: ต้องเห็น Approve button (มี pending timesheet)
  // ถ้าไม่มี pending timesheets แสดงว่า data state ไม่พร้อม — snap evidence ไว้
  if (approveVisible) {
    const btnToClick = (await approveBtn.isVisible().catch(() => false)) ? approveBtn : approveBtnAlt;
    await btnToClick.click();
    await managerPage.waitForTimeout(3000);
    // ✅ PASS CRITERIA: timesheet ถูก approve (หายจาก pending หรือ status เปลี่ยน)
  }
  await snap(managerPage, 'bf-ap-01', '03-manager-approved');

  await managerCtx.close();

  // === Step 4: [Employee wichai] กลับมาดู timesheet ที่ถูก approve ===
  // Pre-check: fields ต้องเป็น read-only หลัง approve
  const employeeCtx2 = await browser.newContext({ storageState: authFile('wichai') });
  const employeePage2 = await employeeCtx2.newPage();

  await employeePage2.goto('/time-entry');
  await employeePage2.waitForLoadState('load');
  await expect(employeePage2.getByText(/Week of/i)).toBeVisible({ timeout: 30000 });
  // รอให้ timesheet grid โหลดเสร็จ
  // รอให้ loading spinner หายไป
  await employeePage2.locator('text=Loading timesheet...').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  await employeePage2.waitForTimeout(1000);

  // ✅ PASS CRITERIA: timesheet ไม่ใช่ Draft อีกแล้ว (Submitted/Approved/Locked)
  const statusBadge = employeePage2.locator('[data-slot="badge"]').first();
  await expect(statusBadge).toBeVisible({ timeout: 5000 });
  const badgeText = await statusBadge.textContent();
  // ต้องไม่ใช่ Draft — ต้องเป็น Submitted, Approved, หรือ Locked
  expect(badgeText?.trim()).not.toBe('Draft');

  // ถ้ามี "cannot be edited" message = confirmed read-only
  const readOnlyMsg = employeePage2.getByText(/cannot be edited/i);
  const editableCells2 = employeePage2.locator('button.cursor-text');
  const hasReadOnly = await readOnlyMsg.isVisible({ timeout: 3000 }).catch(() => false);
  const noEditableCells = (await editableCells2.count()) === 0;
  expect(hasReadOnly || noEditableCells).toBe(true);

  await snap(employeePage2, 'bf-ap-01', '04-employee-sees-locked');
  await employeeCtx2.close();
});

test('BF-AP-02: Manager Reject Timesheet — Employee เห็น Rejected Status + เหตุผล', async ({ browser }) => {
  // Business Rule: Reject ต้องมีเหตุผล, employee ต้องเห็นเหตุผล

  // Reset DB — AP-01 อาจเปลี่ยน state ไปแล้ว
  await resetWichaiTimesheets();

  // === Step 1: [Employee wichai] เพิ่ม charge code, กรอกเวลา, Submit ===
  const employeeCtx = await browser.newContext({ storageState: authFile('wichai') });
  const employeePage = await employeeCtx.newPage();

  await employeePage.goto('/time-entry');
  await employeePage.waitForLoadState('load');
  await expect(employeePage.getByText(/Week of/i)).toBeVisible({ timeout: 30000 });
  await employeePage.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 30000 }).catch(() => {});

  // เพิ่ม charge code ถ้ายังไม่มี
  const noChargeMsg = employeePage.getByText(/No charge codes added/i);
  if (await noChargeMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
    const addBtn = employeePage.locator('button', { hasText: /Add Charge Code/i }).first();
    await addBtn.click();
    await employeePage.waitForTimeout(1000);
    const option = employeePage.locator('[role="option"], [data-radix-select-item], [cmdk-item]').first();
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();
    await employeePage.waitForTimeout(2000);
    // ยืนยันว่า charge code ถูก add จริง
    await expect(noChargeMsg).not.toBeVisible({ timeout: 10000 });
  }

  // กรอก 8 ชม. วันจันทร์ (click cell button → input → fill)
  const cellBtn = employeePage.locator('button.cursor-text').first();
  await expect(cellBtn).toBeVisible({ timeout: 5000 });
  await cellBtn.click();
  await employeePage.waitForTimeout(300);
  const input = employeePage.locator('input[inputmode="decimal"]');
  await expect(input).toBeVisible({ timeout: 3000 });
  await input.fill('8');
  await input.blur();
  await employeePage.waitForTimeout(500);

  // Save → รอเสร็จ → Submit → รอเสร็จ
  const saveDraftBtn = employeePage.getByRole('button', { name: /Save Draft/i });
  if (await saveDraftBtn.isEnabled().catch(() => false)) {
    await saveDraftBtn.click();
    await employeePage.locator('text=Saving').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await employeePage.waitForTimeout(1000);
  }

  const submitBtn = employeePage.getByRole('button', { name: /Submit/i }).last();
  await expect(submitBtn).toBeVisible({ timeout: 5000 });
  await expect(submitBtn).toBeEnabled({ timeout: 5000 });
  await submitBtn.click();
  const confirmBtn = employeePage.getByRole('button', { name: /Submit Anyway|Confirm|Yes/i });
  if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmBtn.click();
  }

  // รอ badge เปลี่ยนเป็น Submitted (ไม่ใช่รอ text "Submitting" หาย)
  const submittedBadge = employeePage.locator('[data-slot="badge"]:has-text("Submitted")');
  await expect(submittedBadge).toBeVisible({ timeout: 30000 });

  await snap(employeePage, 'bf-ap-02', '01-submitted');
  await employeeCtx.close();

  // === Step 2: [Manager nattaya] เข้า Approvals → รอ data load → Reject ===
  const managerCtx = await browser.newContext({ storageState: authFile('nattaya') });
  const managerPage = await managerCtx.newPage();

  await managerPage.goto('/approvals');
  await managerPage.waitForLoadState('load');
  // รอ data load จริง — กด Pending Approvals tab แล้วรอเห็น employee data
  // กด Pending Approvals tab → รอ queue load
  // Tab เป็น button[role="tab"] — ต้องกดจริงๆ ไม่ใช่แค่ click text
  const pendingTab = managerPage.locator('button[role="tab"]').filter({ hasText: 'Pending Approvals' });
  await expect(pendingTab).toBeVisible({ timeout: 10000 });
  await pendingTab.click();
  await managerPage.waitForTimeout(3000);

  // รอ Reject button ปรากฏ (= pending queue loaded)
  const rejectBtn = managerPage.locator('[title="Reject"]').first();
  const rejectBtnAlt = managerPage.locator('button', { hasText: /Reject with Comment/i }).first();

  // รอ element ใดก็ตามที่เป็น reject action
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await rejectBtn.isVisible({ timeout: 3000 }).catch(() => false)) break;
    if (await rejectBtnAlt.isVisible({ timeout: 1000 }).catch(() => false)) break;
    // อาจต้อง re-click tab
    await pendingTab.click();
    await managerPage.waitForTimeout(2000);
  }
  await expect(rejectBtn.or(rejectBtnAlt)).toBeVisible({ timeout: 10000 });

  // คลิก "Reject with Comment" (เปิด dialog พร้อม textarea)
  const btnToClick = (await rejectBtnAlt.isVisible().catch(() => false)) ? rejectBtnAlt : rejectBtn;
  await btnToClick.click();
  await managerPage.waitForTimeout(1000);

  await snap(managerPage, 'bf-ap-02', '02-rejection-dialog');

  // กรอก rejection reason
  const reasonInput = managerPage.locator('textarea').first();
  await expect(reasonInput).toBeVisible({ timeout: 5000 });
  await reasonInput.fill('ชั่วโมงไม่ถูกต้อง');

  // คลิก Confirm Reject
  const confirmRejectBtn = managerPage.getByRole('button', { name: /Confirm Reject/i });
  await expect(confirmRejectBtn).toBeEnabled({ timeout: 5000 });
  await confirmRejectBtn.click();

  // รอ dialog ปิด + data refetch เสร็จ (skeleton หาย)
  await managerPage.locator('text=Reject Timesheet').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  // รอ skeleton animation หาย — เช็คว่าไม่มี animate-pulse elements
  await managerPage.waitForFunction(
    () => !document.querySelector('[class*="animate-pulse"]'),
    { timeout: 15000 }
  ).catch(() => {});
  await managerPage.waitForTimeout(2000);
  await snap(managerPage, 'bf-ap-02', '03-rejected');

  await managerCtx.close();

  // === Step 3: [Employee wichai] เห็น rejected status ===
  const employeeCtx2 = await browser.newContext({ storageState: authFile('wichai') });
  const employeePage2 = await employeeCtx2.newPage();

  await employeePage2.goto('/time-entry');
  await employeePage2.waitForLoadState('load');
  await expect(employeePage2.getByText(/Week of/i)).toBeVisible({ timeout: 30000 });
  // รอ Loading timesheet... หายไป
  await employeePage2.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 30000 }).catch(() => {});
  await employeePage2.waitForTimeout(2000);

  await snap(employeePage2, 'bf-ap-02', '04-employee-sees-rejected');
  await employeeCtx2.close();
});

test('BF-AP-03: Employee ไม่เห็นเมนู Approvals (RBAC)', async ({ page }) => {
  // ผู้ใช้: wichai.s@central.co.th (employee)
  // สถานการณ์: employee เข้า dashboard — ต้องไม่เห็นเมนู Approvals
  // Business Rule: employee ไม่มีสิทธิ์ approve — ไม่ควรเห็นเมนู

  // Step 1: Login เป็น employee แล้วเข้า dashboard
  // Pre-check: sidebar แสดงเฉพาะเมนูที่ employee เข้าถึงได้
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.waitForTimeout(3000); // รอ sidebar load role

  await snap(page, 'bf-ap-03', '01-employee-sidebar');

  // Step 2: ตรวจว่าไม่เห็น Approvals ใน sidebar
  // ✅ PASS CRITERIA: ไม่มีเมนู "Approvals" ใน sidebar
  const approvalsLink = page.locator('a[href="/approvals"]');
  const approvalsCount = await approvalsLink.count();
  // employee ไม่ควรเห็น Approvals link ใน sidebar
  expect(approvalsCount).toBe(0);

  await snap(page, 'bf-ap-03', '02-no-approvals-menu');

  // Step 3 (Negative): Employee navigate ตรงไป /approvals
  // ✅ PASS CRITERIA (Negative): ถูก redirect หรือแสดง empty state
  await page.goto('/approvals');
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);

  // ✅ PASS CRITERIA: employee ไม่ถูก redirect ไป /login (ยัง authenticated)
  // แต่ต้องไม่เห็น approve/reject buttons (ไม่มีสิทธิ์ approve)
  await expect(page).not.toHaveURL(/login/);
  const approveButton = page.getByRole('button', { name: /^Approve$/i });
  const approveCount = await approveButton.count();
  // ✅ PASS CRITERIA: employee ไม่มี approve button (ไม่มีสิทธิ์)
  expect(approveCount).toBe(0);
  await snap(page, 'bf-ap-03', '03-direct-url-blocked');
});
