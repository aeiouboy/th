import { test as setup } from '@playwright/test';
import fs from 'fs';
import { AUTH_DIR, USERS, authFile, FRONTEND_URL } from './helpers';

setup('authenticate all users', async ({ page }) => {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  for (const user of USERS) {
    // Authenticate via UI so @supabase/ssr sets cookies in its own base64url format.
    // Manual cookie injection (previous approach) caused getSession() to return null
    // because @supabase/ssr 0.9.x encodes cookies as "base64-<base64url>" but we were
    // injecting plain JSON chunks — combineChunks worked but getSession still failed.
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForLoadState('load');

    await page.fill('#login-email', user.email);
    await page.fill('#login-password', user.password);
    await page.locator('button[type="submit"]').click();

    // Wait for redirect away from /login (indicates successful sign-in)
    try {
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
        timeout: 20000,
      });
    } catch {
      const errorText = await page
        .locator('.text-red-300')
        .first()
        .textContent()
        .catch(() => 'unknown error');
      throw new Error(`Auth setup failed for ${user.email}: ${errorText}`);
    }

    await page.waitForLoadState('networkidle');

    // Save per-user storage state (cookies now in correct base64url format)
    await page.context().storageState({ path: authFile(user.name) });

    if (user.name === 'tachongrak') {
      await page.context().storageState({ path: authFile('user') });
    }

    // Clear session before next user login
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  }
});
