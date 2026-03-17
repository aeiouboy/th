import { Page } from '@playwright/test';
import path from 'path';

export const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/test-results/screenshots');

export async function takeScreenshots(page: Page, pageName: string) {
  // Desktop screenshot (already at 1280x720 for desktop project)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, `${pageName}--desktop.png`),
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
 */
export async function apiRequest(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  apiPath: string,
  body?: unknown,
) {
  const baseUrl = 'http://localhost:3001/api/v1';
  const url = `${baseUrl}${apiPath}`;

  // Extract the access token from cookies
  const cookies = await page.context().cookies();
  const authCookies = cookies
    .filter((c) => c.name.startsWith('sb-lchxtkiceeyqjksganwr-auth-token.'))
    .sort((a, b) => a.name.localeCompare(b.name));

  let accessToken = '';
  if (authCookies.length > 0) {
    const sessionJson = authCookies.map((c) => c.value).join('');
    try {
      const session = JSON.parse(sessionJson);
      accessToken = session.access_token;
    } catch {
      // If cookies aren't valid JSON, try localStorage via page eval
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
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
