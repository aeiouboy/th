/**
 * Minimal mock Supabase auth server for E2E tests.
 * Responds to auth requests with a fake authenticated user so Next.js middleware
 * does not redirect to /login.
 *
 * Start with: node e2e/mock-supabase-server.js
 */
const http = require('http');

const MOCK_USER = {
  id: 'test-user-id',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
  email_confirmed_at: '2026-01-01T00:00:00Z',
  phone: '',
  confirmed_at: '2026-01-01T00:00:00Z',
  last_sign_in_at: '2026-03-17T00:00:00Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Test User' },
  identities: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-03-17T00:00:00Z',
};

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, apikey');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = req.url || '';

  // GET /auth/v1/user - return authenticated user
  if (req.method === 'GET' && url.includes('/auth/v1/user')) {
    res.writeHead(200);
    res.end(JSON.stringify(MOCK_USER));
    return;
  }

  // POST /auth/v1/token?grant_type=password - sign in
  if (req.method === 'POST' && url.includes('/auth/v1/token')) {
    const session = {
      access_token: 'fake-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'fake-refresh-token',
      user: MOCK_USER,
    };
    res.writeHead(200);
    res.end(JSON.stringify(session));
    return;
  }

  // POST /auth/v1/logout
  if (req.method === 'POST' && url.includes('/auth/v1/logout')) {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /auth/v1/settings
  if (url.includes('/auth/v1/settings')) {
    res.writeHead(200);
    res.end(JSON.stringify({ external: {}, disable_signup: false }));
    return;
  }

  // Default: 200 empty object
  res.writeHead(200);
  res.end(JSON.stringify({}));
});

const PORT = 54321;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock Supabase server running on http://127.0.0.1:${PORT}`);
});

// Handle SIGTERM for graceful shutdown
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
