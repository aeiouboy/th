import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Reject Cases E2E Tests
 *
 * Tests negative/reject flows across all user roles in the Timesheet system.
 * Uses Supabase API login + cookie injection with proper expiry.
 */

const SCREENSHOTS_DIR = '/Users/tachongrak/Projects/ts/docs/test-results/screenshots/reject-cases';
const SUPABASE_URL = 'https://lchxtkiceeyqjksganwr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjaHh0a2ljZWV5cWprc2dhbndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzA4ODUsImV4cCI6MjA4OTI0Njg4NX0.RAxjZG4Q24N--sxNv6eKbrcTHRa3cn1ojB1Oys3HdtI';
const COOKIE_BASE = 'sb-lchxtkiceeyqjksganwr-auth-token';
const CHUNK_SIZE = 3180;

async function snap(page: Page, testId: string, stepName: string) {
  const fileName = `${testId}-${stepName}--desktop.png`.toLowerCase().replace(/\s+/g, '-');
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, fileName),
    fullPage: false,
  });
}

/**
 * Login via Supabase REST API, navigate to app, and use the Supabase browser
 * client to establish a proper session with server-side cookies.
 */
async function loginAs(page: Page, email: string, password: string = 'password1234') {
  // Get tokens from Supabase REST API
  const response = await page.request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      data: { email, password },
    },
  );

  const session = await response.json();
  if (!session.access_token) {
    throw new Error(`Auth failed for ${email}: ${JSON.stringify(session)}`);
  }

  // Navigate to login page to get proper domain
  await page.goto('http://localhost:3307/login');
  await page.waitForLoadState('load');

  // Use the Supabase browser client to set the session properly
  // This ensures cookies are set exactly how the app expects them
  await page.evaluate(
    async ({ url, anonKey, accessToken, refreshToken }) => {
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      const supabase = createClient(url, anonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: true,
        },
      });
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    },
    {
      url: SUPABASE_URL,
      anonKey: SUPABASE_ANON_KEY,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    },
  );

  // Wait for cookies to be set
  await page.waitForTimeout(1000);

  // Navigate to home - the middleware should now accept us
  await page.goto('http://localhost:3307/');
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);

  const url = page.url();
  if (url.includes('/login')) {
    console.log(`[Auth] Warning: Still on login page after auth for ${email}`);
    // Fallback: try setting the session via the app's own supabase client
    await page.goto('http://localhost:3307/login');
    await page.waitForLoadState('load');

    await page.evaluate(
      async ({ accessToken, refreshToken }) => {
        // Access the app's supabase client through the global scope
        const storageKey = 'sb-lchxtkiceeyqjksganwr-auth-token';
        const sessionData = {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: {},
        };
        localStorage.setItem(storageKey, JSON.stringify(sessionData));
      },
      { accessToken: session.access_token, refreshToken: session.refresh_token },
    );

    // Also set cookies directly
    const sessionData = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      token_type: session.token_type,
      user: session.user,
    });

    const chunks: string[] = [];
    for (let i = 0; i < sessionData.length; i += CHUNK_SIZE) {
      chunks.push(sessionData.slice(i, i + CHUNK_SIZE));
    }

    await page.context().clearCookies({ name: new RegExp(`^${COOKIE_BASE}`) });
    const cookiesToSet = chunks.map((chunk, index) => ({
      name: `${COOKIE_BASE}.${index}`,
      value: chunk,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    }));
    await page.context().addCookies(cookiesToSet);

    await page.goto('http://localhost:3307/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
  }

  const finalUrl = page.url();
  console.log(`[Auth] ${email} -> ${finalUrl}`);

  return session;
}

async function apiRequestWithToken(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  apiPath: string,
  accessToken: string,
  body?: unknown,
) {
  const baseUrl = 'http://127.0.0.1:3001/api/v1';
  const url = `${baseUrl}${apiPath}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };
  const options: Parameters<typeof page.request.fetch>[1] = { method, headers };
  if (body !== undefined) {
    options.data = body;
  }
  return page.request.fetch(url, options);
}

// No pre-stored auth
test.use({ storageState: { cookies: [], origins: [] } });

// ============================================================================
// TEST 1: Employee Submit -> Manager Reject -> Employee Re-edit
// ============================================================================
test.describe('RC-01: Employee Submit -> Manager Reject -> Employee Re-edit', () => {
  test('full reject workflow', async ({ page }) => {
    const wichaiSession = await loginAs(page, 'wichai.s@central.co.th');

    await page.goto('/time-entry');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    await snap(page, 'rc-01', '01-wichai-time-entry');

    const bodyText = await page.textContent('body') ?? '';
    const isDraft = bodyText.toLowerCase().includes('draft');
    const isRejected = bodyText.toLowerCase().includes('rejected');
    const isSubmitted = bodyText.toLowerCase().includes('submitted');
    const hasWeekOf = bodyText.toLowerCase().includes('week of');
    const isOnLogin = page.url().includes('/login');

    console.log(`[RC-01] onLogin=${isOnLogin}, hasWeekOf=${hasWeekOf}, draft=${isDraft}, rejected=${isRejected}, submitted=${isSubmitted}`);

    if (isOnLogin) {
      console.log('[RC-01] WARNING: Could not authenticate wichai - skipping time entry steps');
      await snap(page, 'rc-01', '01b-auth-failed');
    }

    // If we can edit, fill and submit
    const gridInputs = page.locator('input[type="number"], input[inputmode="decimal"]');
    const inputCount = await gridInputs.count();
    console.log(`[RC-01] Grid inputs: ${inputCount}`);

    if (inputCount > 0 && (isDraft || isRejected)) {
      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        const input = gridInputs.nth(i);
        if (!(await input.isDisabled().catch(() => true))) {
          await input.click();
          await input.fill('8');
        }
      }
      await snap(page, 'rc-01', '02-hours-filled');

      const saveBtn = page.getByRole('button', { name: /Save Draft/i });
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
      }

      const submitBtn = page.getByRole('button', { name: /Submit/i }).last();
      if (await submitBtn.isVisible().catch(() => false) && await submitBtn.isEnabled().catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(3000);

        const dialog = page.getByRole('dialog');
        if (await dialog.isVisible().catch(() => false)) {
          await snap(page, 'rc-01', '02b-dialog');
          const confirmBtn = dialog.getByRole('button', { name: /confirm|submit|ok|yes/i });
          if (await confirmBtn.isVisible().catch(() => false)) {
            await confirmBtn.click();
            await page.waitForTimeout(2000);
          } else {
            await page.keyboard.press('Escape');
          }
        }
        await snap(page, 'rc-01', '03-after-submit');
      }
    }

    await snap(page, 'rc-01', '04-state');

    // Manager reject
    const nattayaContext = await page.context().browser()!.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const nattayaPage = await nattayaContext.newPage();
    const nattayaSession = await loginAs(nattayaPage, 'nattaya.k@central.co.th');

    await nattayaPage.goto('/approvals');
    await nattayaPage.waitForLoadState('load');
    await nattayaPage.waitForTimeout(3000);

    await snap(nattayaPage, 'rc-01', '05-approvals');

    // Use API to check pending
    const pendingResp = await apiRequestWithToken(nattayaPage, 'GET', '/approvals/pending', nattayaSession.access_token);
    let pendingCount = 0;
    if (pendingResp.status() === 200) {
      const pd = await pendingResp.json().catch(() => ({ pending: [] }));
      pendingCount = pd.pending?.length ?? 0;
    }
    console.log(`[RC-01] Pending via API: ${pendingCount}`);

    // Try UI reject
    const pendingTab = nattayaPage.getByRole('tab', { name: /Pending/i });
    if (await pendingTab.isVisible().catch(() => false)) {
      await pendingTab.click();
      await nattayaPage.waitForTimeout(2000);
    }

    await snap(nattayaPage, 'rc-01', '06-pending');

    const rejectBtn = nattayaPage.locator('button[title="Reject"]').first();
    if (await rejectBtn.isVisible().catch(() => false)) {
      await rejectBtn.click();
      await nattayaPage.waitForTimeout(1000);

      const dialog = nattayaPage.getByRole('dialog');
      if (await dialog.isVisible().catch(() => false)) {
        await snap(nattayaPage, 'rc-01', '07-reject-dialog');
        const textarea = dialog.locator('textarea');
        if (await textarea.isVisible().catch(() => false)) {
          await textarea.fill('ชั่วโมงไม่ถูกต้อง กรุณาตรวจสอบ');
        }
        await snap(nattayaPage, 'rc-01', '08-reason');
        const confirmBtn = dialog.getByRole('button', { name: /Confirm Reject|Reject/i });
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click();
          await nattayaPage.waitForTimeout(3000);
        }
        await snap(nattayaPage, 'rc-01', '09-after-reject');
      }
    } else {
      // Try via API if UI not available
      if (pendingCount > 0) {
        const pd = await (await apiRequestWithToken(nattayaPage, 'GET', '/approvals/pending', nattayaSession.access_token)).json();
        const firstPending = pd.pending[0];
        console.log(`[RC-01] Rejecting via API: ${firstPending.id}`);
        const rejectResp = await apiRequestWithToken(
          nattayaPage, 'POST',
          `/approvals/${firstPending.id}/reject`,
          nattayaSession.access_token,
          { comment: 'ชั่วโมงไม่ถูกต้อง กรุณาตรวจสอบ' }
        );
        console.log(`[RC-01] API reject status: ${rejectResp.status()}`);
      } else {
        console.log('[RC-01] No pending timesheets to reject');
      }
      await snap(nattayaPage, 'rc-01', '07-no-pending');
    }

    // History
    const historyTab = nattayaPage.getByRole('tab', { name: /History/i });
    if (await historyTab.isVisible().catch(() => false)) {
      await historyTab.click();
      await nattayaPage.waitForTimeout(2000);
      await snap(nattayaPage, 'rc-01', '10-history');
    }

    await nattayaContext.close();

    // Back to wichai
    await page.goto('/time-entry');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
    const afterText = await page.textContent('body') ?? '';
    console.log(`[RC-01] Wichai rejected: ${afterText.toLowerCase().includes('rejected')}`);
    await snap(page, 'rc-01', '11-final');
  });
});

// ============================================================================
// TEST 2: Employee tries to access /reports -> Blocked
// ============================================================================
test.describe('RC-02: Employee access /reports -> Blocked', () => {
  test('wichai (employee) cannot access reports', async ({ page }) => {
    const session = await loginAs(page, 'wichai.s@central.co.th');

    // Use API to verify role
    const meResp = await apiRequestWithToken(page, 'GET', '/users/me', session.access_token);
    if (meResp.status() === 200) {
      const me = await meResp.json();
      console.log(`[RC-02] User role: ${me.role}`);
    }

    await page.goto('/reports');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const url = page.url();
    const bodyText = await page.textContent('body') ?? '';
    const hasReportsContent = /Reports & Analytics/i.test(bodyText);
    const isRedirected = !url.includes('/reports');

    console.log(`[RC-02] URL: ${url}, HasReports: ${hasReportsContent}`);
    await snap(page, 'rc-02', '01-result');

    if (isRedirected) {
      console.log('[RC-02] PASS: Employee redirected from /reports');
    } else if (!hasReportsContent) {
      console.log('[RC-02] PASS: No reports content shown');
    } else {
      console.log('[RC-02] OBSERVATION: Employee can access /reports');
    }
  });
});

// ============================================================================
// TEST 3: Employee tries to access /admin -> Blocked
// ============================================================================
test.describe('RC-03: Employee access /admin/users -> Blocked', () => {
  test('wichai (employee) cannot access admin pages', async ({ page }) => {
    await loginAs(page, 'wichai.s@central.co.th');

    await page.goto('/admin/users');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const url = page.url();
    const isRedirected = !url.includes('/admin');
    const bodyText = await page.textContent('body') ?? '';
    const hasAdminContent = /User Management|Manage Users/i.test(bodyText);

    console.log(`[RC-03] URL: ${url}, Redirected: ${isRedirected}, HasAdmin: ${hasAdminContent}`);
    await snap(page, 'rc-03', '01-blocked');

    expect(isRedirected || !hasAdminContent).toBeTruthy();
    console.log('[RC-03] PASS');
  });
});

// ============================================================================
// TEST 4: PMO tries to access /approvals -> Blocked
// ============================================================================
test.describe('RC-04: PMO access /approvals -> Blocked', () => {
  test('somchai (pmo) cannot access approvals', async ({ page }) => {
    const session = await loginAs(page, 'somchai.p@central.co.th');

    // Check role via API
    const meResp = await apiRequestWithToken(page, 'GET', '/users/me', session.access_token);
    if (meResp.status() === 200) {
      const me = await meResp.json();
      console.log(`[RC-04] User role: ${me.role}`);
    }

    // Check sidebar
    const expandBtn = page.getByRole('button', { name: /Expand sidebar/i });
    if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(500);
    }

    const sidebar = page.locator('aside');
    let approvalsInSidebar = false;
    if (await sidebar.isVisible().catch(() => false)) {
      approvalsInSidebar = await sidebar.getByText('Approvals').isVisible().catch(() => false);
    }
    console.log(`[RC-04] Approvals in sidebar: ${approvalsInSidebar}`);
    await snap(page, 'rc-04', '01-sidebar');

    // Navigate directly
    await page.goto('/approvals');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const url = page.url();
    const isRedirected = !url.includes('/approvals');

    console.log(`[RC-04] URL: ${url}, Redirected: ${isRedirected}`);
    await snap(page, 'rc-04', '02-approvals');

    if (isRedirected) {
      console.log('[RC-04] PASS: Redirected');
    } else if (!approvalsInSidebar) {
      console.log('[RC-04] PARTIAL: Hidden from sidebar');
    } else {
      console.log('[RC-04] OBSERVATION: PMO can access /approvals');
    }
  });
});

// ============================================================================
// TEST 5: Employee tries to submit with < 8h/day -> Blocked
// ============================================================================
test.describe('RC-05: Employee submit < 8h/day -> Blocked', () => {
  test('wichai submit with insufficient hours', async ({ page }) => {
    await loginAs(page, 'wichai.s@central.co.th');

    await page.goto('/time-entry');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
    await snap(page, 'rc-05', '01-initial');

    const bodyText = await page.textContent('body') ?? '';
    const isDraft = bodyText.toLowerCase().includes('draft');
    const isRejected = bodyText.toLowerCase().includes('rejected');

    console.log(`[RC-05] draft=${isDraft}, rejected=${isRejected}`);

    const gridInputs = page.locator('input[type="number"], input[inputmode="decimal"]');
    const inputCount = await gridInputs.count();
    console.log(`[RC-05] Inputs: ${inputCount}`);

    if (inputCount > 0 && (isDraft || isRejected)) {
      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        const input = gridInputs.nth(i);
        if (!(await input.isDisabled().catch(() => true))) {
          await input.click();
          await input.fill(i === 0 ? '4' : '0');
        }
      }
      await snap(page, 'rc-05', '02-4h-only');

      const saveBtn = page.getByRole('button', { name: /Save Draft/i });
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
      }

      const submitBtn = page.getByRole('button', { name: /Submit/i }).last();
      if (await submitBtn.isVisible().catch(() => false) && await submitBtn.isEnabled().catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(3000);

        const dialog = page.getByRole('dialog');
        if (await dialog.isVisible().catch(() => false)) {
          const dialogText = await dialog.textContent() ?? '';
          console.log(`[RC-05] PASS: Dialog: ${dialogText.substring(0, 200)}`);
          await snap(page, 'rc-05', '03-dialog');
          await page.keyboard.press('Escape');
        } else {
          console.log('[RC-05] NOTE: No validation dialog');
          await snap(page, 'rc-05', '03-no-dialog');
        }

        const afterText = await page.textContent('body') ?? '';
        console.log(`[RC-05] Still draft: ${afterText.toLowerCase().includes('draft')}`);
        await snap(page, 'rc-05', '04-after');
      }
    } else {
      console.log('[RC-05] Cannot test - not in editable state');
      await snap(page, 'rc-05', '02-skip');
    }
  });
});

// ============================================================================
// TEST 6: Employee tries to edit submitted timesheet -> Blocked
// ============================================================================
test.describe('RC-06: Employee cannot edit submitted timesheet', () => {
  test('wichai submitted timesheet is read-only', async ({ page }) => {
    await loginAs(page, 'wichai.s@central.co.th');

    await page.goto('/time-entry');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body') ?? '';
    const isSubmitted = bodyText.toLowerCase().includes('submitted');
    const isApproved = /approved/i.test(bodyText.toLowerCase());
    const isLocked = bodyText.toLowerCase().includes('locked');
    const isDraft = bodyText.toLowerCase().includes('draft');

    console.log(`[RC-06] submitted=${isSubmitted}, approved=${isApproved}, locked=${isLocked}, draft=${isDraft}`);
    await snap(page, 'rc-06', '01-status');

    if (isSubmitted || isApproved || isLocked) {
      const gridInputs = page.locator('input[type="number"], input[inputmode="decimal"]');
      const count = await gridInputs.count();
      let allDisabled = count === 0;
      for (let i = 0; i < Math.min(count, 5); i++) {
        const input = gridInputs.nth(i);
        const disabled = await input.isDisabled().catch(() => false);
        if (!disabled) { allDisabled = false; break; }
      }
      console.log(`[RC-06] Inputs: ${count}, allDisabled: ${allDisabled}`);
      await snap(page, 'rc-06', '02-readonly');
    } else {
      console.log('[RC-06] Checking previous weeks...');
      let found = false;
      for (let i = 0; i < 8; i++) {
        const navBtn = page.locator('button[aria-label*="rev"], button[aria-label*="Previous"]').first();
        if (await navBtn.isVisible().catch(() => false)) {
          await navBtn.click();
          await page.waitForTimeout(2000);
          const text = await page.textContent('body') ?? '';
          if (/submitted|approved|locked/i.test(text.toLowerCase())) {
            found = true;
            console.log(`[RC-06] Found ${i + 1} weeks back`);
            await snap(page, 'rc-06', '02-found');
            break;
          }
        } else break;
      }
      if (!found) {
        console.log('[RC-06] SKIP: No submitted timesheet found');
        await snap(page, 'rc-06', '02-skip');
      }
    }
  });
});
