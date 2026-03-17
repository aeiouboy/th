import { test as setup } from '@playwright/test';
import fs from 'fs';
import { AUTH_DIR, USERS, authFile } from './helpers';

const SUPABASE_URL = 'https://lchxtkiceeyqjksganwr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjaHh0a2ljZWV5cWprc2dhbndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzA4ODUsImV4cCI6MjA4OTI0Njg4NX0.RAxjZG4Q24N--sxNv6eKbrcTHRa3cn1ojB1Oys3HdtI';

const COOKIE_BASE = 'sb-lchxtkiceeyqjksganwr-auth-token';
const CHUNK_SIZE = 3180;

setup('authenticate all users', async ({ page }) => {
  // Ensure .auth directory exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  for (const user of USERS) {
    // Login via Supabase REST API
    const response = await page.request.post(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        data: {
          email: user.email,
          password: user.password,
        },
      },
    );

    const session = await response.json();
    if (!session.access_token) {
      throw new Error(`Supabase auth failed for ${user.email}: ${JSON.stringify(session)}`);
    }

    // Navigate to the app so we can set cookies on the correct domain
    await page.goto('http://localhost:3000/login');

    const sessionData = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      token_type: session.token_type,
      user: session.user,
    };

    // Set chunked cookies (Supabase SSR pattern)
    const sessionPayload = JSON.stringify(sessionData);
    const chunks: string[] = [];
    for (let i = 0; i < sessionPayload.length; i += CHUNK_SIZE) {
      chunks.push(sessionPayload.slice(i, i + CHUNK_SIZE));
    }

    // Clear any previous auth cookies
    const existingCookies = await page.context().cookies();
    const authCookieNames = existingCookies
      .filter((c) => c.name.startsWith(COOKIE_BASE))
      .map((c) => ({ name: c.name, domain: c.domain, path: c.path }));
    if (authCookieNames.length > 0) {
      await page.context().clearCookies({ name: new RegExp(`^${COOKIE_BASE}`) });
    }

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

    // Set localStorage
    await page.evaluate(
      ({ url, sd }) => {
        const storageKey = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
        localStorage.setItem(storageKey, JSON.stringify(sd));
      },
      { url: SUPABASE_URL, sd: sessionData },
    );

    // Verify auth works
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(2000);

    // Save per-user storage state
    await page.context().storageState({ path: authFile(user.name) });

    // Also save backward-compatible user.json for tachongrak (admin)
    if (user.name === 'tachongrak') {
      await page.context().storageState({ path: authFile('user') });
    }
  }
});
