# Troubleshooting

Documented issues encountered during development and deployment of the Timesheet & Cost Allocation System. Each entry includes symptoms, root cause, and the exact fix applied.

---

## Infrastructure & Configuration Issues

### Issue: JWKS Endpoint Path Wrong

**Symptoms:**
- Backend returns `500 Internal Server Error` or `401 Unauthorized` on all authenticated endpoints
- Backend logs show: `failed to fetch JWKS` or `unable to get local issuer certificate`
- `curl` to the endpoint returns 404

**Root Cause:**
The code used `/.well-known/jwks.json` (root path), but Supabase serves JWKS under the auth service path.

**Fix:**
The correct JWKS endpoint path is:
```
https://lchxtkiceeyqjksganwr.supabase.co/auth/v1/.well-known/jwks.json
```

Verify the endpoint is reachable:
```bash
curl https://lchxtkiceeyqjksganwr.supabase.co/auth/v1/.well-known/jwks.json
```

File changed: `backend/src/common/guards/supabase-auth.guard.ts`

---

### Issue: JWT Algorithm Mismatch (RS256 vs ES256)

**Symptoms:**
- Backend returns `401 Unauthorized` with message `invalid signature`
- Tokens obtained from Supabase are rejected even with the correct JWKS endpoint

**Root Cause:**
The guard was configured to accept only `RS256` (RSA). Supabase uses `ES256` (ECC P-256 / ECDSA) for newer projects. The algorithm in the JWT header (`alg: "ES256"`) did not match the allowed list.

**Fix:**
Update the guard to accept both algorithms:
```typescript
algorithms: ['ES256', 'RS256']
```

File changed: `backend/src/common/guards/supabase-auth.guard.ts`

---

### Issue: JWT_SECRET Fallback Blocked JWKS Verification

**Symptoms:**
- JWT verification fails with `invalid signature`
- Setting `SUPABASE_JWT_SECRET` to any value causes the guard to switch to HS256 and reject all ES256 tokens

**Root Cause:**
The guard had logic: if `SUPABASE_JWT_SECRET` is set → use HS256 symmetric verification. This meant any accidental or legacy value in the env var would silently bypass JWKS and cause signature failures.

**Fix:**
Remove the HS256 fallback entirely. Always use JWKS verification:
```typescript
// Always use JWKS — never fall back to HS256
const jwksUri = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
```

**Required action:** Set `SUPABASE_JWT_SECRET=` (empty) in `backend/.env`.

File changed: `backend/src/common/guards/supabase-auth.guard.ts`

---

### Issue: Pooler Region Wrong in .env.sample

**Symptoms:**
- Backend fails to connect to the database on startup
- Error: `ECONNREFUSED` or `ETIMEDOUT` connecting to `aws-0-ap-southeast-1.pooler.supabase.com`

**Root Cause:**
The `.env.sample` file had the wrong Supabase connection pooler region (`ap-southeast-1`). The actual project is in `ap-northeast-1` (Tokyo).

**Fix:**
Use the correct pooler host in `SUPABASE_DB_URL`:
```
aws-1-ap-northeast-1.pooler.supabase.com:6543
```

Full example:
```
SUPABASE_DB_URL=postgresql://postgres.lchxtkiceeyqjksganwr:PASSWORD@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

File changed: `backend/.env.sample`

---

### Issue: Direct Database Host Unresolvable

**Symptoms:**
- `SUPABASE_DIRECT_URL` connection fails with DNS resolution error
- `db.lchxtkiceeyqjksganwr.supabase.co` returns no IP address
- Drizzle Kit migrations fail

**Root Cause:**
Newer Supabase infrastructure uses IPv6-only direct connections. The direct hostname does not resolve in most environments. This affects `drizzle-kit push` and `drizzle-kit migrate` when `SUPABASE_DIRECT_URL` is set.

**Fix:**
Leave `SUPABASE_DIRECT_URL` empty in `.env`. The Drizzle config falls back to `SUPABASE_DB_URL` (pooler). The transaction pooler supports migrations.

```typescript
// drizzle.config.ts — fallback to pooler if DIRECT_URL not set
url: process.env.SUPABASE_DIRECT_URL || process.env.SUPABASE_DB_URL
```

File changed: `backend/drizzle.config.ts`

---

### Issue: Frontend .env Not Loaded by Next.js 16

**Symptoms:**
- `NEXT_PUBLIC_SUPABASE_URL` is `undefined` in the browser
- Supabase client fails to initialize
- All API calls fail because `NEXT_PUBLIC_API_URL` is undefined

**Root Cause:**
Next.js 16 infers the workspace root based on lockfile locations. When multiple `package-lock.json` files exist in parent directories (as in a monorepo), Next.js resolves `.env` from the wrong directory. The `frontend/.env` file is silently ignored.

**Fix:**
Rename the frontend env file from `.env` to `.env.local`:
```bash
mv frontend/.env frontend/.env.local
```

`.env.local` is always loaded from the same directory as the `next.config.js`, bypassing the workspace root inference.

Do not use `frontend/.env` on Next.js 16 in a monorepo structure.

---

### Issue: Double Route Prefix in Controllers

**Symptoms:**
- API endpoints return 404 for all requests
- The effective URL becomes `/api/v1/api/v1/timesheets` instead of `/api/v1/timesheets`

**Root Cause:**
A controller used `@Controller('api/v1/integrations')` but `main.ts` already registers a global prefix of `api/v1`. NestJS concatenates both, producing a doubled prefix.

**Fix:**
Controllers must only include the module-level path, not the global prefix:
```typescript
// Correct
@Controller('integrations')

// Wrong
@Controller('api/v1/integrations')
```

File changed: `backend/src/integrations/integrations.controller.ts`

---

## Runtime & Data Issues

### Problem: API Calls Return Mock Data Instead of Real Data

**Symptoms:**
- Pages appear to work but always show the same hardcoded data
- Changes made in the database are not reflected in the UI
- No error messages shown even when the backend is unreachable

**Root Cause:**
Every frontend page had `try/catch` blocks with silent fallbacks to `MOCK_*` constants:
```typescript
const data = rawData?.length > 0 ? rawData : MOCK_DATA;
```

**Fix:**
Remove mock fallback constants. Let API errors propagate and display an error state to the user. This was addressed during the API integration wiring task.

---

### Problem: Auth Token Not Attached to API Requests

**Symptoms:**
- Backend returns `401 Unauthorized` consistently
- Browser network tab shows requests with no `Authorization` header

**Root Cause:**
The `api.ts` utility did not retrieve the current Supabase session before making requests, or the session had expired without being refreshed.

**Fix:**
Ensure `api.ts` calls `supabase.auth.getSession()` before each request and includes the token:
```typescript
const { data: { session } } = await supabase.auth.getSession();
headers['Authorization'] = `Bearer ${session?.access_token}`;
```

---

### Problem: Mock-Gated Time Entry Logic Skips Save

**Symptoms:**
- Time entry page accepts input but hours are not persisted
- No API call is made when saving entries

**Root Cause:**
The time entry page had an explicit mock-detection guard:
```typescript
if (timesheet.id === 'mock-ts-1') return; // skip save for mock
```

**Fix:**
Remove the mock guard. All save operations should call the real API regardless of the timesheet ID.

---

## Testing & Validation

### Problem: Unit Tests Pass but Runtime Fails

**Context:**
159/159 unit tests pass but the application fails in production due to infrastructure misconfigurations.

**Root Cause:**
Unit tests use mocked dependencies (mocked database, mocked JWKS fetcher, mocked env vars). They validate business logic in isolation but cannot detect:
- Incorrect connection strings
- Wrong JWKS endpoint paths
- JWT algorithm mismatches
- Env var loading failures
- Pooler hostname errors

**Fix:**
Always run an end-to-end integration test against the real Supabase project before declaring a build complete:
```bash
# 1. Obtain a real JWT
TOKEN=$(curl -s -X POST \
  "https://lchxtkiceeyqjksganwr.supabase.co/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -d '{"email":"tachongrak@central.co.th","password":"password1234"}' \
  | jq -r '.access_token')

# 2. Call a protected endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/users/me
```

A valid JSON response (not 401/500) confirms auth is wired correctly end-to-end.
