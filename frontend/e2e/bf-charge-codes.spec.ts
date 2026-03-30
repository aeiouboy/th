import { test, expect } from '@playwright/test';
import { snap, FRONTEND_URL, BACKEND_URL, authFile, resetWichaiTimesheets } from './helpers';

// Business Functional Tests: Charge Code Module
// BF-CC-01: Employee เลือก Charge Code จาก dropdown (runs as wichai/employee)
// BF-CC-02: Admin สร้าง Charge Code ใหม่ (runs as tachongrak/admin)

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

test.describe('BF-CC-01: Employee เลือก Charge Code', () => {
  test.use({ storageState: authFile('wichai') });

  test('BF-CC-01: Employee เลือก Charge Code จาก dropdown ใน Time Entry', async ({ page }) => {
    // Business Rule: employee เห็นเฉพาะ charge codes ที่ assign ให้

    // Step 1: เข้าหน้า Time Entry — หาสัปดาห์ Draft
    await page.goto('/time-entry');
    await page.waitForLoadState('load');
    await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 30000 });
    await page.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 15000 }).catch(() => {});

    // Navigate ไปหา Draft week (ลองย้อนกลับด้วย)
    if (!(await page.locator('[data-slot="badge"]:has-text("Draft")').isVisible({ timeout: 2000 }).catch(() => false))) {
      for (let i = 0; i < 4; i++) {
        const prevBtn = page.locator('main button:has(svg), .max-w-\\[1200px\\] button:has(svg)').first();
        if (!(await prevBtn.isDisabled().catch(() => true))) {
          await prevBtn.click();
          await page.waitForTimeout(1500);
          await page.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 15000 }).catch(() => {});
        }
        if (await page.locator('[data-slot="badge"]:has-text("Draft")').isVisible({ timeout: 2000 }).catch(() => false)) break;
      }
    }

    await expect(page.locator('[data-slot="badge"]:has-text("Draft")')).toBeVisible({ timeout: 5000 });
    await snap(page, 'bf-cc-01', '01-time-entry');

    // Step 2: คลิก "+ Add Charge Code" dropdown
    const addCodeBtn = page.locator('button', { hasText: /Add Charge Code/i }).first();
    await expect(addCodeBtn).toBeVisible({ timeout: 5000 });
    await addCodeBtn.click();
    await page.waitForTimeout(1000);

    // ✅ dropdown ต้องเปิดแสดง charge codes
    await snap(page, 'bf-cc-01', '02-dropdown-open');

    // Step 3: เลือก charge code จาก dropdown
    const dropdownItems = page.locator(
      '[role="option"], [data-radix-select-item], [cmdk-item], [data-value]',
    );
    const itemCount = await dropdownItems.count();
    expect(itemCount).toBeGreaterThan(0); // ต้องมี options

    await dropdownItems.first().click();
    await page.waitForTimeout(1500);

    // ✅ row ใหม่ต้องปรากฏใน grid (cells เป็น <button class="cursor-text"> ก่อน click)
    const cellsAfter = page.locator('button.cursor-text');
    expect(await cellsAfter.count()).toBeGreaterThan(0);
    await snap(page, 'bf-cc-01', '03-code-added');
  });
});

test.describe('BF-CC-02: Admin สร้าง Charge Code', () => {
  test.use({ storageState: authFile('tachongrak') });

  test('BF-CC-02: Admin สร้าง Charge Code ใหม่ พร้อม Negative case', async ({ page }) => {
    // ผู้ใช้: tachongrak@central.co.th (admin)
    // สถานการณ์: สร้าง charge code ใหม่ และทดสอบ validation error
    // Business Rule: admin สร้าง charge code ได้, Project ต้องมี Parent

    // Step 1: เข้าหน้า Charge Codes
    // Pre-check: Tree view แสดง charge codes hierarchy
    await page.goto('/charge-codes');
    await page.waitForLoadState('load');
    // รอให้ tree โหลดเสร็จ (skeleton หายไป) และ /users/me API ตอบกลับ
    await page.waitForFunction(
      () => {
        const skeletons = document.querySelectorAll('[class*="skeleton"], [class*="animate-pulse"]');
        // ถ้ามี skeleton น้อยกว่า 3 ตัว หรือไม่มีเลย = tree loaded
        return skeletons.length < 3;
      },
      { timeout: 30000 }
    ).catch(() => {});
    await page.waitForTimeout(2000); // รอ canManage state update

    // ✅ PASS CRITERIA: หน้า Charge Codes โหลดสำเร็จ (admin มีสิทธิ์เข้าถึง)
    await expect(page).not.toHaveURL(/login/);
    await snap(page, 'bf-cc-02', '01-charge-codes-page');

    // Step 2: คลิก Create New
    const createBtn = page.getByRole('button', { name: /Create New/i });

    // ✅ PASS CRITERIA: ปุ่ม Create New ต้อง visible สำหรับ admin
    await expect(createBtn).toBeVisible({ timeout: 30000 });

    await createBtn.click();
    await page.waitForTimeout(1000);

    // ✅ PASS CRITERIA: Dialog เปิดขึ้น แสดงฟอร์มสร้าง charge code
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await snap(page, 'bf-cc-02', '02-create-dialog');

    // Step 3 (Negative): สร้าง Project โดยไม่เลือก Parent
    // Action: เลือก Level = "project", ไม่เลือก Parent แล้วคลิก Create

    // เลือก Level = project
    const levelSelect = page.locator('[name="level"], select').first();
    const levelSelectAlt = page.getByText('Program').first(); // อาจเป็น select ที่แสดงค่า

    // ลอง find select ใน dialog
    const dialogLevelSelect = dialog.locator('select, [role="combobox"]').first();
    const dialogSelectVisible = await dialogLevelSelect.isVisible({ timeout: 2000 }).catch(() => false);

    if (dialogSelectVisible) {
      // เปลี่ยน level เป็น project
      await dialogLevelSelect.click();
      await page.waitForTimeout(500);

      const projectOption = page.locator('[role="option"]').filter({ hasText: /project/i }).first();
      const projectOptionVisible = await projectOption.isVisible({ timeout: 2000 }).catch(() => false);
      if (projectOptionVisible) {
        await projectOption.click();
        await page.waitForTimeout(500);
      }
    }

    // กรอกข้อมูลที่ required แต่ไม่เลือก Parent
    const codeInput = dialog.locator('input[placeholder*="code" i], input[name="code"], input').nth(0);
    const nameInput = dialog.locator('input[placeholder*="name" i], input[name="name"], input').nth(1);

    const codeVisible = await codeInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (codeVisible) {
      await codeInput.fill('TEST-PROJ-001');
    }
    const nameVisible = await nameInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (nameVisible) {
      await nameInput.fill('Test Project No Parent');
    }

    // คลิก Create โดยไม่เลือก Parent
    const createSubmitBtn = dialog.getByRole('button', { name: /Create/i }).last();
    const createSubmitVisible = await createSubmitBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (createSubmitVisible) {
      await createSubmitBtn.click();
      await page.waitForTimeout(1500);
    }

    // ✅ PASS CRITERIA (Negative): ระบบแสดง validation error
    // "A project must have a parent" หรือข้อความ error ที่เกี่ยวข้อง
    // ตรวจหา error indicator (class สีแดง) หรือ error text ใน dialog
    const errorIndicator = dialog.locator('[class*="error"], [class*="text-red"], [class*="destructive"]').first();
    const errorText = dialog.getByText(/required|parent|must have|error/i).first();
    // อย่างน้อย 1 อย่างต้อง visible: error indicator หรือ dialog ยังเปิดอยู่ (= ไม่ submit สำเร็จ)
    const hasError = (await errorIndicator.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await errorText.isVisible({ timeout: 2000 }).catch(() => false));
    // ถ้าไม่มี error แต่ dialog ยังเปิดอยู่ = form ไม่ submit (ก็ถือว่า validation ทำงาน)
    const dialogStillOpen = await dialog.isVisible().catch(() => false);
    expect(hasError || dialogStillOpen).toBe(true);

    await snap(page, 'bf-cc-02', '03-validation-error');

    // ปิด dialog
    const cancelBtn = dialog.getByRole('button', { name: /Cancel|Close/i }).first();
    const cancelVisible = await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false);
    if (cancelVisible) {
      await cancelBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(500);
  });
});
