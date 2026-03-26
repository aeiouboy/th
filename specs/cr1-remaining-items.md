# Plan: CR1 Remaining Items — Approvals Filter, Profile Photo, DB Performance

## Task Description
Implement the final 3 items from the CR1 executive feedback (`specs/timesheet_CR1.pptx`) that are not yet complete:
1. **Approvals Multi-Select Filter** — Add charge code/program filter to the Approvals page using existing `MultiSelectFilter` component
2. **Profile Photo Upload** — Add avatar upload UI + Supabase Storage backend
3. **Database Performance Optimization** — Add indexes, pagination, and query optimization to support 200 employees, 100 projects, 5 years of data

## Objective
Complete all 22/22 CR1 feedback items. After this plan, zero remaining gaps from the executive review.

## Problem Statement
Three items from the CR1 executive review remain incomplete:
- Approvals page lacks charge code/program filtering (component exists but not integrated)
- Users cannot upload profile photos (schema ready, no upload UI or storage endpoint)
- No explicit DB performance optimization for production scale (200 emp, 100 proj, 5yr)

## Solution Approach
1. Reuse `MultiSelectFilter` from budget page in approvals — fetch charge codes from pending timesheets, filter by selected programs
2. Create Supabase Storage bucket `avatars`, add upload endpoint to users controller, add avatar picker to profile page
3. Add composite indexes on high-query columns, add `userId+status` index on timesheets, add `date` index on entries, enforce pagination on all list endpoints, optimize report queries with date-range partitioning

## Tech Stack
- **Language**: TypeScript
- **Framework**: NestJS 11 (backend), Next.js 16 (frontend)
- **Runtime**: Node.js
- **Key APIs/Libraries**: Supabase Storage, Drizzle ORM, TanStack Query, Playwright
- **Build Tools**: pnpm, Turbopack
- **Testing**: Jest (backend), Vitest (frontend), Playwright (E2E)

## Technical Design

### Architecture
No new modules — changes are additions to existing modules:
- `UsersController` + `UsersService` — add `PUT /users/me/avatar` endpoint
- `ApprovalsPage` — add `MultiSelectFilter` to filter bar
- `ProfilePage` — add avatar upload UI
- Database schema files — add indexes via Drizzle migration

### Key Design Decisions
1. **Reuse MultiSelectFilter** — Don't build a new filter component. Import from `@/components/budget/MultiSelectFilter`
2. **Supabase Storage for avatars** — Use Supabase client-side upload (signed URL) to avoid backend file handling. Backend only validates and updates `avatarUrl` in DB
3. **Indexes via Drizzle migration** — Add indexes in schema files, generate migration with `pnpm db:generate`, apply with `pnpm db:push`
4. **No breaking changes** — All additions are backward-compatible

### Data Model

**New index additions** (no schema changes, only indexes):
```sql
-- timesheets: lookup by user + status (approval queries)
CREATE INDEX idx_timesheets_user_status ON timesheets(user_id, status);

-- timesheet_entries: date range queries for reports
CREATE INDEX idx_timesheet_entries_date ON timesheet_entries(date);

-- charge_codes: level + billable filtering
CREATE INDEX idx_charge_codes_level ON charge_codes(level);

-- charge_codes: owner/approver lookups
CREATE INDEX idx_charge_codes_owner ON charge_codes(owner_id);
```

**Supabase Storage bucket**: `avatars` (public, max 2MB, image/* only)

### API / Interface Contracts

**New endpoint:**
```
PUT /api/v1/users/me/avatar
  Body: { avatarUrl: string }  // URL from Supabase Storage after client-side upload
  Response: { avatarUrl: string }
```

**Modified endpoint (pagination enforcement):**
```
GET /api/v1/approvals/pending?programs=PRG-001,PRG-002
  Query: programs (comma-separated charge code IDs to filter by)
  Response: { pending: PendingTimesheet[] }  // filtered by programs
```

## UX/UI Design

### Figma / Design Reference
No external design provided — ASCII wireframes below serve as the design spec.

### Wireframes

**Approvals page filter bar (with multi-select added):**
```
┌────────────────────────────────────────────────────────────────┐
│ [Period ▾]  [Status ▾]  [Programs: 3 of 8 ▾]  [🔍 Search...] │
│                          ┌─ PRG-001 ─┐ ┌─ ACT-008 ─┐         │
│                          └────────────┘ └───────────┘          │
└────────────────────────────────────────────────────────────────┘
```

**Profile page avatar section:**
```
┌─────────────────────────────────────────┐
│  ┌─────────┐                            │
│  │  Avatar  │  Tachongrak               │
│  │  (96px)  │  tachongrak@central.co.th │
│  │  📷 btn  │  Admin                    │
│  └─────────┘  [Change Photo]            │
│                                         │
│  Full Name: [_______________] [Save]    │
│  Department: [_______________]          │
└─────────────────────────────────────────┘
```

### Visual Style
Follow existing design system — teal accent, CSS variables, rounded cards.

### User Flow
1. **Approvals filter**: User opens Approvals → clicks "Programs" dropdown → selects/deselects programs → table filters instantly
2. **Avatar upload**: User goes to Profile → clicks avatar or "Change Photo" → file picker opens → selects image → preview updates → auto-saves to Supabase Storage → avatarUrl saved to DB

## Relevant Files
Use these files to complete the task:

### Existing Files to Modify
- `frontend/src/app/(authenticated)/approvals/page.tsx` — Add MultiSelectFilter import and integration
- `frontend/src/app/(authenticated)/profile/page.tsx` — Add avatar upload UI
- `frontend/src/app/(authenticated)/layout.tsx` — Already shows avatar, may need AvatarImage import
- `backend/src/database/schema/timesheets.ts` — Add `userId+status` composite index
- `backend/src/database/schema/timesheet-entries.ts` — Add `date` index
- `backend/src/database/schema/charge-codes.ts` — Add `level` and `ownerId` indexes
- `backend/src/users/users.controller.ts` — Add `PUT /me/avatar` endpoint
- `backend/src/users/users.service.ts` — Add `updateAvatar()` method
- `backend/src/approvals/approvals.service.ts` — Add optional `programs` filter to pending query
- `backend/src/approvals/approvals.controller.ts` — Accept `programs` query param

### Existing Files to Reuse (DO NOT modify)
- `frontend/src/components/budget/MultiSelectFilter.tsx` — Reuse as-is in approvals

### New Files
- `backend/drizzle/0002_*.sql` — Generated migration for new indexes

## Implementation Phases

### Phase 1: Foundation (DB indexes + migration)
Add all missing indexes to Drizzle schema, generate and apply migration.

### Phase 2: Core Implementation (3 features in parallel)
- Feature A: Approvals multi-select filter (frontend + backend filter param)
- Feature B: Profile photo upload (frontend UI + backend endpoint)
- Feature C: Pagination enforcement audit on list endpoints

### Phase 3: Integration & Polish
Code review, tests, docs, validation.

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- You're responsible for deploying the right team members with the right context to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to the building, validating, testing, deploying, and other tasks.

### Team Members

- Builder
  - Name: builder-db
  - Role: Add database indexes and generate Drizzle migration
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-approvals
  - Role: Add MultiSelectFilter to Approvals page + backend filter param
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-avatar
  - Role: Add profile photo upload UI + backend avatar endpoint + Supabase Storage
  - Agent Type: builder
  - Resume: true

- Code Reviewer
  - Name: reviewer
  - Role: Review and fix code quality, efficiency, and reuse issues after builders complete their work
  - Agent Type: code-reviewer
  - Resume: false

- Test Writer
  - Name: tester
  - Role: Write comprehensive automated tests for the implemented code
  - Agent Type: test-writer
  - Resume: false

- Docs Writer
  - Name: docs
  - Role: Update documentation with new features and perf notes
  - Agent Type: docs-writer
  - Resume: false

- Validator
  - Name: validator
  - Role: Final read-only validation that all acceptance criteria are met and all tests pass
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Add Database Indexes
- **Task ID**: add-indexes
- **Depends On**: none
- **Assigned To**: builder-db
- **Agent Type**: builder
- **Parallel**: true
- Add composite index `idx_timesheets_user_status` on `timesheets(user_id, status)` in `backend/src/database/schema/timesheets.ts`
- Add index `idx_timesheet_entries_date` on `timesheet_entries(date)` in `backend/src/database/schema/timesheet-entries.ts`
- Add index `idx_charge_codes_level` on `charge_codes(level)` in `backend/src/database/schema/charge-codes.ts`
- Add index `idx_charge_codes_owner` on `charge_codes(owner_id)` in `backend/src/database/schema/charge-codes.ts`
- Run `cd backend && pnpm db:generate` to create migration file
- Run `cd backend && pnpm db:push` to apply indexes to Supabase
- Verify indexes exist: `SELECT indexname FROM pg_indexes WHERE tablename IN ('timesheets','timesheet_entries','charge_codes');`

### 2. Add Approvals Multi-Select Filter
- **Task ID**: approvals-filter
- **Depends On**: none
- **Assigned To**: builder-approvals
- **Agent Type**: builder
- **Parallel**: true
- In `backend/src/approvals/approvals.controller.ts`: add optional `@Query('programs') programs?: string` to `getPending()` endpoint
- In `backend/src/approvals/approvals.service.ts`: filter pending timesheets by charge code programs when `programs` param provided — join `timesheet_entries` → `charge_codes` and filter where charge code root program ID is in the provided list
- In `frontend/src/app/(authenticated)/approvals/page.tsx`:
  - Import `MultiSelectFilter` from `@/components/budget/MultiSelectFilter`
  - Add state: `const [selectedPrograms, setSelectedPrograms] = useState<string[]>([])`
  - Extract unique programs from pending timesheets (from timesheet entries' charge codes)
  - Add `MultiSelectFilter` to the filter bar between Status and Search
  - Pass `programs` query param to `/approvals/pending` API call when filter is active
  - Filter items client-side as fallback if backend doesn't support it yet

### 3. Add Profile Photo Upload
- **Task ID**: avatar-upload
- **Depends On**: none
- **Assigned To**: builder-avatar
- **Agent Type**: builder
- **Parallel**: true
- Create Supabase Storage bucket `avatars` via MCP or dashboard (public, 2MB limit, image/* only)
- In `backend/src/users/users.controller.ts`: add `@Put('me/avatar')` endpoint that accepts `{ avatarUrl: string }` and updates `profiles.avatarUrl`
- In `backend/src/users/users.service.ts`: add `updateAvatar(userId: string, avatarUrl: string)` method
- In `frontend/src/app/(authenticated)/profile/page.tsx`:
  - Add `AvatarImage` import from `@/components/ui/avatar`
  - Add hidden `<input type="file" accept="image/*">` triggered by click on avatar
  - On file select: upload to Supabase Storage `avatars/{userId}/{filename}`, get public URL, call `PUT /users/me/avatar`
  - Show upload progress/spinner on avatar during upload
  - After success: invalidate TanStack Query cache for `/users/me` so layout avatar updates
- In `frontend/src/app/(authenticated)/layout.tsx`: ensure `AvatarImage` is used with `src={user.avatarUrl}` (may already be there — verify)

### 4. Pagination Enforcement Audit
- **Task ID**: pagination-audit
- **Depends On**: add-indexes
- **Assigned To**: builder-db
- **Agent Type**: builder
- **Parallel**: false
- Audit all list endpoints in backend controllers: `/charge-codes`, `/approvals/history`, `/reports/*`, `/users`
- For any endpoint returning unbounded results, add `limit` (default 100, max 500) and `offset` query params
- Ensure reports endpoints that aggregate across date ranges use indexed columns in WHERE clauses
- Add `LIMIT` to any raw SQL or Drizzle queries that could return >500 rows
- Test with `curl` to confirm pagination params work

### 5. Code Review
- **Task ID**: code-review
- **Depends On**: approvals-filter, avatar-upload, pagination-audit
- **Assigned To**: reviewer
- **Agent Type**: code-reviewer
- **Parallel**: false
- Review all files created/modified by builders for quality, efficiency, reuse, and accessibility issues
- Verify `MultiSelectFilter` is reused (not duplicated)
- Verify avatar upload has proper file type/size validation
- Verify indexes are on correct columns for actual query patterns
- Fix all issues found directly
- Report what was fixed and what was skipped

### 6. Write Tests
- **Task ID**: write-tests
- **Depends On**: code-review
- **Assigned To**: tester
- **Agent Type**: test-writer
- **Parallel**: false
- Write unit tests for:
  - `approvals.service.ts` — test `programs` filter param
  - `users.service.ts` — test `updateAvatar()` method
- Write E2E tests for:
  - Approvals page with multi-select filter
  - Profile photo upload flow
- Run all tests and ensure they pass
- **MANDATORY: Save test results to `docs/test-results/`**
- Capture screenshots for E2E tests to `docs/test-results/screenshots/`

### 7. Update Docs
- **Task ID**: update-docs
- **Depends On**: write-tests
- **Assigned To**: docs
- **Agent Type**: docs-writer
- **Parallel**: false
- Update `docs/api-reference.md` with new `PUT /users/me/avatar` endpoint and `programs` query param on approvals
- Update `docs/architecture.md` with Supabase Storage integration note
- Update `docs/env-setup.md` if any new env vars needed
- Update `docs/troubleshooting.md` with avatar upload common issues
- Verify all doc links resolve

### 8. Validate Final Output
- **Task ID**: validate-all
- **Depends On**: code-review, write-tests, update-docs
- **Assigned To**: validator
- **Agent Type**: validator
- **Parallel**: false
- Run all validation commands
- Run all automated tests (unit + E2E)
- Verify acceptance criteria met
- Start dev servers, test endpoints with real auth tokens
- Verify avatar upload works end-to-end
- Verify approvals filter works with real data
- Verify DB indexes exist in Supabase

### 9. Heal Failures (if any)
- **Task ID**: heal
- **Depends On**: validate-all
- **Assigned To**: team-lead (you)
- **Parallel**: false
- **Max Retries**: 2
- Only run this step if step 8 (validate-all) has failures
- Parse JSON output and route fixes to correct agents
- Re-run validation after fixes

## Pipeline

```
Infra Verify (DB connection) → Build (indexes + 3 features in parallel) → Code Review → Write Tests → Update Docs → Validate → Heal
```

## Acceptance Criteria

### Feature Criteria

- [ ] Approvals page has a "Programs" multi-select filter in the filter bar
      Verified by: E2E-AP-FILTER-01
- [ ] Selecting programs in the filter reduces the visible pending timesheets to only those with entries in the selected programs
      Verified by: E2E-AP-FILTER-01, UNIT-AP-01
- [ ] Clearing the filter shows all pending timesheets again
      Verified by: E2E-AP-FILTER-01
- [ ] Profile page shows current avatar (or initials fallback)
      Verified by: E2E-AVATAR-01
- [ ] User can click avatar to upload a new photo (max 2MB, image only)
      Verified by: E2E-AVATAR-01
- [ ] Uploaded photo appears in profile page AND layout header avatar
      Verified by: E2E-AVATAR-01
- [ ] Database has composite index on `timesheets(user_id, status)`
      Verified by: UNIT-IDX-01
- [ ] Database has index on `timesheet_entries(date)`
      Verified by: UNIT-IDX-01
- [ ] Database has index on `charge_codes(level)` and `charge_codes(owner_id)`
      Verified by: UNIT-IDX-01
- [ ] All list endpoints support `limit` and `offset` pagination params
      Verified by: UNIT-PAG-01

### E2E Test Specifications

```
E2E-AP-FILTER-01: Admin filters approvals by program
  Role: admin (tachongrak@central.co.th)
  Page: /approvals

  Step 1: Navigate to Approvals page
    Pre-check: Filter bar visible with Period, Status, and Search
    Action: (page load)
    Post-check: "Programs" multi-select filter is visible in filter bar
    Snap: "approvals-filter-visible"

  Step 2: Open program filter and select a program
    Pre-check: Programs dropdown shows available programs
    Action: Click "Programs" dropdown, select one program
    Post-check: Pending list filters to show only timesheets with entries in that program
    Snap: "after-filter-applied"

  Step 3: Clear filter
    Action: Click "Clear" in the Programs dropdown
    Post-check: All pending timesheets are visible again
    Snap: "after-filter-cleared"

  Negative: No matching timesheets
    Step: Select a program with no pending timesheets
    Post-check: Empty state shown "No pending approvals"
    Snap: "empty-filter-result"
```

```
E2E-AVATAR-01: User uploads profile photo
  Role: admin (tachongrak@central.co.th)
  Page: /profile

  Step 1: Navigate to Profile page
    Pre-check: Avatar shows initials fallback (no photo yet)
    Action: (page load)
    Post-check: Profile card visible with avatar, name, email, role
    Snap: "profile-before-upload"

  Step 2: Upload photo
    Pre-check: Avatar or "Change Photo" button is clickable
    Action: Click avatar area, select a test image file
    Post-check: Avatar updates to show the uploaded photo, success feedback shown
    Snap: "profile-after-upload"

  Step 3: Verify persistence
    Action: Refresh the page
    Post-check: Avatar still shows the uploaded photo (not reverted to initials)
    Snap: "profile-after-reload"

  Negative: Upload invalid file
    Step: Try to upload a .txt file or file >2MB
    Post-check: Error message shown, avatar unchanged
    Snap: "upload-error"
```

### Infrastructure Criteria
- Database indexes applied to Supabase (verified via `pg_indexes`)
- Supabase Storage bucket `avatars` exists and accepts uploads
- All external connections verified

### Quality Criteria
- Code review passes with no remaining quality issues
- All unit tests pass
- All E2E tests pass against real running servers
- Every feature criterion has at least 1 test ID in its `Verified by:` line

### Documentation Criteria
- `docs/api-reference.md` updated with new endpoint
- `docs/architecture.md` updated with storage note
- `docs/troubleshooting.md` updated with avatar issues
- All doc links resolve

### Runtime Criteria
- All routes return HTTP 200 at runtime
- Avatar upload returns public URL
- Approvals filter reduces results correctly
- `docs/test-results/test-cases.csv` exists with 12 columns
- `docs/test-results/test-cases.md` exists
- `docs/test-results/summary.md` exists
- `docs/test-results/unit/unit-results.json` exists
- `docs/test-results/screenshots/` has .png files

## Validation Commands

- `cd backend && pnpm build` — Backend compiles
- `cd frontend && pnpm build` — Frontend compiles
- `cd backend && pnpm test` — Backend unit tests pass
- `cd frontend && pnpm test` — Frontend unit tests pass
- `cd frontend && npx playwright test e2e/approvals-cr1.spec.ts e2e/profile-avatar.spec.ts --project=desktop` — E2E tests pass
- `curl -s "http://localhost:3001/api/v1/approvals/pending?programs=PRG-001" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'OK: {len(d[\"pending\"])} items')"` — Approvals filter endpoint works
- `curl -s -X PUT "http://localhost:3001/api/v1/users/me/avatar" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"avatarUrl":"https://example.com/test.jpg"}' | python3 -c "import sys,json; print(json.load(sys.stdin))"` — Avatar endpoint works
- `test -f docs/test-results/test-cases.csv && head -1 docs/test-results/test-cases.csv | grep -q 'ID,Title'` — Test cases CSV exists
- `test -f docs/test-results/test-cases.md && grep -q '|' docs/test-results/test-cases.md` — Test cases MD exists
- `test -f docs/test-results/summary.md` — Summary exists
- `test -f docs/env-setup.md` — Verify env-setup doc exists
- `test -f docs/architecture.md` — Verify architecture doc exists
- `grep -q 'mermaid' docs/architecture.md` — Verify architecture doc has a Mermaid diagram
- `test -f docs/troubleshooting.md` — Verify troubleshooting doc exists
- `grep -q '### Issue\|### Problem' docs/troubleshooting.md` — Verify troubleshooting doc has at least one issue
- `test -f docs/test-results/unit/unit-results.json` — Unit results JSON exists
- `test -f docs/test-results/unit/unit-results.md` — Unit results MD exists
- `ls docs/test-results/screenshots/*.png 2>/dev/null | wc -l | grep -v '^0$'` — Screenshots exist

## Healing Rules

- `compile error` → builder — Fix syntax or import errors in the failing file
- `test fail` → test-writer — Fix failing tests or update test expectations
- `code review` → code-reviewer — Re-review and fix remaining quality issues
- `test-cases.md` → test-writer — Generate the missing test case catalog
- `test-results/summary.md` → test-writer — Generate the missing test summary report
- `unit-results` → test-writer — Re-run tests and save results to `docs/test-results/unit/`
- `screenshots` → test-writer — Capture missing screenshots via Playwright
- `broken link` → docs-writer — Create missing documentation files
- `missing env-setup` → docs-writer — Create docs/env-setup.md
- `missing architecture` → docs-writer — Create docs/architecture.md with Mermaid diagram
- `missing troubleshooting` → docs-writer — Create docs/troubleshooting.md
- `index` → builder — Fix or reapply missing database indexes
- `storage` → builder — Fix Supabase Storage bucket configuration
- `avatar` → builder — Fix avatar upload endpoint or frontend UI
- `filter` → builder — Fix approvals filter logic
- `pagination` → builder — Fix pagination on list endpoints
- `runtime` → builder — Fix runtime errors caught by real server validation
- `E2E` → test-writer — Fix E2E test or the underlying issue it exposes

## Notes
- Supabase Storage bucket creation can be done via MCP `mcp__supabase__execute_sql` or Supabase dashboard
- The `MultiSelectFilter` component is already battle-tested in the Budget page — do NOT duplicate or recreate it
- Avatar upload should use client-side Supabase Storage upload (not backend file handling) for simplicity
- DB indexes are additive — no data migration needed, just `CREATE INDEX IF NOT EXISTS`
- Port 3000 is in use by another project — frontend runs on port 3002, backend on 3001
- `FRONTEND_URL` in backend `.env` is set to `http://localhost:3002`
