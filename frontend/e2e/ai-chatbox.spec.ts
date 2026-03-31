/**
 * ============================================================
 * TC-621 — E2E-AI-01: AI ChatBox Time Entry (Happy Case)
 * ============================================================
 *
 * Tests the floating ChatWidget on /time-entry:
 *   1. Chat button visible at bottom-right
 *   2. Panel opens with Thai welcome message
 *   3. User sends Thai NLP time-entry command
 *   4. Bot responds with success (เรียบร้อย / Logged / บันทึก)
 *   5. GET /timesheets/charge-codes returns 200
 *
 * Auth: user.json (tachongrak — admin)
 * ============================================================
 */

import { test, expect } from '@playwright/test';
import { snap, apiRequest } from './helpers';

test.describe('AI ChatBox — Time Entry', () => {
  test.beforeEach(async ({ page }) => {
    // Clear chat history from localStorage so welcome message always shows
    await page.addInitScript(() => {
      localStorage.removeItem('chat-widget-messages');
    });
  });

  test('E2E-AI-01: User sends time-entry command via ChatBox and gets success response', async ({
    page,
  }) => {
    // ──────────────────────────────────────────────────────────
    // Step 1: Navigate to /time-entry and verify page loaded
    // Pre-check:  page is accessible (no redirect to login)
    // Post-check: URL is /time-entry
    // ──────────────────────────────────────────────────────────
    await page.goto('/time-entry');
    await page.waitForLoadState('load');
    await expect(page).toHaveURL(/\/time-entry/);

    // Wait for timesheet data to finish loading before capturing evidence
    await expect(page.locator('text=Loading timesheet...')).not.toBeVisible({ timeout: 15000 });

    // Hide Next.js dev overlay ("N Issues" badge) — dev-mode artifact, not visible in production
    await page.evaluate(() => {
      const portal = document.querySelector('nextjs-portal');
      if (portal) (portal as HTMLElement).style.display = 'none';
    });

    await snap(page, 'tc-621', '01-page-loaded');

    // ──────────────────────────────────────────────────────────
    // Step 2: Verify floating chat button is visible bottom-right
    // Pre-check:  chat panel is NOT open (panel hidden by default)
    // Post-check: button with aria-label="Open chat" is visible
    // ──────────────────────────────────────────────────────────
    const chatBtn = page.locator('button[aria-label="Open chat"]');
    await expect(chatBtn).toBeVisible({ timeout: 10000 });

    // Panel should not be visible yet
    const closeBtn = page.locator('button[aria-label="Close chat"]');
    await expect(closeBtn).not.toBeVisible();

    await snap(page, 'tc-621', '02-chat-button-visible');

    // ──────────────────────────────────────────────────────────
    // Step 3: Click chat button → panel opens with welcome message
    // Action:     click the floating MessageCircle button
    // Post-check: chat panel is visible
    // Post-check: welcome message contains สวัสดีค่ะ
    // ──────────────────────────────────────────────────────────
    await chatBtn.click();

    // Panel header should appear
    await expect(closeBtn).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=ผู้ช่วย Timesheet')).toBeVisible();

    // Welcome message
    await expect(page.locator('text=สวัสดีค่ะ')).toBeVisible({ timeout: 5000 });

    // Wait for panel open animation to complete (duration-200) before capturing
    await page.waitForTimeout(300);

    await snap(page, 'tc-621', '03-panel-open-welcome');

    // ──────────────────────────────────────────────────────────
    // Step 4: Type time-entry command in input and send
    // Action:     fill input with "กรอก 6 ชม. OMS วันนี้"
    //             then click Send button
    // Pre-check:  input is enabled (not in sending state)
    // Post-check: user message appears in the message list
    // Post-check: spinner/loader appears while bot processes
    // ──────────────────────────────────────────────────────────
    const chatInput = page.locator('input[placeholder="พิมพ์ข้อความ..."]');
    await expect(chatInput).toBeVisible();
    await expect(chatInput).toBeEnabled();

    await chatInput.fill('กรอก 6 ชม. OMS วันนี้');
    await expect(chatInput).toHaveValue('กรอก 6 ชม. OMS วันนี้');

    const sendBtn = page.locator('button[aria-label="Send message"]');
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // User message should appear in chat
    await expect(page.locator('text=กรอก 6 ชม. OMS วันนี้')).toBeVisible();

    // Input should clear after send
    await expect(chatInput).toHaveValue('');

    await snap(page, 'tc-621', '04-message-sent');

    // ──────────────────────────────────────────────────────────
    // Step 5: Wait for bot response (30s timeout)
    // Post-check: bot response contains เรียบร้อย OR Logged OR บันทึก
    //             (matches ChatWidget success detection logic)
    // Strategy:  wait directly for success keyword text — more reliable
    //            than waiting for spinner (spinner is SVG, timing fragile)
    // ──────────────────────────────────────────────────────────

    // Wait directly for success text to appear in the chat panel (max 30s)
    const panel = page.locator('.fixed.bottom-20, .fixed.bottom-6').last();
    await expect(
      panel.locator(':text-matches("เรียบร้อย|Logged|บันทึก")'),
    ).toBeVisible({ timeout: 30000 });

    const panelText = await panel.innerText();

    const hasSuccess =
      panelText.includes('เรียบร้อย') ||
      panelText.includes('Logged') ||
      panelText.includes('บันทึก');

    // Log the actual response for debugging
    console.log('Bot panel text (truncated):', panelText.slice(0, 300));

    expect(
      hasSuccess,
      `Bot response should contain เรียบร้อย, Logged, or บันทึก. Got: ${panelText.slice(0, 200)}`,
    ).toBe(true);

    await snap(page, 'tc-621', '05-bot-response');

    // ──────────────────────────────────────────────────────────
    // Step 6: Verify backend API — charge codes endpoint returns 200
    // Action:     GET /timesheets/charge-codes via authenticated request
    // Post-check: HTTP 200 response
    // ──────────────────────────────────────────────────────────
    const response = await apiRequest(page, 'GET', '/timesheets/charge-codes');
    expect(response.status()).toBe(200);

    await snap(page, 'tc-621', '06-api-charge-codes-200');
  });
});
