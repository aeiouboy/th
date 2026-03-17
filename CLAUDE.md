# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (NestJS 11) — run from `backend/`
```bash
pnpm start:dev          # Start dev server with watch (port 3001)
pnpm build              # Production build (nest build)
pnpm test               # Run all unit tests (Jest)
pnpm test -- --testPathPattern=timesheets  # Run tests matching pattern
pnpm test -- timesheets.service.spec.ts    # Run single test file
pnpm lint               # Type-check only (tsc --noEmit)
pnpm db:generate        # Generate Drizzle migration from schema changes
pnpm db:migrate         # Apply pending migrations
pnpm db:push            # Push schema directly (skip migration files)
pnpm db:studio          # Open Drizzle Studio GUI
```

### Frontend (Next.js 16) — run from `frontend/`
```bash
pnpm dev                # Start dev server with Turbopack (port 3000)
pnpm build              # Production build
pnpm test               # Run all unit tests (Vitest)
pnpm lint               # ESLint
npx playwright test     # Run all E2E tests (requires backend running)
npx playwright test e2e/time-entry.spec.ts              # Single E2E file
npx playwright test --project=desktop                    # Desktop only
npx playwright test --project=desktop -g "submit"        # Filter by test name
```

### E2E Test Prerequisites
Both backend (`pnpm start:dev`) and frontend (`pnpm dev`) must be running. Playwright config auto-starts frontend but not backend. Auth setup runs first via `auth.setup.ts` project dependency.

## Architecture

### Monorepo Structure
Two independent packages (no workspace manager) — each has its own `pnpm-lock.yaml`. Install dependencies in each directory separately.

### Backend Architecture
- **Global prefix**: All API routes are prefixed with `api/v1` (set in `main.ts`). Controllers should NOT include this in their `@Controller()` path.
- **Global guards**: `SupabaseAuthGuard` → `RolesGuard` applied to all routes. Use `@Public()` to opt out, `@Roles('admin')` to restrict.
- **Database injection**: `@Inject(DRIZZLE) db: DrizzleDB` — the `DatabaseModule` is global.
- **Schema**: Drizzle ORM with `postgres-js` driver. All tables defined in `src/database/schema/*.ts`, re-exported from `schema/index.ts`. Uses `prepare: false` for Supabase connection pooler compatibility.
- **Auth flow**: JWT from Supabase Auth → verified via JWKS (ES256) → profile loaded from `profiles` table → attached to `request.user`.
- **User context**: Use `@CurrentUser()` parameter decorator to get the authenticated user profile in controllers.

### Frontend Architecture
- **App Router** with `(authenticated)` route group for all protected pages.
- **Auth middleware** (`src/middleware.ts`): Refreshes Supabase session cookies on every request. Redirects unauthenticated users to `/login`. Bypassed when `NEXT_PUBLIC_E2E_TEST=true`.
- **API client** (`src/lib/api.ts`): Typed fetch wrapper — `api.get<T>(path)`, `api.post<T>(path, body)`, etc. Auto-prepends `/api/v1`, attaches Bearer token from Supabase session. Handles 401 with redirect to `/login`.
- **State management**: TanStack Query v5 with 60s stale time, 1 retry.
- **Styling**: Tailwind CSS v4 + shadcn/ui components. Light/dark mode via next-themes.
- **Path alias**: `@/` maps to `./src/`.
- **React Compiler** enabled (automatic memoization).
- **Supabase clients**: Browser client in `lib/supabase/client.ts`, server client in `lib/supabase/server.ts` (both via `@supabase/ssr`).

### Database Schema (key relationships)
- **4-level charge code hierarchy**: program → project → activity → task (self-referencing `parentId`)
- **Timesheet workflow**: `draft → submitted → manager_approved → cc_approved → locked` (or `rejected`)
- **Two-stage approval**: Manager approves (via `profiles.managerId`), then Charge Code Owner approves (via `chargeCodes.ownerId/approverId`)
- **User roles**: employee, charge_manager, pmo, finance, admin

### Testing Strategy
- **Backend unit tests**: Jest with `*.spec.ts` pattern. Dependencies are mocked — these validate business logic only.
- **Frontend unit tests**: Vitest with jsdom + Testing Library. Setup in `src/test-setup.ts`.
- **E2E tests**: Playwright in `frontend/e2e/`. Runs against real backend+frontend. Serial execution (workers: 1). Desktop (1280x720) and mobile (375x667) projects.

## Environment Setup

### Critical: Frontend must use `.env.local` (not `.env`)
Next.js 16 infers the wrong workspace root from parent lockfiles. Only `.env.local` is loaded correctly.

### Supabase Connection
- Always use the **pooler** host (`aws-1-ap-northeast-1.pooler.supabase.com:6543`), not the direct host (unresolvable).
- JWT verification uses **JWKS** with ES256 — leave `SUPABASE_JWT_SECRET` empty.
- See `backend/.env.sample` for reference values.

### Swagger API Docs
Available at `http://localhost:3001/api/docs` when backend is running.

## Test Accounts (password: `password1234` for all)

| Email | Role | Notes |
|-------|------|-------|
| tachongrak@central.co.th | admin | CC Owner for PRG-001 |
| nattaya.k@central.co.th | charge_manager | Manager of Wichai & Ploy |
| wichai.s@central.co.th | employee | Backend team |
| ploy.r@central.co.th | employee | Frontend team |
| somchai.p@central.co.th | pmo | Infrastructure & QA |

## Reinforcement Learning — Past Mistakes (DO NOT REPEAT)

ข้อผิดพลาดทั้งหมดที่เคยเกิดขึ้นในโปรเจคนี้ จัดเป็นหมวดหมู่ตาม pattern เพื่อป้องกันไม่ให้เกิดซ้ำ

### Category 1: Supabase Infrastructure Assumptions

| # | Mistake | Root Cause | Correct Behavior |
|---|---------|-----------|-----------------|
| 1 | JWKS endpoint path wrong (`/.well-known/jwks.json`) | Assumed root-level JWKS path | Supabase path is `/auth/v1/.well-known/jwks.json` — always prefix with `/auth/v1/` |
| 2 | JWT algorithm hardcoded to RS256 only | Assumed all JWTs are RSA | Supabase uses **ES256** (ECC P-256). Accept `['ES256', 'RS256']` |
| 3 | HS256 fallback when `JWT_SECRET` is set | Branching logic: if secret exists → use HS256 | **Always use JWKS**. Leave `SUPABASE_JWT_SECRET` empty. Never add HS256 fallback logic |
| 4 | Pooler region wrong (`ap-southeast-1`) | Copy-pasted default from docs | This project is `ap-northeast-1` (Tokyo). Always verify region in Supabase dashboard |
| 5 | Direct DB host used (`db.xxx.supabase.co`) | Assumed direct host resolves | New Supabase infra is IPv6-only. **Always use pooler host** for everything |

**Rule: Never assume Supabase defaults. Always verify JWKS path, JWT algorithm, region, and host against the live project.**

### Category 2: NestJS Route & Guard Pitfalls

| # | Mistake | Root Cause | Correct Behavior |
|---|---------|-----------|-----------------|
| 6 | Double route prefix (`@Controller('api/v1/xxx')`) | Forgot `main.ts` sets global prefix `api/v1` | Controllers use module path only: `@Controller('timesheets')`, never `@Controller('api/v1/timesheets')` |
| 7 | Global guards missed for new modules | Didn't know guards are global | `SupabaseAuthGuard` + `RolesGuard` are APP_GUARD — applied to ALL routes. Use `@Public()` to opt out |

**Rule: New controllers = bare module path. New public endpoints = `@Public()` decorator. Never duplicate the global prefix.**

### Category 3: Frontend Mock Data Trap

| # | Mistake | Root Cause | Correct Behavior |
|---|---------|-----------|-----------------|
| 8 | Silent mock fallback: `rawData \|\| MOCK_DATA` | Prototype code left in production | **Never use hardcoded data as fallback.** Show loading skeleton or error state |
| 9 | Mock-gated logic: `if (id === 'mock-ts-1') return` | Save/submit skipped for mock IDs | Remove all mock ID checks. All operations should call real API |
| 10 | Hardcoded UI values ("3" badge, "+4h", "Period closes Mar 31") | Prototyped with static strings | All dynamic values must come from API. If no backend exists yet, **remove the element** |
| 11 | Notification bell badge "3" with no backend | Added UI before feature was built | Don't add UI for features that have no backend. Remove or hide until ready |
| 12 | Avatar fallback "U" instead of real initials | Didn't wire to user profile data | Derive from `profile.full_name` or use empty state |
| 13 | "Active" badge on all users | No `is_active` field in DB | Don't display status badges for fields that don't exist in the schema |

**Rule: NEVER use `MOCK_*` constants, placeholder strings, or `TODO: replace with API` in page components. If the API doesn't exist, remove the UI element entirely. Search for `MOCK_`, `mock`, `hardcoded`, `placeholder` before declaring done.**

### Category 4: Environment & Build Configuration

| # | Mistake | Root Cause | Correct Behavior |
|---|---------|-----------|-----------------|
| 14 | Frontend `.env` not loaded by Next.js 16 | Multiple lockfiles → wrong workspace root | **Always use `.env.local`** for frontend (not `.env`) |
| 15 | `prepare: false` missing in Drizzle provider | Supabase pooler rejects prepared statements | Always set `prepare: false` in postgres-js config when using pooler |

**Rule: Frontend env = `.env.local`. Database driver = `prepare: false` with pooler.**

### Category 5: Testing False Confidence

| # | Mistake | Root Cause | Correct Behavior |
|---|---------|-----------|-----------------|
| 16 | 159/159 unit tests pass but app fails at runtime | Mocked dependencies hide infra bugs | Unit tests validate logic only. **Always run E2E against real Supabase before declaring done** |
| 17 | Frontend contract mismatch (e.g. `chargeCodeId` vs `charge_code_id`) | Backend and frontend built independently | Verify API response shape matches frontend TypeScript interfaces. Drizzle returns camelCase — make sure frontend expects camelCase |
| 18 | E2E tests assert on mock data values | Tests pass because mock data matches assertions | E2E tests must run against real backend with real DB data, not mock constants |

**Rule: Unit tests = logic validation only. Before any release: run `npx playwright test` against real backend+DB. Check response shapes match TypeScript interfaces.**

### Category 6: RBAC & Authorization Gaps

| # | Mistake | Root Cause | Correct Behavior |
|---|---------|-----------|-----------------|
| 19 | Sidebar shows admin items to all roles | Hardcoded nav items without role check | Filter nav items by `user.role`. Admin items only for `role === 'admin'` |
| 20 | Mobile nav shows Approvals tab to everyone | Same issue in bottom nav | Apply same role filter to both desktop sidebar and mobile bottom nav |
| 21 | Direct URL to `/admin/*` not blocked for non-admins | No route-level protection | Add route guards or redirect non-admin users away from admin pages |

**Rule: Every nav item and route must be role-gated. Check BOTH sidebar and mobile nav. Test with non-admin accounts.**

### Category 7: Form Validation Gaps

| # | Mistake | Root Cause | Correct Behavior |
|---|---------|-----------|-----------------|
| 22 | Charge code form missing parent selector for "project" level | Conditional rendering only showed parent for "task" | Show parent selector for ALL levels except "program" |
| 23 | Form submits without required `parentId` | No frontend validation before API call | Validate required fields before submission. `parentId` required when `level !== 'program'` |

**Rule: For hierarchical data — non-root items MUST have a parent. Validate on frontend AND backend.**

### Quick Checklist Before Declaring Done

```
[ ] E2E tests pass against real Supabase (not mocks)
[ ] No `MOCK_*` constants imported in page components
[ ] No hardcoded strings for dynamic values (dates, counts, names)
[ ] Controllers use bare module path (no `api/v1` prefix)
[ ] `.env.local` used for frontend, `SUPABASE_JWT_SECRET` is empty
[ ] Nav items and routes are role-gated (test with employee account)
[ ] Form validations match DB constraints (required fields, hierarchy rules)
[ ] API response shapes match frontend TypeScript interfaces
```
