import { Page } from '@playwright/test';
import path from 'path';

export const FRONTEND_PORT = process.env.E2E_FRONTEND_PORT || '3002';
export const BACKEND_PORT = process.env.E2E_BACKEND_PORT || '3001';
export const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
export const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

export const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/test-results/screenshots');

export const AUTH_DIR = path.join(__dirname, '.auth');

export function authFile(name: string): string {
  return path.join(AUTH_DIR, `${name}.json`);
}

export const USERS = [
  { name: 'tachongrak', email: 'tachongrak@central.co.th', password: 'password1234', role: 'admin' },
  { name: 'wichai', email: 'wichai.s@central.co.th', password: 'password1234', role: 'charge_manager' },
  { name: 'ploy', email: 'ploy.r@central.co.th', password: 'password1234', role: 'pmo' },
  { name: 'nattaya', email: 'nattaya.k@central.co.th', password: 'password1234', role: 'employee' },
  { name: 'somchai', email: 'somchai.p@central.co.th', password: 'password1234', role: 'employee' },
  { name: 'kannika', email: 'kannika.t@central.co.th', password: 'password1234', role: 'finance' },
] as const;

export async function takeScreenshots(page: Page, pageName: string) {
  // Desktop screenshot (already at 1280x720 for desktop project)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, `${pageName}--desktop.png`),
    fullPage: false,
  });
}

/**
 * Capture evidence screenshot at a workflow step.
 * Naming: <testId>-<stepName>--desktop.png (all kebab-case, lowercase)
 */
export async function snap(page: Page, testId: string, stepName: string) {
  const fileName = `${testId}-${stepName}--desktop.png`.toLowerCase().replace(/\s+/g, '-');
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, fileName),
    fullPage: false,
  });
}

export async function takeScreenshotMobile(page: Page, pageName: string) {
  // Mobile screenshot (375x667 for mobile project)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, `${pageName}--mobile.png`),
    fullPage: false,
  });
}

/**
 * Make an authenticated API request to the backend.
 * Uses the page's request context which carries cookies/auth from storageState.
 *
 * Handles two cookie formats produced by @supabase/ssr:
 *   - New (0.9.x default): single cookie "sb-...-auth-token" = "base64-<base64url-json>"
 *   - Old (manual inject): chunked "sb-...-auth-token.0", ".1", ... = plain JSON parts
 */
export async function apiRequest(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  apiPath: string,
  body?: unknown,
) {
  const baseUrl = `${BACKEND_URL}/api/v1`;
  const url = `${baseUrl}${apiPath}`;

  const AUTH_BASE = 'sb-lchxtkiceeyqjksganwr-auth-token';
  const cookies = await page.context().cookies();

  let accessToken = '';

  // Try new format: single base key cookie with "base64-<base64url>" value
  const baseCookie = cookies.find((c) => c.name === AUTH_BASE);
  if (baseCookie?.value.startsWith('base64-')) {
    try {
      const b64 = baseCookie.value.slice('base64-'.length);
      // base64url → standard base64 → decode
      const jsonStr = Buffer.from(b64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
      const session = JSON.parse(jsonStr);
      accessToken = session.access_token ?? '';
    } catch { /* fall through to chunk format */ }
  }

  // Fallback: old chunked plain-JSON format (.0, .1, ...)
  if (!accessToken) {
    const authCookies = cookies
      .filter((c) => c.name.startsWith(AUTH_BASE + '.'))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (authCookies.length > 0) {
      try {
        const session = JSON.parse(authCookies.map((c) => c.value).join(''));
        accessToken = session.access_token ?? '';
      } catch { /* no token available */ }
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',  // bypass HTTP cache to ensure fresh response body
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const options: Parameters<typeof page.request.fetch>[1] = {
    method,
    headers,
  };
  if (body !== undefined) {
    options.data = body;
  }

  return page.request.fetch(url, options);
}

/**
 * Generate a unique name with timestamp suffix for test data.
 */
export function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

/**
 * Recursively find a node by name in a charge code tree.
 */
export function findInTree(nodes: any[], name: string): any {
  for (const node of nodes) {
    if (node.name === name) return node;
    if (node.children && node.children.length > 0) {
      const found = findInTree(node.children, name);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find a child node by name within a parent node's children.
 */
export function findInChildren(parentNode: any, childName: string): any {
  if (!parentNode || !parentNode.children) return null;
  return findInTree(parentNode.children, childName);
}

/**
 * Get the current Monday's date as YYYY-MM-DD string.
 */
export function getCurrentMondayStr(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

/**
 * Get the current period as YYYY-MM string.
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Reset wichai's timesheet state for test isolation.
 * - Mar 30 (current week): Draft + empty entries
 * - Mar 23-29: Submitted (for read-only tests)
 * - Mar 9-15: Draft + empty (for Copy test)
 */
export async function resetWichaiTimesheets(): Promise<void> {
  // Dynamic import to avoid bundling postgres in frontend
  const postgres = (await import('postgres')).default;
  const sql = postgres(process.env.SUPABASE_DB_URL || 'postgresql://postgres.lchxtkiceeyqjksganwr:ReNmU48rKkQCB9X7@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres');
  try {
    // Current week Mar 30: Draft + empty
    await sql`UPDATE timesheets SET status = 'draft', submitted_at = NULL, rejection_comment = NULL WHERE id = 'da63e7e1-a4a4-4081-9139-86cab1be78a4'`;
    await sql`DELETE FROM timesheet_entries WHERE timesheet_id = 'da63e7e1-a4a4-4081-9139-86cab1be78a4'`;
    // Mar 23-29: ensure Submitted
    await sql`UPDATE timesheets SET status = 'submitted' WHERE id = '867bd3e1-4b8b-4a4b-9dd8-c4c11eb34dac' AND status != 'submitted'`;
    // Mar 9-15: Draft + empty
    await sql`UPDATE timesheets SET status = 'draft', submitted_at = NULL WHERE id = '0fc79007-8d22-48da-8e88-140e485e2c45'`;
    await sql`DELETE FROM timesheet_entries WHERE timesheet_id = '0fc79007-8d22-48da-8e88-140e485e2c45'`;
  } finally {
    await sql.end();
  }
}
