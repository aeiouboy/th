# Plan: Timesheet CR1 — Remaining Items: Validate, Fix, and Ship

## Task Description

Complete the final mile of CR1 implementation. Most CRs are already coded but uncommitted. This plan covers: (1) validating all implemented-but-uncommitted work against real servers, (2) fixing the 4 items that still need code work, (3) running E2E tests, and (4) committing everything in a clean state.

## Objective

When this plan is complete:
1. All 22 CRs and 5 BUGs from executive feedback are either verified working or explicitly deferred with justification
2. All uncommitted code has been validated against real Supabase backend (not just unit tests)
3. The 4 remaining code-work items (BUG-04, CR-10, CR-20, CR-22) are implemented
4. E2E tests pass against real backend+frontend
5. Everything is committed to `main` and auto-deploys to Railway + Vercel

## Problem Statement

### What is done (uncommitted, needs validation only)

| ID | Feature | Backend | Frontend | Status |
|----|---------|---------|----------|--------|
| CR-05 | Copy from Last Period | Done | Done | Needs E2E validation |
| CR-06 | Vacation auto-fill | Schema + backend done | Frontend done | Needs E2E validation |
| CR-07 | Request CC workflow | 4 endpoints done | Component done | Needs E2E validation |
| CR-08 | Budget Drill-Down | Component done | Tab done | Needs E2E validation |
| CR-09 | Team/Person Breakdown | Component done | — | Needs E2E validation |
| CR-11 | Cascade Access | Endpoint done | — | Needs E2E validation |
| CR-12 | Approvals Search | Filter logic done | — | Needs E2E validation |
| CR-16 | Multi-Select Filter | Component done | Integration done | Needs E2E validation |
| CR-17 | Team Breakdown Budget | Component done | Integration done | Needs E2E validation |
| CR-18 | Session Refresh | onAuthStateChange done | — | Needs E2E validation |
| CR-19 | RIS Logo | SVG + layout reference done | — | Needs visual validation |
| BUG-01 | Avatar "U" fallback | Fixed to "?" | — | Needs visual validation |
| BUG-02 | Active badge removed | Likely removed | — | Needs visual validation |
| BUG-03 | Status filter | Likely removed | — | Needs visual validation |
| BUG-05 | Vacation day blocking | Partially done | — | Needs code review + E2E validation |

### What needs code work

| ID | Feature | What is missing | Effort |
|----|---------|-----------------|--------|
| BUG-04 | E2E test cleanup | `afterAll` hooks missing in `charge-codes.spec.ts` and `admin-rates.spec.ts` | Small |
| CR-10 | Tree View UX | CSS alignment needs verification/fix for indentation at each hierarchy level | Small |
| CR-20 | Profile Photo | `avatar_url` from profiles table NOT wired to Avatar component in layout | Small |
| CR-22 | Pagination | Only charge-codes page has pagination; reports and budgets pages need it added | Medium |

### Critical path

All code is uncommitted on `main`. The sequence is:
1. Start real servers (backend + frontend)
2. Validate each implemented CR visually and via API
3. Fix the 4 remaining items
4. Run full E2E suite
5. Commit and push (auto-deploys)

## Tech Stack

- **Language**: TypeScript (frontend + backend)
- **Frontend**: Next.js 16 + React 19 + TanStack Query v5 + Tailwind CSS v4 + shadcn/ui + Recharts
- **Backend**: NestJS 11 + Drizzle ORM + postgres-js
- **Database**: Supabase (PostgreSQL) via pooler `aws-1-ap-northeast-1.pooler.supabase.com:6543`
- **Auth**: Supabase Auth (ES256 JWKS)
- **Testing**: Jest (backend), Vitest (frontend), Playwright (E2E)
- **Build Tools**: pnpm, Turbopack
- **Deploy**: Railway (backend), Vercel (frontend), auto-deploy on push to `main`

## Team Members

| Role | Agent | Model | Responsibility |
|------|-------|-------|----------------|
| builder | `.claude/agents/team/builder.md` | opus | Implements CR-10, CR-20, CR-22, BUG-04 code fixes |
| code-reviewer | `.claude/agents/team/code-reviewer.md` | opus | Reviews all uncommitted changes for quality, reuse, efficiency |
| test-writer | `.claude/agents/team/test-writer.md` | sonnet | Writes E2E tests for new CRs, adds cleanup hooks |
| validator | `.claude/agents/team/validator.md` | opus | Validates each CR against real servers, produces pass/fail report |
| docs-writer | `.claude/agents/team/docs-writer.md` | sonnet | Updates API reference, architecture docs, changelog |

## Step by Step Tasks

### Phase 1: Validate Implemented CRs (read-only, no code changes)

**Goal**: Confirm all "done" items actually work against real Supabase.

#### Task 1.1: Start servers and validate backend endpoints
- **Agent**: validator
- **Dependencies**: None
- **Actions**:
  1. Start backend: `cd backend && pnpm start:dev`
  2. Start frontend: `cd frontend && pnpm dev`
  3. Wait for both to be healthy
  4. For each implemented CR, hit the real API endpoint and verify response shape:
     - `GET /api/v1/timesheets/:id/copy-from-last` (CR-05)
     - `GET /api/v1/vacation-requests?userId=...&period=...` (CR-06)
     - `POST /api/v1/charge-code-requests` (CR-07)
     - `GET /api/v1/charge-code-requests` (CR-07)
     - `PATCH /api/v1/charge-code-requests/:id/approve` (CR-07)
     - `GET /api/v1/budgets/:id/drill-down` (CR-08)
     - `GET /api/v1/reports/team-breakdown` (CR-09)
     - `POST /api/v1/charge-codes/:id/cascade-access` (CR-11)
     - `GET /api/v1/timesheets/approvals?search=...` (CR-12)
     - `GET /api/v1/budgets?programs=...&programs=...` (CR-16)
     - `GET /api/v1/budgets/team-breakdown` (CR-17)
  5. Record pass/fail for each endpoint in validation report
- **Output**: `logs/cr1-remaining-endpoint-validation.md`

#### Task 1.2: Visual validation of frontend changes
- **Agent**: validator
- **Dependencies**: Task 1.1 (servers running)
- **Actions**:
  1. Navigate to each affected page and verify UI renders correctly
  2. Check: RIS logo visible in sidebar (CR-19)
  3. Check: Avatar shows "?" not "U" when no name (BUG-01)
  4. Check: No "Active" badge on user list (BUG-02)
  5. Check: No broken status filter on user list (BUG-03)
  6. Check: Copy from Last Period button exists on Time Entry (CR-05)
  7. Check: Vacation auto-fill row appears when user has approved vacation (CR-06)
  8. Check: Request Charge Code button/dialog exists (CR-07)
  9. Check: Budget page has drill-down tab (CR-08)
  10. Check: Multi-select filter works on Budget page (CR-16)
  11. Check: Session does not expire prematurely (CR-18) - login, wait, verify still authenticated
- **Output**: `logs/cr1-remaining-visual-validation.md` + screenshots

### Phase 2: Fix Remaining Code Items

**Goal**: Implement the 4 items that still need code work.

#### Task 2.1: BUG-04 — Add E2E test cleanup hooks
- **Agent**: builder
- **Dependencies**: None (can run in parallel with validation)
- **Actions**:
  1. Open `frontend/e2e/charge-codes.spec.ts`
  2. Add `afterAll` or `afterEach` hook that deletes any test data created during the run (charge codes with names matching `Test-*` or `E2E-*`)
  3. Open `frontend/e2e/admin-rates.spec.ts`
  4. Add `afterAll` or `afterEach` hook that deletes test cost rates matching `L-TEST-*`
  5. Use `page.request.delete()` to call real API endpoints for cleanup
  6. Verify cleanup runs even if tests fail (use `afterAll` not `afterEach` for reliability)
- **Files**:
  - `frontend/e2e/charge-codes.spec.ts`
  - `frontend/e2e/admin-rates.spec.ts`

#### Task 2.2: CR-10 — Tree View CSS alignment fix
- **Agent**: builder
- **Dependencies**: None
- **Actions**:
  1. Navigate to Charge Codes page and inspect tree view rendering
  2. Verify each hierarchy level (program > project > activity > task) has correct indentation
  3. Check for: consistent indent spacing (e.g., 24px per level), alignment of expand/collapse icons, proper connector lines if any
  4. Fix CSS if misaligned — likely in the charge code tree component or table component
  5. Test with at least 3 levels of nesting
- **Files**:
  - `frontend/src/app/(authenticated)/charge-codes/page.tsx` or tree component
  - Potentially a shared tree/table component in `frontend/src/components/`

#### Task 2.3: CR-20 — Wire avatar_url to Avatar component
- **Agent**: builder
- **Dependencies**: None
- **Actions**:
  1. Check `profiles` schema for `avatar_url` column (should exist from CR-20 schema work)
  2. Find the Avatar component used in the layout sidebar/header (likely in `frontend/src/app/(authenticated)/layout.tsx`)
  3. Wire `user.avatar_url` to the Avatar component's `src` prop
  4. Add fallback: if `avatar_url` is null, show initials derived from `full_name`; if `full_name` is empty, show "?"
  5. Verify the profile API endpoint returns `avatar_url` in its response
- **Files**:
  - `frontend/src/app/(authenticated)/layout.tsx`
  - `frontend/src/components/ui/avatar.tsx` (if custom)
  - `backend/src/profiles/profiles.service.ts` (if avatar_url not returned)

#### Task 2.4: CR-22 — Add pagination to reports and budgets pages
- **Agent**: builder
- **Dependencies**: None
- **Actions**:
  1. Study existing pagination implementation on charge-codes page to understand the pattern
  2. Backend: Add `page` and `limit` query params to reports and budgets endpoints (if not already present)
  3. Frontend: Add pagination controls to:
     - Reports page (`frontend/src/app/(authenticated)/reports/page.tsx`)
     - Budget page (`frontend/src/app/(authenticated)/budget/page.tsx`)
  4. Use the same pagination component pattern as charge-codes
  5. Default: 20 items per page, with page size selector (10, 20, 50)
  6. Ensure TanStack Query keys include page number so cache works correctly
  7. Build URL params inside `queryFn` (not outside — per CLAUDE.md rule on TanStack Query)
- **Files**:
  - `backend/src/reports/reports.controller.ts`
  - `backend/src/reports/reports.service.ts`
  - `backend/src/budgets/budgets.controller.ts`
  - `backend/src/budgets/budgets.service.ts`
  - `frontend/src/app/(authenticated)/reports/page.tsx`
  - `frontend/src/app/(authenticated)/budget/page.tsx`

### Phase 3: Code Review

**Goal**: Review all uncommitted changes for quality before committing.

#### Task 3.1: Code review of all uncommitted changes
- **Agent**: code-reviewer
- **Dependencies**: Phase 2 complete
- **Actions**:
  1. Run `git diff` to see all uncommitted changes
  2. Review for three categories:
     - **Reuse**: Search codebase for existing utilities that new code could use
     - **Quality**: No mock data, no hardcoded values, no TODO comments left in production code
     - **Efficiency**: No N+1 queries, proper TanStack Query key patterns, no stale closures
  3. Check CLAUDE.md anti-patterns:
     - No `MOCK_*` constants in page components
     - No duplicate `api/v1` prefix in controllers
     - No mock ID checks (`if (id === 'mock-...')`)
     - Reports group by charge code hierarchy, not `profiles.department`
     - Notification badge counts only dismissable items
     - TanStack Query params built inside `queryFn`
  4. Fix all issues found directly in the code
- **Output**: Code review report in task update

### Phase 4: E2E Testing

**Goal**: Run comprehensive E2E tests against real servers.

#### Task 4.1: Write E2E tests for new CRs
- **Agent**: test-writer
- **Dependencies**: Phase 2 + Phase 3 complete
- **Actions**:
  1. Write E2E tests covering the key new flows (see E2E Test Specifications below)
  2. Add cleanup hooks to all new test files
  3. Include `snap()` evidence screenshots
  4. Run tests against real backend + frontend
- **Files**:
  - `frontend/e2e/cr1-features.spec.ts` (or split per feature)
- **Output**: Test results in `docs/test-results/`

#### Task 4.2: Run full E2E suite
- **Agent**: validator
- **Dependencies**: Task 4.1 complete
- **Actions**:
  1. Run `cd frontend && npx playwright test` against real servers
  2. Collect results
  3. If failures: report which tests fail and why
  4. Produce validation report
- **Output**: `docs/test-results/e2e/e2e-results.json`, `docs/test-results/e2e/e2e-results.md`

### Phase 5: Backend + Frontend Unit Tests

#### Task 5.1: Run existing unit test suites
- **Agent**: validator
- **Dependencies**: Phase 3 complete
- **Actions**:
  1. `cd backend && pnpm test` — all backend unit tests must pass
  2. `cd frontend && pnpm test` — all frontend unit tests must pass
  3. If failures: determine if caused by new code or pre-existing
  4. Report results
- **Output**: `docs/test-results/backend/unit-results.json`, `docs/test-results/frontend/unit-results.json`

### Phase 6: Documentation Update

#### Task 6.1: Update project documentation
- **Agent**: docs-writer
- **Dependencies**: Phase 4 complete
- **Actions**:
  1. Update `docs/api-reference.md` with new endpoints (copy-period, vacation, charge-code-requests, cascade-access, drill-down, team-breakdown)
  2. Update `docs/architecture.md` if new modules were added
  3. Update `docs/changelog.md` with CR1 remaining items completion entry
  4. Update `docs/database-schema.md` if `charge_code_requests` table was added
- **Files**:
  - `docs/api-reference.md`
  - `docs/changelog.md`
  - `docs/database-schema.md`

### Phase 7: Commit and Deploy

#### Task 7.1: Final validation and commit
- **Agent**: builder
- **Dependencies**: All previous phases complete
- **Actions**:
  1. Run final check: `cd backend && pnpm lint && pnpm test`
  2. Run final check: `cd frontend && pnpm lint && pnpm test`
  3. Stage all changed files (excluding `.env`, `.env.local`, any secrets)
  4. Commit with descriptive message covering all CRs and BUGs addressed
  5. Push to `main` — triggers auto-deploy to Railway (backend) and Vercel (frontend)
  6. Verify deployment health after push

## E2E Test Specifications

### E2E-CR05-01: Copy from Last Period

**Given**: Employee `wichai.s@central.co.th` has a submitted timesheet for the previous period with entries on PRJ-001
**When**: User navigates to Time Entry for current period and clicks "Copy from Last Period"
**Then**:
- Previous period's charge code rows appear in current period grid
- Hours are NOT copied (only charge code assignments)
- User can edit the copied rows normally
**Snap**: `before-copy`, `after-copy`

### E2E-CR07-01: Request Charge Code Access

**Given**: Employee `wichai.s@central.co.th` is logged in, does not have access to a specific charge code
**When**: User clicks "Request Charge Code", fills in the form, and submits
**Then**:
- Request is created (toast confirmation)
- Request appears in pending state
- Admin can see the request in approvals
**Snap**: `request-form`, `request-submitted`

### E2E-CR07-02: Approve Charge Code Request (negative case)

**Given**: Employee `wichai.s@central.co.th` submits a charge code request
**When**: Same employee tries to approve their own request
**Then**:
- Approval is denied (403 or approval button not visible)
**Snap**: `self-approve-denied`

### E2E-CR08-01: Budget Drill-Down

**Given**: Admin user `tachongrak@central.co.th` is on Budget page
**When**: User clicks on a program row to drill down
**Then**:
- Drill-down view shows child charge codes with their budget vs actual
- Totals match the parent program row
**Snap**: `before-drill-down`, `drill-down-expanded`

### E2E-CR12-01: Approvals Search

**Given**: Manager `nattaya.k@central.co.th` has pending approvals
**When**: User types a search query in the approvals search box
**Then**:
- Results filter to match the search query (by employee name or charge code)
- Clearing search shows all approvals again
**Snap**: `search-results`, `search-cleared`

### E2E-CR16-01: Multi-Select Budget Filter

**Given**: Admin user on Budget page with multiple programs
**When**: User selects multiple programs in the filter dropdown
**Then**:
- Budget table shows only selected programs
- Deselecting all shows everything
**Snap**: `multi-select-active`, `multi-select-cleared`

### E2E-CR22-01: Pagination on Reports

**Given**: Admin user on Reports page with more than 20 data rows
**When**: User clicks "Next" page button
**Then**:
- Next page of results loads
- Page indicator updates
- Previous button becomes enabled
**Snap**: `page-1`, `page-2`

### E2E-BUG04-01: Test Data Cleanup

**Given**: E2E charge-codes test creates test data
**When**: Test suite completes (pass or fail)
**Then**:
- No "Test-*" or "E2E-*" charge codes remain in database
- No "L-TEST-*" cost rates remain in database
**Snap**: None (backend-only verification)

### E2E-BUG05-01: Vacation Day Blocking

**Given**: Employee has approved vacation for a specific day
**When**: Employee tries to enter hours on a non-vacation charge code for that vacation day
**Then**:
- Input is blocked or disabled for that day
- Vacation charge code row shows the approved hours
**Snap**: `vacation-day-blocked`

## Acceptance Criteria

### Feature Criteria

1. **CR-05 Copy from Last Period**: Button exists, copies charge code rows (not hours), works across period boundaries
   - Verified by: E2E-CR05-01

2. **CR-06 Vacation Auto-Fill**: Vacation days from approved requests auto-populate in timesheet grid
   - Verified by: E2E-BUG05-01 (vacation blocking implies auto-fill works)

3. **CR-07 Request CC Workflow**: Employee can request access, admin can approve/reject, requester gets notified
   - Verified by: E2E-CR07-01, E2E-CR07-02

4. **CR-08 Budget Drill-Down**: Clicking a program row expands to show child charge codes with budget detail
   - Verified by: E2E-CR08-01

5. **CR-09 Team/Person Breakdown**: Reports show breakdown by team member within a program
   - Verified by: Task 1.1 endpoint validation

6. **CR-10 Tree View UX**: Charge code tree has proper indentation at every level (program, project, activity, task)
   - Verified by: Task 1.2 visual validation

7. **CR-11 Cascade Access**: Granting access to a parent charge code cascades to all children
   - Verified by: Task 1.1 endpoint validation

8. **CR-12 Approvals Search**: Search box filters approvals by employee name or charge code
   - Verified by: E2E-CR12-01

9. **CR-16 Multi-Select Filter**: Budget page filter supports selecting multiple programs simultaneously
   - Verified by: E2E-CR16-01

10. **CR-17 Team Breakdown Budget**: Budget page shows per-person cost allocation within a program
    - Verified by: Task 1.1 endpoint validation

11. **CR-18 Session Refresh**: Login session persists correctly, no premature expiration
    - Verified by: Task 1.2 visual validation

12. **CR-19 RIS Logo**: Company logo visible in sidebar
    - Verified by: Task 1.2 visual validation

13. **CR-20 Profile Photo**: Avatar component shows user's profile photo when `avatar_url` is set
    - Verified by: Task 1.2 visual validation after Task 2.3 implementation

14. **CR-22 Pagination**: Reports and Budget pages have working pagination controls
    - Verified by: E2E-CR22-01

15. **BUG-01 Avatar Fallback**: Shows "?" instead of "U" when no name available
    - Verified by: Task 1.2 visual validation

16. **BUG-02 Active Badge**: Removed from user list (no `is_active` field in DB)
    - Verified by: Task 1.2 visual validation

17. **BUG-03 Status Filter**: Removed or fixed on user list page
    - Verified by: Task 1.2 visual validation

18. **BUG-04 E2E Cleanup**: All E2E test files have `afterAll` cleanup hooks
    - Verified by: E2E-BUG04-01

19. **BUG-05 Vacation Blocking**: Cannot enter hours on non-vacation charge codes for approved vacation days
    - Verified by: E2E-BUG05-01

### Quality Criteria

- No `MOCK_*` constants imported in any page component
- No hardcoded strings for dynamic values (dates, counts, badge numbers)
- No `api/v1` prefix in `@Controller()` decorators
- All TanStack Query URL params built inside `queryFn`
- All E2E test files have cleanup hooks in `afterAll`
- Backend unit tests pass: `cd backend && pnpm test`
- Frontend unit tests pass: `cd frontend && pnpm test`
- E2E tests pass: `cd frontend && npx playwright test`
- No TypeScript errors: `cd backend && pnpm lint` and `cd frontend && pnpm lint`

## Validation Commands

```bash
# Phase 1: Server startup
cd /Users/tachongrak/Projects/ts/backend && pnpm start:dev &
cd /Users/tachongrak/Projects/ts/frontend && pnpm dev &

# Phase 1: Endpoint validation (run after servers are up)
curl -sf http://localhost:3001/api/v1 && echo "Backend OK" || echo "Backend FAIL"
curl -sf http://localhost:3000 && echo "Frontend OK" || echo "Frontend FAIL"

# Phase 5: Unit tests
cd /Users/tachongrak/Projects/ts/backend && pnpm test
cd /Users/tachongrak/Projects/ts/frontend && pnpm test

# Phase 5: Type checking
cd /Users/tachongrak/Projects/ts/backend && pnpm lint
cd /Users/tachongrak/Projects/ts/frontend && pnpm lint

# Phase 4: E2E tests (requires both servers running)
cd /Users/tachongrak/Projects/ts/frontend && npx playwright test

# Phase 4: E2E with JSON output for reports
cd /Users/tachongrak/Projects/ts/frontend && npx playwright test --reporter=json > ../docs/test-results/e2e/e2e-results.json

# Validation script (if available)
cd /Users/tachongrak/Projects/ts && python3 .claude/skills/validate/validate.py --json timesheet-cr1-remaining

# Post-deploy health check
curl -sf https://precious-growth-production-d6b9.up.railway.app/api/v1 && echo "Production Backend OK"
curl -sf https://frontend-omega-mocha-yrgrud53s2.vercel.app && echo "Production Frontend OK"
```

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Uncommitted code has merge conflicts | High | Run `git stash` before any risky operations; review diff carefully |
| Real API endpoints return different shapes than frontend expects | High | Validate response shapes match TypeScript interfaces (CLAUDE.md lesson #17) |
| E2E tests create data pollution | Medium | Add cleanup hooks FIRST (Task 2.1) before running any E2E tests |
| Supabase pooler connection drops | Medium | Use SIGTERM not kill -9 for backend restarts (CLAUDE.md lesson #24) |
| Pagination breaks existing API consumers | Low | Use optional query params with sensible defaults (page=1, limit=20) |

## Task Dependency Graph

```
Phase 1 (Validate)          Phase 2 (Fix)
  Task 1.1 ──────┐           Task 2.1 (BUG-04) ─────┐
  Task 1.2 ──────┤           Task 2.2 (CR-10) ──────┤
                  │           Task 2.3 (CR-20) ──────┤
                  │           Task 2.4 (CR-22) ──────┤
                  │                                   │
                  └──────────────┐                    │
                                 ▼                    ▼
                           Phase 3 (Code Review)
                             Task 3.1 ────────────────┐
                                                      ▼
                                                Phase 4 (E2E)
                                                  Task 4.1 ──→ Task 4.2
                                                                  │
                                                Phase 5 (Unit)    │
                                                  Task 5.1 ───────┤
                                                                  ▼
                                                Phase 6 (Docs)
                                                  Task 6.1 ───────┐
                                                                  ▼
                                                Phase 7 (Ship)
                                                  Task 7.1
```

Note: Phase 1 and Phase 2 can run in parallel. Phase 3 requires both to complete. Phases 4 and 5 can run in parallel after Phase 3. Phase 6 runs after Phase 4. Phase 7 is the final gate.
