import { test, expect } from '@playwright/test';
import { snap, authFile, apiRequest } from './helpers';

test.use({ storageState: authFile('wichai') });

test('BF-TE-01: พนักงานกรอกเวลาทำงานปกติ 8 ชม. แล้ว Save Draft', async ({ page }) => {
  // Capture browser console to debug API calls
  const consoleLogs: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[API]') || text.includes('charge') || text.includes('error') || msg.type() === 'error') {
      consoleLogs.push(`[browser:${msg.type()}] ${text}`);
      console.log(`[browser:${msg.type()}] ${text}`);
    }
  });

  // Step 1: เข้าหน้า Time Entry
  await page.goto('/time-entry');
  await page.waitForLoadState('load');
  await page.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 15000 })
    .catch(() => { /* may not appear */ });
  await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 10000 });

  // Step 1.5: ตรวจ API ว่า auth ถูกต้อง + มี charge codes
  const meResp = await apiRequest(page, 'GET', '/users/me');
  const meData = await meResp.json().catch(() => ({}));
  console.log(`[BF-TE-01] Auth check: status=${meResp.status()}, user=${meData.email}, role=${meData.role}`);

  const ccResp = await apiRequest(page, 'GET', '/timesheets/charge-codes');
  const ccData = await ccResp.json().catch(() => []);
  console.log(`[BF-TE-01] Charge codes: status=${ccResp.status()}, count=${Array.isArray(ccData) ? ccData.length : 'not-array'}`);

  if (ccResp.status() === 401) {
    await snap(page, 'bf-te-01', '01-FAIL-auth');
    throw new Error('❌ FAIL: API return 401 — wichai auth ไม่ถูกต้อง');
  }
  if (Array.isArray(ccData) && ccData.length === 0) {
    await snap(page, 'bf-te-01', '01-FAIL-zero-codes');
    throw new Error(`❌ FAIL: /timesheets/charge-codes returned 0 codes for ${meData.email} — user has no assigned charge codes`);
  }

  // Step 2: รอให้ charge codes โหลดเสร็จ
  // EntryCell render เป็น <button class="cursor-text"> ในสถานะปกติ, เป็น <input inputmode="decimal"> เมื่อ editing
  const addCodeTrigger = page.locator('button, [role="combobox"]').filter({ hasText: /Add Charge Code/i });
  const cellButtons = page.locator('table tbody td button.cursor-text');

  // รอให้ Add Charge Code หรือ cell buttons ปรากฏ (แสดงว่า timesheet โหลดเสร็จแล้ว)
  await Promise.race([
    addCodeTrigger.waitFor({ state: 'visible', timeout: 15000 }),
    cellButtons.first().waitFor({ state: 'visible', timeout: 15000 }),
  ]).catch(() => { /* neither appeared yet — might be charge codes error state */ });

  // หาก charge codes query fail (backend briefly unavailable during startup) → reload
  const hasAddBtn = await addCodeTrigger.isVisible().catch(() => false);
  const hasCellBtns = (await cellButtons.count()) > 0;
  if (!hasAddBtn && !hasCellBtns) {
    console.log('[BF-TE-01] Neither Add CC nor cell buttons found — reloading (charge codes may have failed to load)');
    await page.reload();
    await page.waitForLoadState('load');
    await page.waitForSelector('text=Loading timesheet', { state: 'hidden', timeout: 15000 }).catch(() => {});
    await expect(page.getByText(/Week of/i)).toBeVisible({ timeout: 10000 });
    // Wait again after reload
    await Promise.race([
      addCodeTrigger.waitFor({ state: 'visible', timeout: 15000 }),
      cellButtons.first().waitFor({ state: 'visible', timeout: 15000 }),
    ]).catch(() => {});
  }

  await snap(page, 'bf-te-01', '01-page-loaded');
  const hasAddBtnFinal = await addCodeTrigger.isVisible().catch(() => false);
  const hasCellBtnsFinal = (await cellButtons.count()) > 0;

  if (!hasAddBtnFinal && !hasCellBtnsFinal) {
    // Debug: inspect actual DOM content of the bottom action bar
    const bottomBarText = await page.locator('.sticky.bottom-0').textContent().catch(() => 'N/A');
    console.log(`[BF-TE-01] Bottom bar content: ${bottomBarText}`);
    const allButtons = await page.locator('button').allTextContents();
    console.log(`[BF-TE-01] All buttons: ${JSON.stringify(allButtons)}`);
    console.log(`[BF-TE-01] Console logs collected: ${consoleLogs.join(' | ')}`);
    await snap(page, 'bf-te-01', '02-FAIL-no-input');
    throw new Error('❌ FAIL: ไม่มี cell buttons และไม่มีปุ่ม Add Charge Code แม้หลัง reload — timesheet อาจ locked หรือ backend down');
  }

  // ถ้ามี Add button แต่ยังไม่มี rows → เพิ่ม charge code ก่อน
  if (!hasCellBtnsFinal && hasAddBtnFinal) {
    await addCodeTrigger.click();
    await page.waitForTimeout(500);
    const option = page.locator('[role="option"]').first();
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();
    await page.waitForTimeout(500);
  }

  // Step 2: กรอก 8 ชม. — click cell button เพื่อเข้าสู่ editing mode แล้ว fill
  const firstCellBtn = cellButtons.first();
  await firstCellBtn.click();
  await page.waitForTimeout(200);
  const activeInput = page.locator('input[inputmode="decimal"]').first();
  await activeInput.fill('8');
  await activeInput.blur();
  await page.waitForTimeout(500);

  // ✅ PASS CRITERIA: Daily Total แสดงค่า
  await expect(page.locator('text=Daily Total')).toBeVisible();
  await snap(page, 'bf-te-01', '02-hours-entered');

  // Step 3: Save Draft
  const saveBtn = page.getByRole('button', { name: /Save Draft/i });
  await expect(saveBtn).toBeEnabled({ timeout: 5000 });
  await saveBtn.click();
  await page.waitForTimeout(2000);

  // ✅ PASS CRITERIA: ไม่มี error toast
  const errToast = page.locator('[data-sonner-toast][data-type="error"]');
  if (await errToast.count() > 0) {
    await snap(page, 'bf-te-01', '03-FAIL-error-toast');
    throw new Error('❌ FAIL: Save Draft แสดง error toast');
  }
  await snap(page, 'bf-te-01', '03-saved');
});
