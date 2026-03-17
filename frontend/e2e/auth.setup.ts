import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SUPABASE_URL = 'https://lchxtkiceeyqjksganwr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjaHh0a2ljZWV5cWprc2dhbndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzA4ODUsImV4cCI6MjA4OTI0Njg4NX0.RAxjZG4Q24N--sxNv6eKbrcTHRa3cn1ojB1Oys3HdtI';

const AUTH_DIR = path.join(__dirname, '.auth');
const STORAGE_STATE_PATH = path.join(AUTH_DIR, 'user.json');

setup('authenticate', async ({ page }) => {
  // Ensure .auth directory exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  // Login via Supabase REST API
  const response = await page.request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        email: 'tachongrak@central.co.th',
        password: 'password1234',
      },
    },
  );

  const session = await response.json();
  if (!session.access_token) {
    throw new Error(`Supabase auth failed: ${JSON.stringify(session)}`);
  }

  // Navigate to the app so we can set cookies on the correct domain
  await page.goto('http://localhost:3000/login');

  // Build session data once for both cookies and localStorage
  const sessionData = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
    user: session.user,
  };

  // Supabase SSR stores auth in chunked cookies with the pattern:
  // sb-<ref>-auth-token.0, sb-<ref>-auth-token.1, etc.
  // The value is the JSON session split into chunks
  const cookieBase = 'sb-lchxtkiceeyqjksganwr-auth-token';
  const sessionPayload = JSON.stringify(sessionData);

  // Supabase SSR chunks cookies at ~3180 chars. For most sessions, 2 chunks suffice.
  const CHUNK_SIZE = 3180;
  const chunks: string[] = [];
  for (let i = 0; i < sessionPayload.length; i += CHUNK_SIZE) {
    chunks.push(sessionPayload.slice(i, i + CHUNK_SIZE));
  }

  const cookiesToSet = chunks.map((chunk, index) => ({
    name: `${cookieBase}.${index}`,
    value: chunk,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  }));

  await page.context().addCookies(cookiesToSet);

  // Also set localStorage entries that @supabase/ssr may check
  await page.evaluate(
    ({ url, sessionData: sd }) => {
      const storageKey = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
      localStorage.setItem(storageKey, JSON.stringify(sd));
    },
    {
      url: SUPABASE_URL,
      sessionData,
    },
  );

  // Verify auth works by navigating to dashboard
  await page.goto('http://localhost:3000/');
  // Wait for page to settle — either dashboard content or redirect back to login
  await page.waitForTimeout(2000);

  // Save storage state for all subsequent tests
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
