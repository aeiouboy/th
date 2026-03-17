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

## E2E Test Findings

### Bug: Sidebar Displays Admin Menu Items to All Roles (RBAC)

**Discovered by:** E2E-RBAC-01 (employee sidebar), E2E-RBAC-02 (admin sidebar), E2E-RBAC-05 (employee blocked from admin pages) — `frontend/e2e/rbac.spec.ts`

**Symptoms:**
- Employee users could see admin nav items (Users, Calendar, Rates) in the sidebar.
- Mobile nav showed the Approvals tab to all users regardless of role.
- Navigating directly to `/admin/users`, `/admin/calendar`, or `/admin/rates` as an employee did not redirect or show an access-denied page.

**Root Cause:**
`layout.tsx` hardcoded the full nav item list without checking the authenticated user's role. Both the desktop sidebar and the mobile bottom nav rendered every item unconditionally, so role-restricted links were always visible in the DOM.

**Fix:**
Added role-based conditional rendering in `frontend/src/app/(authenticated)/layout.tsx`:
- Admin-only nav items (Users, Calendar, Rates) only render when `role === 'admin'`.
- Approvals nav item only renders for `admin`, `charge_manager`, and `pmo` roles.
- Mobile nav uses the same role filter as the desktop sidebar.

**Verified By:** E2E-RBAC-01 asserts that admin links are absent for employee nattaya; E2E-RBAC-02 asserts all links are present for admin tachongrak; E2E-RBAC-05 asserts employee direct navigation to `/admin/users` is blocked.

**Files changed:** `frontend/src/app/(authenticated)/layout.tsx`

---

### Bug: Charge Code Form Missing Parent Selector for Project Level

**Discovered by:** E2E-CC-03 (negative test) — `frontend/e2e/charge-codes.spec.ts`

**Symptoms:**
- When creating a charge code with level set to "project", the form does not show a parent selector dropdown
- Submitting a project without a parent succeeds silently instead of showing a validation error
- The `must have a parent` error message is never displayed

**Root Cause:**
The `ChargeCodeForm` component only rendered the parent selector when the level was "task" or lower. The "project" level was incorrectly treated as a top-level entry, omitting the parent selector dropdown entirely. Since the selector was absent, the user had no way to assign a parent, and the form submitted without the required `parentId` field. The backend created an orphaned project node in the hierarchy.

**Fix:**
Update the form's conditional rendering logic to show the parent selector whenever the selected level is NOT "program" (i.e., for "project" and "task" levels):

```typescript
// ChargeCodeForm.tsx — show parent selector for non-top-level types
{level !== 'program' && (
  <ParentSelector ... />
)}
```

Also add frontend validation before submission:
```typescript
if (level !== 'program' && !parentId) {
  setError('parentId', { message: 'Project must have a parent' });
  return;
}
```

**Files changed:** `frontend/src/components/charge-codes/ChargeCodeForm.tsx`

**Caught by:** E2E-CC-03 negative test, which selects "project" level, skips parent selection, and asserts that the error message `/must have a parent/i` appears. This test fails when the parent selector is absent because the form submits instead of rejecting the input.

---

## Timesheet Submission Issues

### Problem: Submit returns 400 "Minimum 8 hours required on weekdays"

**Symptoms:**
- Clicking the Submit button shows an error toast listing specific dates
- The response body contains `message: "Minimum 8 hours required on weekdays"` with a `details` array

**Cause:**
Every weekday (Monday–Friday, excluding public holidays in the calendar) must have at least 8 hours logged in total across all charge codes for that day. The submit endpoint checks each day individually.

**Fix:**
1. Return to the Time Entry page for the timesheet period.
2. Review the dates listed in the error (e.g., `{ "date": "2026-03-10", "logged": 6, "required": 8 }`).
3. Add hours to those dates on any assigned charge code until each day reaches 8 hours.
4. Public holidays are automatically excluded — if a date is a declared holiday, it will not appear in the error list.

---

### Problem: Chargeability alerts not showing on Reports or Budget pages

**Symptoms:**
- The Alerts section on the Reports page shows budget alerts but not chargeability alerts
- `GET /budgets/chargeability-alerts` returns an empty array `[]`

**Cause:**
Chargeability alerts are computed from approved timesheet entries. If no timesheets have been approved (`cc_approved` or `locked` status), there is no data to calculate chargeability from.

**Fix:**
1. Ensure at least one timesheet has been submitted and gone through the full approval workflow (manager approved → CC owner approved).
2. Alternatively, trigger a budget recalculation via `POST /budgets/recalculate` (admin only) to force re-aggregation from existing approved entries.
3. If the `cost_rates` table has no entries for the relevant job grades, cost impact will be zero even if hours exist. Check the Admin → Rates page.

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

---

## Chore: Hardcoded Mock Data Removed from Frontend

**Date:** 2026-03-17

### What Was Removed

Several frontend components and pages contained hardcoded placeholder values that were never replaced with real API data. These showed fake information to users, making the application appear broken, inconsistent, or misleading in a production environment.

| Location | What was hardcoded | What replaced it |
|----------|--------------------|------------------|
| `frontend/src/app/(authenticated)/layout.tsx` | Notification bell badge showing `"3"` (fake unread count) | Badge removed; will be wired to a real notifications API when that feature ships |
| `frontend/src/app/(authenticated)/layout.tsx` | Avatar fallback `"U"` (literal letter U) | Real user initials derived from `profile.full_name` |
| `frontend/src/app/(authenticated)/layout.tsx` | Help link `href="#"` (dead link) | Link removed until a real help destination exists |
| `frontend/src/app/(authenticated)/page.tsx` | Dashboard stat deltas `"+4h"` and `"+2%"` | Computed deltas derived from current vs. previous period API data |
| `frontend/src/app/(authenticated)/page.tsx` | `"Period closes Mar 31"` hard-coded date string | Dynamic period close date sourced from the active period returned by the `/periods` endpoint |
| `frontend/src/app/(authenticated)/page.tsx` | `"Send Reminders"` button that performed no action | Button removed; will be reintroduced when the notifications/scheduler feature is complete |
| `frontend/src/components/timesheets/TimesheetReview.tsx` | `mockDetail` object containing `"John Doe"` and sample hours | Replaced with real timesheet data fetched from the API |
| `frontend/src/app/(authenticated)/admin/users/page.tsx` | `"Active"` badge hardcoded on every user row | Badge now reflects the real `is_active` field from the user profile API |
| `frontend/src/app/(authenticated)/approvals/page.tsx` | Hardcoded period dropdown options (e.g. `"Mar 2026"`) | Dropdown populated dynamically from the `/periods` API endpoint |

### Why This Matters

Hardcoded sample data causes several problems in production:

- **Misleading UI:** Users see counts, dates, and names that do not reflect reality, eroding trust in the application.
- **Silent API failures:** When a fallback constant is shown instead of an error state, real connectivity or auth problems go unnoticed.
- **Test blind spots:** E2E tests that assert on visible values may pass against mock data even when the API is broken.

### How to Avoid Reintroducing Mock Data

- **Never use hardcoded sample values as production fallbacks.** If the API is unreachable, show a loading skeleton or an error state — not a fake value.
- **Use loading and error states explicitly.** Components should handle `isLoading`, `isError`, and empty-data states as distinct conditions.
- **Do not leave `TODO: replace with API` comments in production code.** Either wire the data or remove the element entirely until the feature is ready.
- **Review PRs for `MOCK_`, `mock`, `"hardcoded"`, or constant arrays defined at the top of page files.** These are a strong signal that real API integration was skipped.

### Files Affected

- `frontend/src/app/(authenticated)/layout.tsx`
- `frontend/src/app/(authenticated)/page.tsx`
- `frontend/src/app/(authenticated)/approvals/page.tsx`
- `frontend/src/components/timesheets/TimesheetReview.tsx`
- `frontend/src/app/(authenticated)/admin/users/page.tsx`
