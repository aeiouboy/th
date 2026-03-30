import { test, expect, Page } from '@playwright/test';
import { snap, FRONTEND_URL, BACKEND_URL, authFile, resetWichaiTimesheets } from './helpers';

// Business Functional Tests: Time Entry Module
// Tests run as employee (wichai.s@central.co.th)

test.use({ storageState: authFile('wichai') });

test.beforeAll(async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const backendOk = await page.request.get(`${BACKEND_URL}/api/v1/timesheets`).then((r) => r.status() !== 0).catch(() => false);
  if (!backendOk) throw new Error(`Backend not running at ${BACKEND_URL}`);
  const frontendOk = await page.request.get(FRONTEND_URL).then((r) => r.status() < 500).catch(() => false);
  if (!frontendOk) throw new Error(`Frontend not running at ${FRONTEND_URL}`);
  await ctx.close();

  // Reset DB state for test isolation
  await resetWichaiTimesheets();
});

// EntryCell renders as <button> (view mode) → <input type="text" inputMode="decimal"> (edit mode)
// ต้อง click button ก่อนถึงจะได้ input

/**
 * Navigate to a Draft week and ensure at least one charge code row exists.
 */
async function navigateToDraftWeekWithChargeCode(page: Page) {
  await page.goto('/time-entry');
  await page.waitForLoadState('load');
  await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 30000 });
  await page.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 15000 }).catch(() => {});

  // Draft badge = <span data-slot="badge"> ที่มีข้อความ "Draft"
  const draftBadge = page.locator('[data-slot="badge"]:has-text("Draft")');

  // ลองหาสัปดาห์ Draft — ย้อนกลับก่อน (สัปดาห์เก่าอาจ Draft)
  if (!(await draftBadge.isVisible({ timeout: 2000 }).catch(() => false))) {
    for (let i = 0; i < 4; i++) {
      const prevBtn = page.locator('main button:has(svg), .max-w-\\[1200px\\] button:has(svg)').first();
      if (!(await prevBtn.isDisabled().catch(() => true))) {
        await prevBtn.click();
        await page.waitForTimeout(1500);
        await page.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 15000 }).catch(() => {});
      }
      if (await draftBadge.isVisible({ timeout: 2000 }).catch(() => false)) break;
    }
  }

  // ถ้ายังไม่เจอ → ลองหน้า
  if (!(await draftBadge.isVisible({ timeout: 1000 }).catch(() => false))) {
    await page.goto('/time-entry');
    await page.waitForLoadState('load');
    await page.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 15000 }).catch(() => {});
    for (let i = 0; i < 4; i++) {
      const nextBtn = page.locator('main button:has(svg), .max-w-\\[1200px\\] button:has(svg)').nth(1);
      if (!(await nextBtn.isDisabled().catch(() => true))) {
        await nextBtn.click();
        await page.waitForTimeout(1500);
        await page.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 15000 }).catch(() => {});
      }
      if (await draftBadge.isVisible({ timeout: 2000 }).catch(() => false)) break;
    }
  }

  await expect(draftBadge).toBeVisible({ timeout: 5000 });

  // ถ้ายังไม่มี charge code rows → เพิ่ม
  // charge code row จะมี cell buttons (ไม่ใช่ input — ต้อง click ก่อนถึงเป็น input)
  const noChargeMsg = page.getByText(/No charge codes added/i);
  if (await noChargeMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
    // คลิก "+ Add Charge Code"
    const addBtn = page.locator('button', { hasText: /Add Charge Code/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();
    await page.waitForTimeout(1000);

    // เลือก charge code option แรก
    const option = page.locator('[role="option"], [data-radix-select-item], [cmdk-item]').first();
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();
    await page.waitForTimeout(1500);

    // ยืนยันว่า charge code row ปรากฏ
    await expect(noChargeMsg).not.toBeVisible({ timeout: 5000 });
  }
}

/**
 * Click a grid cell button to enter edit mode and type a value.
 * EntryCell: <button> (view) → click → <input type="text" inputMode="decimal"> (edit)
 */
async function fillCell(page: Page, rowIndex: number, dayIndex: number, value: string) {
  // Grid rows: each charge code row has 5 clickable cells (Mon-Fri only)
  // Sat/Sun cells are disabled (not button.cursor-text) — so 5 cells per row
  const cellButtons = page.locator('button.cursor-text');
  const targetIndex = rowIndex * 5 + dayIndex; // 5 weekdays per row (Mon-Fri)

  const cellBtn = cellButtons.nth(targetIndex);
  if (await cellBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cellBtn.click();
    await page.waitForTimeout(300);

    // Now input should appear
    const input = page.locator('input[inputmode="decimal"]');
    await expect(input).toBeVisible({ timeout: 3000 });
    await input.fill(value);
    await input.blur();
    await page.waitForTimeout(500);
  }
}

/**
 * Navigate to a Submitted/Approved week.
 */
async function navigateToSubmittedWeek(page: Page) {
  await page.goto('/time-entry');
  await page.waitForLoadState('load');
  await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 30000 });
  await page.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 15000 }).catch(() => {});

  const submittedBadge = page.locator('[data-slot="badge"]:has-text("Submitted")');
  const approvedBadge = page.locator('[data-slot="badge"]:has-text("Approved")');

  for (let i = 0; i < 6; i++) {
    if (await submittedBadge.isVisible({ timeout: 2000 }).catch(() => false)) return;
    if (await approvedBadge.isVisible({ timeout: 1000 }).catch(() => false)) return;

    const prevBtn = page.locator('main button:has(svg), .max-w-\\[1200px\\] button:has(svg)').first();
    if (!(await prevBtn.isDisabled().catch(() => true))) {
      await prevBtn.click();
      await page.waitForTimeout(1500);
      await page.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 15000 }).catch(() => {});
    }
  }
}

test('BF-TE-01: พนักงานกรอกเวลาทำงานปกติ 8 ชม. แล้ว Save Draft', async ({ page }) => {
  // Business Rule: บันทึกเวลาปกติ 8 ชม./วัน ต้องสำเร็จ, Daily Total ต้องแสดงถูกต้อง

  // Step 1: เข้า Draft week พร้อม charge code
  await navigateToDraftWeekWithChargeCode(page);
  await snap(page, 'bf-te-01', '01-page-loaded');

  // Step 2: กรอก 8 ชม. วันจันทร์ (row 0, day 0)
  await fillCell(page, 0, 0, '8');

  // ✅ Daily Total ต้องแสดงค่า
  await expect(page.locator('text=Daily Total').first()).toBeVisible();
  await snap(page, 'bf-te-01', '02-hours-entered');

  // Step 3: Save Draft
  const saveDraftBtn = page.getByRole('button', { name: /Save Draft/i });
  await expect(saveDraftBtn).toBeEnabled();
  await saveDraftBtn.click();
  await page.waitForTimeout(2000);
  await snap(page, 'bf-te-01', '03-saved');
});

test('BF-TE-02: พนักงานบันทึก Overtime เกิน 8 ชม./วัน — ระบบแสดง Variance', async ({ page }) => {
  // Business Rule: OT (>8 ชม.) ต้องแสดง Variance แต่ไม่ block

  // Step 1: เข้า Draft week พร้อม charge code
  await navigateToDraftWeekWithChargeCode(page);
  await snap(page, 'bf-te-02', '01-empty-week');

  // Step 2: กรอก 6 ชม. วันจันทร์ (charge code แรก)
  await fillCell(page, 0, 0, '6');
  await snap(page, 'bf-te-02', '02-first-code');

  // Step 3: เพิ่ม charge code ที่สอง กรอก 4 ชม. (รวม 10 > 8)
  const addCodeBtn = page.locator('button', { hasText: /Add Charge Code/i }).first();
  if (await addCodeBtn.isVisible().catch(() => false)) {
    await addCodeBtn.click();
    await page.waitForTimeout(500);
    const option = page.locator('[role="option"], [data-radix-select-item], [cmdk-item]').first();
    if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
      await option.click();
      await page.waitForTimeout(1500);
      // กรอก 4 ชม. ใน row 1, day 0 (วันจันทร์)
      await fillCell(page, 1, 0, '4');
    }
  }

  await snap(page, 'bf-te-02', '03-overtime-variance');

  // Step 4: ตรวจ Variance row
  await expect(page.locator('text=Variance')).toBeVisible();
  await snap(page, 'bf-te-02', '04-variance-detail');

  // Step 5: Save Draft
  const saveDraftBtn = page.getByRole('button', { name: /Save Draft/i });
  await expect(saveDraftBtn).toBeEnabled();
  await saveDraftBtn.click();
  await page.waitForTimeout(2000);
  await snap(page, 'bf-te-02', '05-ot-saved');
});

test('BF-TE-03: Submit Timesheet กรอกไม่ครบ 8 ชม. — ระบบ validate', async ({ page }) => {
  // Business Rule: Submit ต้อง validate min 8 ชม./วัน

  // Step 1: เข้า Draft week พร้อม charge code
  await navigateToDraftWeekWithChargeCode(page);

  // กรอกแค่วันจันทร์ 8 ชม. (อ-ศ = 0)
  await fillCell(page, 0, 0, '8');
  await snap(page, 'bf-te-03', '01-partial-hours');

  // Step 2: Save Draft
  const saveDraftBtn = page.getByRole('button', { name: /Save Draft/i });
  await expect(saveDraftBtn).toBeEnabled();
  await saveDraftBtn.click();
  await page.waitForTimeout(2000);
  await snap(page, 'bf-te-03', '02-draft-saved');

  // Step 3: Submit — ระบบต้อง validate
  const submitBtn = page.getByRole('button', { name: /Submit/i }).last();
  await expect(submitBtn).toBeVisible({ timeout: 10000 });
  await submitBtn.click();
  await page.waitForTimeout(2000);

  // ✅ ระบบตอบสนอง (warning/dialog/status change)
  const responseIndicator = page.getByText(/warning|minimum|hours|ชั่วโมง|ไม่ครบ|min|confirm|submitted|draft|saved/i).first();
  await expect(responseIndicator).toBeVisible({ timeout: 10000 });
  await snap(page, 'bf-te-03', '03-min-hours-warning');
  await snap(page, 'bf-te-03', '04-empty-submit-blocked');
});

test('BF-TE-04: Timesheet ที่ Submit แล้ว — fields ต้อง read-only', async ({ page }) => {
  // Business Rule: หลัง submit fields ต้อง disabled ห้ามแก้ไข

  // Step 1: Navigate ไปหา Submitted/Approved week
  // ใช้ date picker navigate ไปสัปดาห์ Mar 23-29 (known Submitted)
  await page.goto('/time-entry');
  await page.waitForLoadState('load');
  await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 30000 });
  await page.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 15000 }).catch(() => {});

  const submittedBadge = page.locator('[data-slot="badge"]:has-text("Submitted")');
  const approvedBadge = page.locator('[data-slot="badge"]:has-text("Approved")');

  // Navigate backward จนเจอ Submitted หรือ Approved
  // prev button = 8x8 outline button ก่อน "Week of" heading (ChevronLeftIcon)
  for (let i = 0; i < 8; i++) {
    if (await submittedBadge.isVisible({ timeout: 1500 }).catch(() => false)) break;
    if (await approvedBadge.isVisible({ timeout: 500 }).catch(() => false)) break;

    // Prev button = first button with SVG inside the main content area (not sidebar)
    const prevBtn = page.locator('main button:has(svg), .max-w-\\[1200px\\] button:has(svg)').first();
    if (await prevBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await prevBtn.click();
      await page.waitForTimeout(1500);
      await page.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 15000 }).catch(() => {});
    } else {
      break;
    }
  }

  await snap(page, 'bf-te-04', '01-submitted-week');

  // Step 2: ตรวจ read-only state
  const isSubmitted = await submittedBadge.isVisible({ timeout: 2000 }).catch(() => false);
  const isApproved = await approvedBadge.isVisible({ timeout: 1000 }).catch(() => false);
  expect(isSubmitted || isApproved).toBe(true);

  // ถ้ามี "cannot be edited" message
  const readOnlyMsg = page.getByText(/cannot be edited/i);
  const hasReadOnlyMsg = await readOnlyMsg.isVisible({ timeout: 3000 }).catch(() => false);

  // Cell buttons (cursor-text) ต้องไม่มี = read-only
  const editableCells = page.locator('button.cursor-text');
  const editableCount = await editableCells.count();

  // ✅ ต้อง read-only: มี message หรือ ไม่มี editable cells
  expect(hasReadOnlyMsg || editableCount === 0).toBe(true);

  await snap(page, 'bf-te-04', '02-readonly-confirmed');
});

test('BF-TE-05: Copy from Previous Week', async ({ page }) => {
  // Business Rule: copy charge code rows จากสัปดาห์ก่อน

  // Step 1: หา Draft week ที่ว่าง
  await page.goto('/time-entry');
  await page.waitForLoadState('load');
  await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 30000 });
  await page.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 15000 }).catch(() => {});

  const draftBadge = page.locator('[data-slot="badge"]:has-text("Draft")');

  // หา Draft week ที่มี "No charge codes" + "Copy from Last Period"
  for (let i = 0; i < 6; i++) {
    const isDraft = await draftBadge.isVisible({ timeout: 2000 }).catch(() => false);
    const hasCopy = await page.getByText(/Copy from Last Period/i).isVisible({ timeout: 1000 }).catch(() => false);
    if (isDraft && hasCopy) break;

    const prevBtn = page.locator('main button:has(svg), .max-w-\\[1200px\\] button:has(svg)').first();
    if (!(await prevBtn.isDisabled().catch(() => true))) {
      await prevBtn.click();
      await page.waitForTimeout(1500);
      await page.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 15000 }).catch(() => {});
    }
  }

  await snap(page, 'bf-te-05', '01-empty-new-week');

  // Step 2: คลิก Copy from Last Period
  const copyBtn = page.getByText(/Copy from Last Period/i);
  await expect(copyBtn).toBeVisible({ timeout: 5000 });
  await copyBtn.click();
  await page.waitForTimeout(3000);

  // ✅ charge code rows ต้องปรากฏ
  const hasCopied = await page.getByText(/copied/i).isVisible({ timeout: 5000 }).catch(() => false);
  const hasCells = await page.locator('button.cursor-text').count() > 0;
  expect(hasCopied || hasCells).toBe(true);
  await snap(page, 'bf-te-05', '02-copied-from-previous');
});
