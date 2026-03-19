# Plan: Close AC Gaps — Owner Authorization & Notification System

## Task Description
Close the remaining gaps identified during the PRD acceptance criteria audit:
1. **AC10** — Charge code `updateAccess` endpoint allows any admin/charge_manager to modify any charge code's access. The PRD requires that the **charge code owner** controls access.
2. **AC17.1-17.4** — Notification infrastructure exists (backend logic computes reminders, summaries, insights) but **nothing is actually delivered or visible to users**. Notifications are stored in-memory and lost on restart. There is no frontend Notification Center — only the existing `NotificationBell` which shows budget/chargeability alerts from reports, not personal notifications.

## Objective
When this plan is complete:
- `PUT /charge-codes/:id/access` enforces owner/approver/admin authorization (AC10 fully met)
- Notifications are **persisted to the database** (new `notifications` table)
- The existing scheduler/integration notification services **write to the DB** instead of in-memory
- A **Notification Center** page (`/notifications`) displays personal notifications with read/unread state
- The existing **NotificationBell** component is enhanced to also show personal notification count and link to the Notification Center
- Manager summary notifications are visible in-app (AC17.3)
- Weekly insights are visible in-app (AC17.4)
- All notification types (timesheet_reminder, approval_reminder, manager_summary, weekly_insights) are persisted and queryable

## Problem Statement
The PRD AC10 specifies "Charge code owner to be able to config and control access" — the current implementation only checks role, not ownership. Any charge_manager can grant access to any charge code.

AC17.2-17.4 notification logic is fully implemented but has zero delivery mechanism — all notifications are `console.log` or in-memory array. Users never see them. There's no DB table, no REST endpoint for personal notifications, and no frontend to display them.

## Solution Approach
1. **AC10 fix**: Add an ownership check in `ChargeCodesService.updateAccess()` — only the charge code's `ownerId`, `approverId`, or an `admin` can modify access. Small, surgical change.
2. **Notification persistence**: Create a `notifications` DB table via Drizzle schema. Refactor `IntegrationNotificationService` to insert into DB instead of pushing to in-memory array. Add a `NotificationsService` with CRUD (list by user, mark read, mark all read).
3. **Notification API**: New `NotificationsController` with endpoints: `GET /notifications` (my notifications), `PATCH /notifications/:id/read`, `POST /notifications/read-all`.
4. **Frontend Notification Center**: New page at `/notifications` showing a list of personal notifications with read/unread styling, timestamps, and type icons.
5. **NotificationBell enhancement**: Add personal notification unread count alongside existing budget alerts. Click navigates to `/notifications`.

## Tech Stack
- **Language**: TypeScript
- **Framework**: NestJS 11 (backend), Next.js 16 (frontend)
- **Runtime**: Node.js
- **Key APIs/Libraries**: Drizzle ORM, TanStack Query v5, shadcn/ui, Tailwind CSS v4
- **Build Tools**: pnpm, Turbopack
- **Testing**: Jest (backend), Vitest (frontend), Playwright (E2E)

## Technical Design

### Architecture
```
Schedulers (Cron jobs)
  └─> IntegrationNotificationService.send*()
        └─> INSERT INTO notifications table
              └─> GET /notifications (user-filtered, paginated)
                    └─> NotificationBell (unread count)
                    └─> /notifications page (full list)
```

### Key Design Decisions
1. **DB-backed notifications instead of external service** — The PRD mentions Teams delivery but that requires Azure Bot registration (external dependency). In-app notifications via DB solve AC17.2-17.4 immediately. Teams delivery can be layered on later by adding a delivery adapter.
2. **Reuse existing notification generation logic** — `IntegrationNotificationService` already computes the right data. Only the storage needs to change from in-memory array to DB insert.
3. **Owner check at service level, not guard level** — The ownership check for AC10 is a business rule specific to one method. A custom guard would be over-engineered.
4. **NotificationBell combines alerts + personal notifications** — Show sum of (budget alerts + chargeability alerts + unread personal notifications) in the badge. Clicking opens the existing dropdown with a "View all" link to `/notifications`.

### Data Model

**New `notifications` table:**
```typescript
export const notificationTypeEnum = pgEnum('notification_type', [
  'timesheet_reminder',
  'approval_reminder',
  'manager_summary',
  'weekly_insights',
]);

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: notificationTypeEnum('type').notNull(),
  recipientId: uuid('recipient_id').notNull().references(() => profiles.id),
  subject: varchar('subject', { length: 500 }).notNull(),
  body: text('body').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  readAt: timestamp('read_at'),
});
```

### API / Interface Contracts

**New endpoints:**
- `GET /notifications?limit=20&offset=0&unread_only=true` — Returns user's notifications (filtered by `request.user.id`)
- `GET /notifications/unread-count` — Returns `{ count: number }`
- `PATCH /notifications/:id/read` — Mark single notification as read
- `POST /notifications/read-all` — Mark all user's notifications as read

**Modified endpoint:**
- `PUT /charge-codes/:id/access` — Now returns 403 if caller is not owner/approver/admin

## UX/UI Design

### Figma / Design Reference
No external design provided — ASCII wireframes below serve as the design spec.

### Wireframes

**NotificationBell (enhanced) — existing component, add personal notification items:**
```
┌──────────────────────────────────┐
│  Notifications                   │
├──────────────────────────────────┤
│ ● Timesheet Reminder             │
│   You have logged 16h/40h...     │
│   2 hours ago                    │
├──────────────────────────────────┤
│ ● 3 Timesheets Awaiting Approval │
│   Wichai, Ploy pending...        │
│   5 hours ago                    │
├──────────────────────────────────┤
│ ○ Budget overrun: PRJ-042        │
│   12% over budget                │
│   1 day ago                      │
├──────────────────────────────────┤
│  View all notifications →        │
└──────────────────────────────────┘
● = unread (bold text, dot indicator)
○ = read (normal text)
```

**Notification Center page (`/notifications`):**
```
┌─────────────────────────────────────────────────────┐
│  Notifications                    [Mark all as read] │
├─────────────────────────────────────────────────────┤
│  Filter: [All] [Reminders] [Approvals] [Summaries]  │
├─────────────────────────────────────────────────────┤
│ ● 🔔 Timesheet Reminder                   2h ago   │
│   You have logged 16h out of 32h expected...        │
├─────────────────────────────────────────────────────┤
│ ● ✅ 3 Timesheets Awaiting Your Approval   5h ago   │
│   Wichai, Ploy pending your approval...             │
├─────────────────────────────────────────────────────┤
│ ○ 📊 Weekly Team Summary (2026-03-11)      1d ago   │
│   Completed: 3, Pending: 1, Not submitted: 1       │
├─────────────────────────────────────────────────────┤
│ ○ 📈 Weekly Insights (2026-03-11)          1d ago   │
│   Total: 200h, Chargeability: 78%, Overruns: 1     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Load more]                                        │
└─────────────────────────────────────────────────────┘
```

### Visual Style
- Follows existing app design: Tailwind CSS v4 tokens, shadcn/ui components
- Unread items: bold text + teal dot indicator on left
- Read items: normal weight, muted text
- Type icons from lucide-react: Bell (reminder), CheckCircle (approval), BarChart3 (summary), TrendingUp (insights)
- Relative timestamps ("2h ago", "1d ago")

### User Flow
1. Scheduler fires → notification saved to DB
2. User opens app → NotificationBell shows unread count (budget alerts + personal notifications)
3. User clicks bell → dropdown shows top 5 combined alerts + "View all" link
4. User clicks "View all" → navigates to `/notifications` page
5. User clicks a notification → marks as read, shows full body
6. User clicks "Mark all as read" → clears all unread

## Relevant Files

**Backend — to modify:**
- `backend/src/charge-codes/charge-codes.service.ts` — Add owner check in `updateAccess()`
- `backend/src/charge-codes/charge-codes.controller.ts` — Pass `@CurrentUser()` to `updateAccess()`
- `backend/src/integrations/notification.service.ts` — Refactor to write to DB
- `backend/src/database/schema/index.ts` — Export new notifications schema
- `backend/src/app.module.ts` — Register new NotificationsModule

**Frontend — to modify:**
- `frontend/src/components/layout/NotificationBell.tsx` — Add personal notification count + items
- `frontend/src/app/(authenticated)/layout.tsx` — Add notifications nav link (if needed)

### New Files
- `backend/src/database/schema/notifications.ts` — Drizzle schema for notifications table
- `backend/src/notifications/notifications.module.ts` — NestJS module
- `backend/src/notifications/notifications.service.ts` — CRUD service
- `backend/src/notifications/notifications.controller.ts` — REST endpoints
- `frontend/src/app/(authenticated)/notifications/page.tsx` — Notification Center page

## Implementation Phases

### Phase 1: Foundation
- Create notifications DB schema + migration
- AC10 owner authorization fix

### Phase 2: Core Implementation
- NotificationsService (CRUD)
- NotificationsController (REST API)
- Refactor IntegrationNotificationService to persist to DB
- Frontend Notification Center page

### Phase 3: Integration & Polish
- Enhance NotificationBell to include personal notifications
- Wire schedulers to produce real notifications
- E2E tests

## Team Orchestration

### Team Members

- Builder
  - Name: builder-backend
  - Role: Implement backend changes — DB schema, notifications module, AC10 fix, refactor notification service
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-frontend
  - Role: Implement frontend — Notification Center page, NotificationBell enhancement
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
  - Role: Update documentation with new notification system and AC10 changes
  - Agent Type: docs-writer
  - Resume: false

- Validator
  - Name: validator
  - Role: Final read-only validation that all acceptance criteria are met and all tests pass
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Create Notifications DB Schema & Migration
- **Task ID**: create-notifications-schema
- **Depends On**: none
- **Assigned To**: builder-backend
- **Agent Type**: builder
- **Parallel**: false
- Create `backend/src/database/schema/notifications.ts` with the `notifications` table as defined in the Data Model section
- Export from `backend/src/database/schema/index.ts`
- Run `pnpm db:push` from `backend/` to push schema to Supabase
- Verify table exists by running a simple SELECT query

### 2. Fix AC10 — Owner Authorization for Charge Code Access
- **Task ID**: fix-ac10-owner-auth
- **Depends On**: none
- **Assigned To**: builder-backend
- **Agent Type**: builder
- **Parallel**: true (can run alongside task 1)
- In `backend/src/charge-codes/charge-codes.controller.ts`:
  - Add `@CurrentUser() user: any` parameter to the `updateAccess()` method
  - Pass `user.id` to the service method
- In `backend/src/charge-codes/charge-codes.service.ts`:
  - Add `callerId: string` parameter to `updateAccess()`
  - After `findByIdRaw(chargeCodeId)`, check: if the charge code's `ownerId !== callerId` AND `approverId !== callerId`, look up the caller's profile role. If role is not `admin`, throw `ForbiddenException('Only the charge code owner, approver, or admin can modify access')`
  - Import `ForbiddenException` from `@nestjs/common` and `profiles` from schema
- Update the existing unit test `charge-codes.service.spec.ts` to cover the new auth check

### 3. Create Notifications Module (Backend)
- **Task ID**: create-notifications-module
- **Depends On**: create-notifications-schema
- **Assigned To**: builder-backend
- **Agent Type**: builder
- **Parallel**: false
- Create `backend/src/notifications/notifications.service.ts`:
  - `create(type, recipientId, subject, body)` — inserts a notification row
  - `findByUser(userId, { limit, offset, unreadOnly })` — returns paginated notifications
  - `getUnreadCount(userId)` — returns count of unread notifications
  - `markAsRead(notificationId, userId)` — sets `isRead=true, readAt=now()` (verify ownership)
  - `markAllAsRead(userId)` — bulk update all user's unread notifications
- Create `backend/src/notifications/notifications.controller.ts`:
  - `GET /notifications` — calls `findByUser(user.id, query)`
  - `GET /notifications/unread-count` — calls `getUnreadCount(user.id)`
  - `PATCH /notifications/:id/read` — calls `markAsRead(id, user.id)`
  - `POST /notifications/read-all` — calls `markAllAsRead(user.id)`
  - All endpoints use `@ApiBearerAuth()` (protected by global auth guard)
- Create `backend/src/notifications/notifications.module.ts`
- Register in `backend/src/app.module.ts`

### 4. Refactor IntegrationNotificationService to Persist to DB
- **Task ID**: refactor-notification-persistence
- **Depends On**: create-notifications-module
- **Assigned To**: builder-backend
- **Agent Type**: builder
- **Parallel**: false
- In `backend/src/integrations/notification.service.ts`:
  - Inject `NotificationsService` (from new module)
  - In `createNotification()`, call `this.notificationsService.create(type, recipientId, subject, body)` to persist
  - Keep the in-memory array as optional secondary store for backward compatibility with `GET /integrations/notifications`
  - Keep the logger output for observability
- In `backend/src/integrations/integrations.module.ts`:
  - Import `NotificationsModule`
- In `backend/src/schedulers/notification.service.ts`:
  - Replace the logger-only approach: inject `NotificationsService` and call `create()` for each incomplete user
  - Import `NotificationsModule` in `SchedulersModule`

### 5. Build Frontend Notification Center Page
- **Task ID**: build-notification-center
- **Depends On**: create-notifications-module
- **Assigned To**: builder-frontend
- **Agent Type**: builder
- **Parallel**: true (can run alongside task 4)
- Create `frontend/src/app/(authenticated)/notifications/page.tsx`:
  - Use TanStack Query to fetch `GET /notifications?limit=20`
  - Implement filter tabs: All, Reminders, Approvals, Summaries, Insights
  - Show notification list with: type icon, subject (bold if unread), body excerpt, relative timestamp
  - Click a notification → call `PATCH /notifications/:id/read` and expand the full body
  - "Mark all as read" button → call `POST /notifications/read-all` and invalidate query
  - "Load more" button for pagination (offset-based)
  - Use existing `PageHeader` shared component
  - Style: follow existing app patterns (Tailwind tokens, card borders, muted text)

### 6. Enhance NotificationBell Component
- **Task ID**: enhance-notification-bell
- **Depends On**: build-notification-center
- **Assigned To**: builder-frontend
- **Agent Type**: builder
- **Parallel**: false
- In `frontend/src/components/layout/NotificationBell.tsx`:
  - Add a TanStack Query for `GET /notifications/unread-count` (30s stale time)
  - Update badge count: `totalCount = budgetAlerts.length + chargeabilityAlerts.length + unreadNotifications`
  - In the dropdown, add a section above the existing budget alerts showing the top 3 unread personal notifications (from `GET /notifications?limit=3&unread_only=true`)
  - Add a "View all notifications" link at the bottom that navigates to `/notifications`
  - Add click handler on personal notification items to mark as read + navigate

### 7. Code Review
- **Task ID**: code-review
- **Depends On**: fix-ac10-owner-auth, refactor-notification-persistence, enhance-notification-bell
- **Assigned To**: reviewer
- **Agent Type**: code-reviewer
- **Parallel**: false
- Review all files created/modified by builders for quality, efficiency, reuse, and accessibility issues
- Check for: SQL injection, proper error handling, consistent patterns with existing code
- Verify AC10 auth check handles edge cases (null ownerId, null approverId)
- Verify notification service doesn't have N+1 query problems
- Fix all issues found directly
- Report what was fixed and what was skipped

### 8. Write Tests
- **Task ID**: write-tests
- **Depends On**: code-review
- **Assigned To**: tester
- **Agent Type**: test-writer
- **Parallel**: false
- **Backend unit tests:**
  - `notifications.service.spec.ts` — CRUD operations, pagination, ownership checks
  - Update `charge-codes.service.spec.ts` — test owner auth: owner can update, non-owner charge_manager gets 403, admin can always update
- **Frontend unit tests:**
  - `notifications/page.test.tsx` — renders list, filter tabs, mark as read
  - Update `NotificationBell` test if exists
- **E2E tests:**
  - Add E2E spec for notification flow: trigger notification via API → verify it appears in notification center → mark as read
  - Add E2E spec for AC10: non-owner charge_manager tries to update access → gets 403
- Run all tests and ensure they pass
- Save test results to `docs/test-results/`

### 9. Update Docs
- **Task ID**: update-docs
- **Depends On**: write-tests
- **Assigned To**: docs
- **Agent Type**: docs-writer
- **Parallel**: false
- Update `docs/api-reference.md` with new notification endpoints
- Update `docs/architecture.md` with notification flow diagram
- Update `docs/env-setup.md` if any new env vars needed
- Update `docs/troubleshooting.md` with notification-related issues
- Verify every internal link resolves to an existing file

### 10. Validate Final Output
- **Task ID**: validate-all
- **Depends On**: code-review, write-tests, update-docs
- **Assigned To**: validator
- **Agent Type**: validator
- **Parallel**: false
- Run all backend unit tests: `cd backend && pnpm test`
- Run all frontend unit tests: `cd frontend && pnpm test`
- Run E2E tests: `cd frontend && npx playwright test`
- Verify AC10: attempt `PUT /charge-codes/:id/access` as non-owner → expect 403
- Verify notifications: trigger `POST /integrations/notifications/send` → check `GET /notifications` returns persisted data
- Verify all documentation links resolve
- Check that `/notifications` page loads in the running app

### 11. Heal Failures (if any)
- **Task ID**: heal
- **Depends On**: validate-all
- **Assigned To**: team-lead (you)
- **Parallel**: false
- **Max Retries**: 2
- Only run this step if step 10 (validate-all) has failures
- Parse failures and route to correct agent per Healing Rules
- After fixes, re-run validation
- If still failing after 2 retries, stop and report remaining failures

## Pipeline

```
Build (schema + AC10 fix) → Build (notifications module + refactor + frontend) → Code Review → Write Tests → Update Docs → Validate → Heal (if needed) → Re-validate
```

## Acceptance Criteria

### Feature Criteria
- [ ] AC10: `PUT /charge-codes/:id/access` returns 403 when called by a non-owner/non-approver charge_manager
      Verified by: UNIT-CC-AUTH-01, E2E-AC10-01
- [ ] AC10: Admin can still update access on any charge code regardless of ownership
      Verified by: UNIT-CC-AUTH-02
- [ ] AC10: Charge code owner can update access on their own charge code
      Verified by: UNIT-CC-AUTH-03
- [ ] AC17.2: Notifications table exists in DB and persists across service restarts
      Verified by: UNIT-NOTIF-01
- [ ] AC17.2: `IntegrationNotificationService.sendTimesheetReminders()` creates DB records
      Verified by: UNIT-NOTIF-02
- [ ] AC17.2: `IntegrationNotificationService.sendApprovalReminders()` creates DB records
      Verified by: UNIT-NOTIF-03
- [ ] AC17.3: Manager summary notifications are persisted and visible via `GET /notifications`
      Verified by: UNIT-NOTIF-04, E2E-NOTIF-01
- [ ] AC17.4: Weekly insights notifications are persisted and visible via `GET /notifications`
      Verified by: UNIT-NOTIF-05
- [ ] Users can view their personal notifications at `/notifications` page
      Verified by: E2E-NOTIF-01
- [ ] Users can mark individual notifications as read
      Verified by: UNIT-NOTIF-06, E2E-NOTIF-02
- [ ] Users can mark all notifications as read
      Verified by: UNIT-NOTIF-07
- [ ] NotificationBell shows combined count (budget alerts + chargeability alerts + unread personal notifications)
      Verified by: UNIT-BELL-01
- [ ] Notification Center supports filtering by type
      Verified by: UNIT-NOTIF-PAGE-01

### E2E Test Specifications

```
E2E-AC10-01: Non-owner charge_manager cannot modify access
  Given: Logged in as nattaya.k@central.co.th (charge_manager), charge code PRG-001 owned by tachongrak@central.co.th
  When: Call PUT /charge-codes/PRG-001/access with addUserIds
  Then: API returns 403 Forbidden
  Negative: Non-owner gets blocked; owner and admin succeed

E2E-NOTIF-01: Notification Center shows triggered notifications
  Given: Logged in as admin (tachongrak@central.co.th)
  When: Call POST /integrations/notifications/send to trigger all notification types
  Snap: "notifications-triggered" — API response shows counts > 0
  When: Navigate to /notifications page
  Snap: "notification-center-loaded" — page shows notification list with items
  Then: At least one notification is visible with subject and body
  Then: Unread notifications have bold styling

E2E-NOTIF-02: Mark notification as read
  Given: Logged in as admin, at least one unread notification exists
  When: Click on an unread notification in the list
  Snap: "after-mark-read" — notification text is no longer bold
  Then: Notification isRead is true (verify via API)
  Then: Unread count in NotificationBell decreases
```

### Infrastructure Criteria
- All external service connections verified with real queries/requests
- No placeholder values remain in .env files
- Auth endpoint returns valid JWKS/keys
- Database accepts queries via configured connection string (including new notifications table)

### Quality Criteria
- Code review passes with no remaining quality issues
- All unit tests pass (mocked dependencies)
- All E2E tests pass against real running servers
- Every feature criterion has at least 1 test ID in its `Verified by:` line

### Documentation Criteria
- All documentation files referenced in indexes/READMEs actually exist
- `docs/env-setup.md` exists with environment variable descriptions and example values
- `docs/architecture.md` exists with a Mermaid data flow diagram and component tree
- `docs/troubleshooting.md` exists with at least one documented issue and fix

### Runtime Criteria
- If project has a dev server: all routes return HTTP 200 at runtime
- At least one authenticated API call returns real data from the database
- Auth flow works end-to-end
- Test results saved to `docs/test-results/`

## Validation Commands
```bash
# Backend unit tests
cd backend && pnpm test

# Frontend unit tests
cd frontend && pnpm test

# E2E tests
cd frontend && npx playwright test

# Verify notifications table exists (via backend)
cd backend && npx ts-node -e "
  const { drizzle } = require('drizzle-orm/postgres-js');
  const postgres = require('postgres');
  const sql = postgres(process.env.SUPABASE_DB_URL);
  sql\`SELECT count(*) FROM notifications\`.then(console.log).finally(() => sql.end());
"

# Verify docs exist
test -f docs/env-setup.md
test -f docs/architecture.md
grep -q 'mermaid' docs/architecture.md
test -f docs/troubleshooting.md
grep -q '### Issue\|### Problem' docs/troubleshooting.md

# Verify test results
test -f docs/test-results/summary.md
test -f docs/test-results/test-cases.md
test -f docs/test-results/unit/unit-results.json
test -f docs/test-results/unit/unit-results.md

# Verify no broken internal doc links
grep -roh '\[.*\](\./[^)]*)\|\[.*\](docs/[^)]*)' docs/ README.md 2>/dev/null | grep -oP '\(\.?/?[^)]+\)' | tr -d '()' | while read f; do test -f "$f" || echo "BROKEN: $f"; done

# Verify screenshots
ls docs/test-results/screenshots/*--desktop.png 2>/dev/null | head -5
```

## Healing Rules
- `compile error` → builder — Fix syntax or import errors in the failing file
- `ForbiddenException` → builder-backend — Fix AC10 authorization logic
- `notifications` → builder-backend — Fix notification schema or service
- `pytest` → tester — Fix failing tests or update test expectations
- `playwright` → tester — Fix failing E2E tests
- `code review` → reviewer — Re-review and fix remaining quality issues
- `test-cases.md` → tester — Generate the missing test case catalog
- `test-results/summary.md` → tester — Generate the missing test summary report
- `unit-results` → tester — Re-run tests and save results
- `unit-results.json` → tester — Configure test runner JSON output and re-run tests
- `screenshots` → tester — Capture missing page screenshots via Playwright
- `broken link` → docs — Create missing documentation files referenced in indexes
- `missing env-setup` → docs — Create docs/env-setup.md
- `missing architecture` → docs — Create docs/architecture.md with Mermaid diagram
- `missing troubleshooting` → docs — Create docs/troubleshooting.md
- `infra verify` → builder-backend — Fix failing infrastructure connection
- `E2E smoke` → tester — Fix E2E smoke test
- `runtime` → builder-backend — Fix runtime errors

## Notes
- Teams webhook integration (actual Microsoft Bot Framework) is explicitly **out of scope** for this plan. The in-app notification system satisfies AC17.2-17.4. Teams delivery can be a separate feature.
- The `@Public()` decorator on `POST /integrations/teams/webhook` is a pre-existing concern (no JWT verification from Bot Framework). Not addressed here.
- The notification scheduler cron jobs already exist — they just need to be wired to persist. No new cron schedules needed.
- No new npm packages are needed. All functionality uses existing Drizzle, NestJS, TanStack Query, shadcn/ui.
