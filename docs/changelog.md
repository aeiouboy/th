# Changelog

Append-only log of completed tasks and releases. Most recent entry first.

---

## [2026-03-26] CR1 Remaining — Avatar Upload, Approval Programs Field, Pagination

- **Status**: Completed
- **Assigned To**: cr1-remaining team (team-lead, code-reviewer, docs-writer, test-writer, validator)
- **Summary**: Closed out the remaining CR1 items not covered in the initial CR1 delivery. Added profile avatar upload via Supabase Storage, exposed the `programs` field on each pending approval item so approvers can see which programs are involved at a glance, and extended most list endpoints to support `limit`/`offset` pagination.

### Features Delivered

| Item | Description |
|------|-------------|
| Avatar upload | `PUT /users/me/avatar` endpoint stores an avatar URL on the user profile. Frontend uploads directly to the Supabase Storage `avatars` bucket (public, 2 MB limit) then calls the endpoint with the resulting URL. |
| Approval programs field | `GET /approvals/pending` now returns a `programs: string[]` array per timesheet, listing the program names referenced by that timesheet's entries. |
| List endpoint pagination | Most list endpoints now accept `limit` (default 100, max 500) and `offset` query params for offset-based pagination. |

### Key Files Changed

| Area | Files |
|------|-------|
| Backend | `users.controller.ts`, `users.service.ts`, `approvals.controller.ts`, `approvals.service.ts` |
| Frontend | `profile/page.tsx`, `approvals/page.tsx` |
| Documentation | `docs/api-reference.md`, `docs/architecture.md`, `docs/troubleshooting.md`, `docs/changelog.md` (this file) |

---

## [2026-03-23] CR1 — Executive Feedback Change Requests (CR-01 through CR-22)

- **Status**: Completed
- **Assigned To**: cr1-remaining team (team-lead, code-reviewer, docs-writer)
- **Summary**: Implemented the full set of executive change requests from the CR1 PowerPoint review. Delivered 22 change items spanning dashboard enhancements, new report views, charge code access workflows, timesheet UX improvements, system stability fixes, and deployment configuration corrections.

### Features Delivered

| CR | Description | Status |
|----|-------------|--------|
| CR-01 | Dashboard KPI cards — period hours, YTD chargeability, pending approvals, budget health | Completed |
| CR-02 | Chargeability trend line chart (monthly YTD, Recharts) | Completed |
| CR-03 | Program distribution pie chart (current period / YTD toggle) | Completed |
| CR-04 | Period selector dropdown (52-week list) on Time Entry page | Completed |
| CR-05 | Copy charge code rows from previous period into current draft timesheet | Completed |
| CR-06 | Half-day leave type support (`leave_type` column on `vacation_requests`) | Completed |
| CR-07 | Charge code access request workflow (request, list, approve/reject) | Completed |
| CR-08 | Budget detail drill-down per charge code (child breakdown + progress bars) | Completed |
| CR-09 | Team breakdown within budget detail (hours/cost/% per department) | Completed |
| CR-10 | Charge code tree view CSS alignment (ID \| Name \| Budget columns) | Completed |
| CR-11 | Cascade access — propagate user list from parent to all child charge codes | Completed |
| CR-12 | Approval queue search by employee name, email, or department | Completed |
| CR-13 | Reports: By Program tab (budget vs actual, task/team distribution) | Completed |
| CR-14 | Reports: By Cost Center tab (chargeability, charge distribution) | Completed |
| CR-15 | Reports: By Person tab (hours history, project summary, vacation days) | Completed |
| CR-16 | Budget page: multi-select charge code filter | Completed |
| CR-17 | Budget page: team-level cost breakdown panel | Completed |
| CR-18 | Auth state change clears TanStack Query cache on sign-in/sign-out | Completed |
| CR-19 | RIS corporate logo in sidebar header | Completed |
| CR-20 | Avatar component wired to real `avatar_url` from user profile | Completed |
| CR-21 | In-app chat widget (Phase 1 — NLP via Teams bot integration) | Completed |
| CR-22 | Pagination on `GET /budgets` and `GET /reports/*` endpoints | Completed |

### Key Files Changed

| Area | Files |
|------|-------|
| Backend controllers | `timesheets.controller.ts`, `charge-codes.controller.ts`, `approvals.controller.ts`, `budgets.controller.ts`, `reports.controller.ts` |
| Backend services | `timesheets.service.ts`, `charge-codes.service.ts`, `reports.service.ts`, `budgets.service.ts` |
| Database schema | `charge-code-requests.ts` (new table), `vacation-requests.ts` (`leave_type` column), `schema/index.ts` |
| Frontend pages | `time-entry/page.tsx`, `charge-codes/page.tsx`, `approvals/page.tsx`, `budget/page.tsx`, `reports/page.tsx`, `(authenticated)/page.tsx` |
| Frontend components | `dashboard/ChargeabilityTrend.tsx`, `dashboard/ProgramDistribution.tsx`, `time-entry/PeriodSelector.tsx`, `time-entry/RequestChargeCode.tsx`, `charge-codes/BudgetDetail.tsx`, `charge-codes/ChargeCodeTree.tsx`, `reports/ReportByProgram.tsx`, `reports/ReportByCostCenter.tsx`, `reports/ReportByPerson.tsx`, `budget/MultiSelectFilter.tsx`, `budget/TeamBreakdown.tsx`, `layout/ChatWidget.tsx`, `layout/ChatBubble.tsx` |
| Documentation | `docs/api-reference.md`, `docs/architecture.md`, `docs/troubleshooting.md`, `docs/changelog.md` (this file) |

---

## [2026-03-17] Initial Build — Timesheet & Cost Allocation System

- **Status**: Completed
- **Summary**: Initial full-stack implementation. NestJS 11 backend, Next.js 16 frontend, Supabase (PostgreSQL + Auth). Delivered core timesheet workflow (draft → submitted → manager_approved → cc_approved → locked), charge code hierarchy, RBAC, budget tracking, reports, calendar management, cost rates, Microsoft Teams bot integration, and E2E test suite.
- **Files Changed**: All files under `backend/src/` and `frontend/src/`. See git history from commit `27d221b`.
