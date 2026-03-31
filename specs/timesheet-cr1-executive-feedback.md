# Plan: Timesheet CR1 — Executive Feedback Implementation

## Task Description

แก้ไขทุก Change Request จากการ review ของผู้บริหาร (timesheet_CR1.pptx) จำนวน 22 รายการ + แก้ 4 Known Bugs ที่ยังคงอยู่ในระบบ ครอบคลุม 7 หน้าหลัก: Dashboard, Time Entry, Charge Codes, Approvals, Reports, Budget, และ General/System โดยแต่ละข้อต้องมี E2E test specs ละเอียด, code review, และเอกสารครบถ้วน

## Objective

เมื่อ plan นี้เสร็จสมบูรณ์:
1. ทุก 22 CRs ถูก implement และผ่านการทดสอบ
2. ทุก CR มี E2E test case ที่ QA review ได้ (CSV 12 columns, ภาษาไทย)
3. ทุกหน้าที่แก้ไขมี screenshot evidence
4. เอกสาร architecture, troubleshooting, env-setup อัพเดทครบ
5. ระบบรองรับ 200 users, 100 projects, 5 ปีข้อมูล

## Problem Statement

ผู้บริหารได้ review ระบบ Timesheet & Cost Allocation และให้ feedback 22 ข้อ ครอบคลุม:
- Dashboard ขาด Chargeability YTD, trend graph, distribution chart
- Time Entry ขาด period selection, copy from last period, vacation hours, request charge code
- Charge Codes ขาด budget drill-down detail, team breakdown, tree UX improvement, cascade access
- Approvals search ใช้ไม่ได้
- Reports ขาด view by Program, Cost Center, Person
- Budget ขาด multi-select filter, team breakdown detail
- System: login session bug, ขาด RIS logo, profile photo, chatbot, scalability concern

### Known Bugs (จาก CLAUDE.md audit — ยังไม่ได้แก้)

| Bug ID | Bug | ไฟล์ | บรรทัด | สาเหตุ |
|--------|-----|------|--------|--------|
| BUG-01 | Avatar แสดง "U" แทน initials จริง | `layout.tsx` | 155-163 | `getInitials()` return "U" เมื่อ name ว่าง แทนที่จะดึงจาก profile |
| BUG-02 | "Active" badge แสดงทุกคนเป็น Active | `admin/users/page.tsx` | 153-157 | ไม่มี `is_active` field ใน DB แต่แสดง badge ทุกคน |
| BUG-03 | Status filter ในหน้า Users ไม่ทำงาน | `admin/users/page.tsx` | 101 | `matchesStatus = statusFilter === 'all'` — ค่าเป็น true เสมอ |
| BUG-04 | E2E tests ไม่ cleanup test data | `e2e/**` | — | สร้าง "Test-Program-*", "L-TEST-*" แต่ไม่ลบ → data pollution |
| BUG-05 | วัน vacation ยังกรอก hours charge code อื่นได้ | `TimesheetGrid.tsx:208` | 208 | `isNonWorking` เช็คแค่ weekend/holiday ไม่รวม vacation |

### Existing Specs (ต้อง implement ร่วมกับ CRs)

| Spec | ไฟล์ | เกี่ยวข้องกับ | สรุป |
|------|------|-------------|------|
| Half-Day Leave + System Row | `specs/chore-improvements-half-day-leave-system-row.md` | CR-06, BUG-05 | เพิ่ม `leave_type` (full/half_am/half_pm), ซ่อน LEAVE-001 จาก dropdown, auto-show system row, แก้ min-hours validation |

**CR-06 Reconciliation**: ผู้บริหารบอก "ให้ employee กรอก vacation hours ได้เลย" แต่ spec ที่มีอยู่กำหนดให้ LEAVE-001 เป็น **system row auto-fill** ไม่ใช่ manual entry — เพราะ vacation approve ใน Cnext แล้ว → ระบบรู้วันลาอยู่แล้ว ไม่ต้องให้กรอกซ้ำ **สรุป: ใช้แนวทาง auto-fill** (ตรงตามเจตนาผู้บริหาร "ไม่ต้อง approve ซ้ำ" แต่ดีกว่า manual entry เพราะ data ถูกต้องกว่า)

## Solution Approach

แบ่งงานเป็น 7 phases ตาม logical grouping:
1. **Bug Fixes & Quick Wins** — CR-12, CR-18, CR-19, CR-20 (แก้ bug + UI polish)
2. **Dashboard Enhancements** — CR-01, CR-02, CR-03 (charts & KPI)
3. **Time Entry Improvements** — CR-04, CR-05, CR-06, CR-07 (major UX changes)
4. **Charge Code & Budget Detail** — CR-08, CR-09, CR-10, CR-11
5. **Reports Enhancement** — CR-13, CR-14, CR-15 (new report views)
6. **Budget Page Enhancement** — CR-16, CR-17
7. **System & Performance** — CR-21, CR-22

## Tech Stack

- **Language**: TypeScript (frontend + backend)
- **Frontend**: Next.js 16 + React 19 + TanStack Query v5 + Tailwind CSS v4 + shadcn/ui + Recharts
- **Backend**: NestJS 11 + Drizzle ORM + postgres-js
- **Database**: Supabase (PostgreSQL) via pooler `aws-1-ap-northeast-1.pooler.supabase.com:6543`
- **Auth**: Supabase Auth (ES256 JWKS)
- **Testing**: Jest (backend), Vitest (frontend), Playwright (E2E)
- **Build Tools**: pnpm, Turbopack

## Technical Design

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Frontend (Next.js 16)                                    │
│  ├── Dashboard: +YTD charts, +Pie chart                 │
│  ├── Time Entry: +Period dropdown, +Copy, +Vacation     │
│  ├── Charge Codes: +Drill-down, +Cascade, +Tree UX     │
│  ├── Approvals: Fix search                              │
│  ├── Reports: +Program/CostCenter/Person views          │
│  ├── Budget: +Multi-select, +Team breakdown             │
│  └── Layout: +RIS logo, +Profile photo, Fix session     │
├─────────────────────────────────────────────────────────┤
│ Backend (NestJS 11)                                      │
│  ├── /reports: +by-program, +by-cost-center, +by-person │
│  ├── /timesheets: +copy-period, +vacation-entry         │
│  ├── /charge-codes: +cascade-access, +request-access    │
│  ├── /budgets: +multi-filter, +team-breakdown           │
│  └── /dashboard: +ytd-chargeability, +distribution      │
├─────────────────────────────────────────────────────────┤
│ Database (Supabase PostgreSQL)                           │
│  ├── charge_code_requests (NEW)                         │
│  └── Indexes for 200-user scalability                   │
└─────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **New API endpoints over modifying existing** — เพิ่ม endpoint ใหม่สำหรับ report views แทนการแก้ไข endpoint เดิม เพื่อ backward compatibility
2. **Recharts for all new charts** — ใช้ Recharts ที่มีอยู่แล้ว (Budget vs Actual chart) สำหรับ trend graph, pie chart
3. **TanStack Query queryKey convention** — ใช้ `['reports', 'by-program', programId, period]` pattern
4. **Cascade access via backend transaction** — cascade ลง children ทั้งหมดใน single transaction
5. **Charge Code Request = new DB table** — ไม่ reuse notifications table เพราะมี approval workflow แยก
6. **Vacation hours = system charge code LEAVE-001** — employee กรอกเองได้เลย (ลบ approval requirement)
7. **Period dropdown = ISO week list** — แสดง 52 weeks ของปีปัจจุบัน + ปีก่อน
8. **RIS logo = SVG asset** — ใส่ใน `public/` และ import ใน layout

### Data Model

#### New Table: `charge_code_requests`
```sql
CREATE TABLE charge_code_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES profiles(id) NOT NULL,
  charge_code_id UUID REFERENCES charge_codes(id) NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Schema Change: `vacation_requests` — add `leave_type` (BUG-05 / Half-Day)
```sql
ALTER TABLE vacation_requests
ADD COLUMN leave_type TEXT NOT NULL DEFAULT 'full_day'
CHECK (leave_type IN ('full_day', 'half_am', 'half_pm'));
```

#### New Indexes for Scalability (CR-22)
```sql
CREATE INDEX idx_timesheet_entries_user_date ON timesheet_entries(user_id, date);
CREATE INDEX idx_timesheet_entries_charge_code ON timesheet_entries(charge_code_id);
CREATE INDEX idx_timesheets_period ON timesheets(period_start, period_end);
CREATE INDEX idx_charge_codes_parent ON charge_codes(parent_id);
CREATE INDEX idx_profiles_manager ON profiles(manager_id);
CREATE INDEX idx_profiles_department ON profiles(department);
```

### API / Interface Contracts

#### New Endpoints

```typescript
// CR-01/02/03: Dashboard YTD
GET /api/v1/dashboard/chargeability-ytd
  → { months: [{ month, chargeability, billableHours, totalHours }], ytdChargeability: number }

GET /api/v1/dashboard/program-distribution
  → { currentPeriod: [{ programName, programId, hours, percentage }], ytd: [...] }

// CR-05: Copy from last period
POST /api/v1/timesheets/:id/copy-from-previous
  → { entries: TimesheetEntry[] }

// CR-07: Request charge code access
POST /api/v1/charge-codes/:id/request-access
  Body: { reason: string }
  → { requestId, status: 'pending' }

GET /api/v1/charge-codes/access-requests
  → { requests: [{ id, requester, chargeCode, reason, status, createdAt }] }

PATCH /api/v1/charge-codes/access-requests/:id
  Body: { status: 'approved' | 'rejected' }
  → { request }

// CR-08/09: Charge code budget detail with team breakdown
GET /api/v1/charge-codes/:id/budget-detail
  → { budget, actual, children: [...], teamBreakdown: [{ team, hours, cost, percentage }], personBreakdown: [...] }

// CR-11: Cascade access
POST /api/v1/charge-codes/:id/cascade-access
  Body: { userIds: string[] }
  → { affected: number }

// CR-13: Report by Program
GET /api/v1/reports/by-program?programId=xxx&period=xxx
  → { program, budgetVsActual, taskDistribution: [...], teamDistribution: [...] }

// CR-14: Report by Cost Center
GET /api/v1/reports/by-cost-center?costCenter=xxx&period=xxx
  → { costCenter, chargeability, chargeDistribution: [...], nonChargeable }

// CR-15: Report by Person
GET /api/v1/reports/by-person?userId=xxx&period=xxx
  → { person, history: [...], projectSummary: [...], vacationDays, totalHours }

// CR-16/17: Budget multi-filter + team breakdown
GET /api/v1/budgets?chargeCodeIds=id1,id2,id3
  → { items: [...with teamBreakdown] }
```

## UX/UI Design

### Figma / Design Reference
No external design provided — ASCII wireframes below serve as the design spec. ผู้บริหาร review จาก screenshot ของระบบปัจจุบัน feedback ใน timesheet_CR1.pptx

### Wireframes

#### CR-01/02/03: Dashboard — New Charts Section
```
┌─────────────────────────────────────────────────────────┐
│ Dashboard                                                │
├─────────────────────────────────────────────────────────┤
│ [Hours: 32/40] [Chargeability: 85% YTD] [Pending: 3]   │ ← CR-01: เพิ่ม YTD ใน card
│ [Active CC: 5]                                           │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐ ┌──────────────────────────┐  │
│  │ Chargeability Trend   │ │ Program Distribution     │  │
│  │ (Line Chart YTD)      │ │ (Pie Chart)              │  │
│  │ ──────────/────        │ │     ┌──┐                 │  │
│  │          /              │ │  ┌──┤  ├──┐             │  │
│  │ ────────/               │ │  │  │  │  │             │  │
│  │ Jan Feb Mar Apr         │ │  └──┴──┴──┘             │  │
│  │                         │ │ ○ OMS 40% ○ CRM 30%    │  │ ← CR-02/03
│  └──────────────────────┘ └──────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│ [Toggle: Current Period | YTD]                           │ ← CR-03: สลับ view
└─────────────────────────────────────────────────────────┘
```

#### CR-04/05: Time Entry — Period Selection & Copy
```
┌─────────────────────────────────────────────────────────┐
│ Time Entry                                               │
├─────────────────────────────────────────────────────────┤
│ [< Week of Mar 17-21, 2026 >]                           │
│ [Period: ▼ Week 12 (Mar 17-21)] [Copy from Last Period] │ ← CR-04/05
├─────────────────────────────────────────────────────────┤
│ Charge Code    │ Mon │ Tue │ Wed │ Thu │ Fri │ Total    │
│ PRJ-001        │  4  │  8  │  8  │  8  │  8  │  36     │
│ OPS-002        │  4  │  0  │  0  │  0  │  0  │   4     │
│ LEAVE-001 🏖️   │  0  │  0  │  0  │  0  │  8  │   8     │ ← CR-06: vacation
├─────────────────────────────────────────────────────────┤
│ [+ Add Charge Code] [Request New CC ▲]                   │ ← CR-07
└─────────────────────────────────────────────────────────┘
```

#### CR-07: Request Charge Code Dialog
```
┌────────────────────────────────┐
│ Request Charge Code Access      │
├────────────────────────────────┤
│ Search: [____________]          │
│                                 │
│ ○ PRJ-002 CRM Platform         │
│   Owner: Nattaya K.             │
│ ○ PRJ-003 Data Analytics        │
│   Owner: Somchai P.             │
│                                 │
│ Reason: [Why do you need this?] │
│                                 │
│ [Cancel] [Send Request]         │
└────────────────────────────────┘
```

#### CR-08/09: Charge Code Budget Detail Panel
```
┌─────────────────────────────────────────────────────────┐
│ PRG-001 Digital Transformation                           │
│ Budget: ฿5,000,000 │ Actual: ฿3,200,000 (64%)          │
├─────────────────────────────────────────────────────────┤
│ [Overview] [Budget Detail ★] [Access]                   │ ← CR-08: new tab
├─────────────────────────────────────────────────────────┤
│ Budget Breakdown (Parent → Children)                     │
│ ┌─ PRJ-001 Platform Mod.  ฿2M / ฿3M  [████████░░] 67%│
│ │  ├─ ACT-001 Backend Dev ฿800K/฿1M  [████████░░] 80% │
│ │  └─ ACT-002 Frontend    ฿400K/฿1M  [████░░░░░░] 40% │
│ └─ PRJ-002 CRM            ฿1.2M/฿2M  [██████░░░░] 60%│
├─────────────────────────────────────────────────────────┤
│ Charging by Team                                  CR-09 │
│ ┌──────────┬────────┬──────┬─────┐                      │
│ │ Team     │ Hours  │ Cost │  %  │                      │
│ ├──────────┼────────┼──────┼─────┤                      │
│ │ Engineer │ 1,200h │ ฿2.4M│ 75% │ [▸ expand persons] │
│ │ BA       │  300h  │ ฿450K│ 14% │                      │
│ │ QA       │  200h  │ ฿280K│  9% │                      │
│ │ Others   │   50h  │ ฿70K │  2% │                      │
│ └──────────┴────────┴──────┴─────┘                      │
└─────────────────────────────────────────────────────────┘
```

#### CR-10: Improved Tree View
```
Before (hard to read):              After (aligned):
PRG-001 Digital Transform...        PRG-001  Digital Transformation  ฿5.0M
  PRJ-001 Platform Mod...             ├─ PRJ-001  Platform Mod.     ฿3.0M
    ACT-001 Backend Dev...            │  ├─ ACT-001  Backend Dev    ฿1.0M
  PRJ-002 CRM Platform...            │  └─ ACT-002  Frontend       ฿1.0M
                                      └─ PRJ-002  CRM Platform     ฿2.0M
```

#### CR-13/14/15: Report View Tabs
```
┌─────────────────────────────────────────────────────────┐
│ Reports & Analytics                                      │
├─────────────────────────────────────────────────────────┤
│ [By Program] [By Cost Center] [By Person] [Overview]    │ ← CR-13/14/15
├─────────────────────────────────────────────────────────┤
│ (Tab: By Program)                                        │
│ Program: [▼ Digital Transformation]  Period: [▼ Mar 26] │
│                                                          │
│ Budget vs Actual                                         │
│ ┌────────────────────────────┐                          │
│ │ █████████████ Budget ฿5M   │                          │
│ │ ████████░░░░░ Actual ฿3.2M │                          │
│ └────────────────────────────┘                          │
│                                                          │
│ Charging Distribution                                    │
│ By Task:          │ By Team:                             │
│ Backend Dev  45%  │ Engineer  75%                        │
│ Frontend     25%  │ BA        14%                        │
│ Testing      15%  │ QA         9%                        │
│ Other        15%  │ Other      2%                        │
└─────────────────────────────────────────────────────────┘
```

#### CR-16: Budget Multi-Select Filter
```
┌─────────────────────────────────────────────────────────┐
│ Budget Tracking                                          │
├─────────────────────────────────────────────────────────┤
│ Filter: [☑ PRG-001] [☑ PRG-002] [☐ PRG-003] [Clear]   │ ← CR-16
│ Showing 2 of 3 programs                                  │
└─────────────────────────────────────────────────────────┘
```

### Visual Style

- ใช้ color palette เดิมของระบบ (Tailwind teal/emerald primary)
- New charts ใช้สี: teal-500 (primary), amber-500 (warning), rose-500 (danger)
- Pie chart ใช้ palette: `['#0d9488', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6']`
- Tree view indent lines ใช้ `border-l-2 border-muted`
- RIS logo: ขนาด 32x32px ใน sidebar, สี original brand colors

### User Flow

**CR-07 Request CC Flow:**
Employee → Time Entry → "+ Request New CC" → Dialog → Search → Select → Enter reason → Submit → CC Owner receives notification → Approve/Reject → Employee gets notification → CC appears in dropdown

**CR-05 Copy from Last Period Flow:**
Employee → Time Entry → "Copy from Last Period" → System copies charge code rows (not hours) from previous week → Employee fills hours → Submit

## Relevant Files

### Existing Files to Modify

**Frontend:**
- `frontend/src/app/(authenticated)/page.tsx` — Dashboard: add YTD charts (CR-01/02/03)
- `frontend/src/app/(authenticated)/time-entry/page.tsx` — Period dropdown, copy, vacation (CR-04/05/06)
- `frontend/src/app/(authenticated)/charge-codes/page.tsx` — Budget detail, tree UX, cascade (CR-08/09/10/11)
- `frontend/src/app/(authenticated)/approvals/page.tsx` — Fix search (CR-12)
- `frontend/src/app/(authenticated)/reports/page.tsx` — Report view tabs (CR-13/14/15)
- `frontend/src/app/(authenticated)/budget/page.tsx` — Multi-select, team breakdown (CR-16/17)
- `frontend/src/app/(authenticated)/layout.tsx` — RIS logo, profile photo (CR-19/20)
- `frontend/src/lib/api.ts` — New API methods
- `frontend/src/components/reports/FinancialPL.tsx` — Update for new report data
- `frontend/src/components/charge-codes/AccessManager.tsx` — Cascade access UI

**Backend:**
- `backend/src/reports/reports.controller.ts` — New report endpoints (CR-13/14/15)
- `backend/src/reports/reports.service.ts` — Report by Program/CostCenter/Person
- `backend/src/timesheets/timesheets.controller.ts` — Copy period endpoint (CR-05)
- `backend/src/timesheets/timesheets.service.ts` — Copy logic, vacation entry (CR-05/06)
- `backend/src/charge-codes/charge-codes.controller.ts` — Request access, cascade (CR-07/11)
- `backend/src/charge-codes/charge-codes.service.ts` — Request/cascade logic
- `backend/src/budgets/budgets.controller.ts` — Multi-filter (CR-16)
- `backend/src/budgets/budgets.service.ts` — Team breakdown query (CR-17)
- `backend/src/approvals/approvals.service.ts` — Fix search (CR-12)
- `backend/src/database/schema/index.ts` — New table, indexes

### New Files

- `backend/src/database/schema/charge-code-requests.ts` — New table schema
- `backend/src/dashboard/dashboard.controller.ts` — YTD endpoints
- `backend/src/dashboard/dashboard.service.ts` — YTD chargeability, distribution
- `backend/src/dashboard/dashboard.module.ts` — Module definition
- `frontend/src/components/dashboard/ChargeabilityTrend.tsx` — Line chart component
- `frontend/src/components/dashboard/ProgramDistribution.tsx` — Pie chart component
- `frontend/src/components/time-entry/PeriodSelector.tsx` — Period dropdown
- `frontend/src/components/time-entry/RequestChargeCode.tsx` — Request CC dialog
- `frontend/src/components/charge-codes/BudgetDetail.tsx` — Budget drill-down tab
- `frontend/src/components/charge-codes/TeamBreakdown.tsx` — Team/person table
- `frontend/src/components/reports/ReportByProgram.tsx` — Program report view
- `frontend/src/components/reports/ReportByCostCenter.tsx` — Cost center view
- `frontend/src/components/reports/ReportByPerson.tsx` — Person report view
- `frontend/src/components/budget/MultiSelectFilter.tsx` — Multi-select chip filter
- `frontend/public/ris-logo.svg` — RIS logo asset
- `backend/drizzle/XXXX_charge_code_requests.sql` — Migration file

## Implementation Phases

### Phase 1: Foundation (Bug Fixes & Quick Wins)
- CR-12: Fix Approvals search functionality
- CR-18: Fix login session refresh bug
- CR-19: Add RIS logo to sidebar
- CR-20: Add profile photo to user avatar
- BUG-01: Fix avatar "U" fallback → derive from `profile.full_name`
- BUG-02: Remove "Active" badge (no `is_active` field) → show total count only or add field
- BUG-03: Fix status filter in Admin Users page → implement actual filtering
- BUG-04: Add E2E test cleanup (afterAll hooks to delete test data)
- DB migration: create `charge_code_requests` table + performance indexes

### Phase 2: Dashboard & Time Entry
- CR-01/02/03: Dashboard YTD chargeability + trend graph + pie chart
- CR-04: Period dropdown selector
- CR-05: Copy from last period
- CR-06: Vacation hours direct entry (remove approval requirement)
- CR-07: Request new charge code workflow

### Phase 3: Charge Codes & Reports
- CR-08/09: Budget detail drill-down + team/person breakdown
- CR-10: Tree view UX improvement (alignment, budget display)
- CR-11: Cascade access to child charge codes
- CR-13: Report by Program
- CR-14: Report by Cost Center
- CR-15: Report by Person

### Phase 4: Budget & System
- CR-16: Multi-select filter
- CR-17: Team breakdown detail
- CR-21: Chatbot (feasibility assessment + basic implementation)
- CR-22: Performance indexes + load testing

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- You're responsible for deploying the right team members with the right context to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to the building, validating, testing, deploying, and other tasks.
  - This is critical. You're job is to act as a high level director of the team, not a builder.
  - You're role is to validate all work is going well and make sure the team is on track to complete the plan.
  - You'll orchestrate this by using the Task* Tools to manage coordination between the team members.
  - Communication is paramount. You'll use the Task* Tools to communicate with the team members and ensure they're on track to complete the plan.
- Take note of the session id of each team member. This is how you'll reference them.

### Team Members

- Builder
  - Name: builder-fixes
  - Role: Bug fixes, quick wins, and infrastructure setup (CR-12, CR-18, CR-19, CR-20, DB migration, indexes)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-dashboard-timeentry
  - Role: Dashboard enhancements + Time Entry improvements (CR-01–07)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-chargecodes-reports
  - Role: Charge Code detail, tree UX, reports views (CR-08–15)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-budget-system
  - Role: Budget page enhancements + system/performance (CR-16, CR-17, CR-21, CR-22)
  - Agent Type: builder
  - Resume: true

- Code Reviewer
  - Name: reviewer-cr1
  - Role: Review and fix code quality, efficiency, and reuse issues after builders complete their work
  - Agent Type: code-reviewer
  - Resume: false

- Test Writer
  - Name: tester-cr1
  - Role: Write comprehensive automated tests for all 22 CRs — unit, frontend, and E2E
  - Agent Type: test-writer
  - Resume: false

- Docs Writer
  - Name: docs-cr1
  - Role: Update architecture docs, env-setup, troubleshooting, and PRD runbook
  - Agent Type: docs-writer
  - Resume: false

- Validator
  - Name: validator-cr1
  - Role: Final read-only validation that all acceptance criteria are met and all tests pass
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

- IMPORTANT: Execute every step in order, top to bottom. Each task maps directly to a `TaskCreate` call.
- Before you start, run `TaskCreate` to create the initial task list that all team members can see and execute.

### 1. Infra Verify & DB Migration
- **Task ID**: infra-verify
- **Depends On**: none
- **Assigned To**: builder-fixes
- **Agent Type**: builder
- **Parallel**: false
- Verify Supabase pooler connection works: `SELECT 1` via configured connection string
- Verify JWKS endpoint responds: `GET https://lchxtkiceeyqjksganwr.supabase.co/auth/v1/.well-known/jwks.json`
- Create Drizzle schema for `charge_code_requests` table in `backend/src/database/schema/charge-code-requests.ts`
- Export from `backend/src/database/schema/index.ts`
- Run `pnpm db:generate` and `pnpm db:push` to apply migration
- Add performance indexes (CR-22) via SQL migration for: `timesheet_entries(user_id, date)`, `timesheet_entries(charge_code_id)`, `timesheets(period_start, period_end)`, `charge_codes(parent_id)`, `profiles(manager_id)`, `profiles(department)`
- Verify migration success by querying the new table

### 2. Bug Fixes & Quick Wins (CR-12, CR-18, CR-19, CR-20)
- **Task ID**: bug-fixes
- **Depends On**: infra-verify
- **Assigned To**: builder-fixes
- **Agent Type**: builder
- **Parallel**: false
- **CR-12: Fix Approvals search** — Debug the search in `frontend/src/app/(authenticated)/approvals/page.tsx`. The search should filter pending approvals by employee name, email, or department. Test by typing "wichai" in search and verifying results filter correctly.
- **CR-18: Fix login session** — In `frontend/src/app/(authenticated)/layout.tsx` or `middleware.ts`, ensure that after logout + re-login, the user profile data refreshes without manual browser refresh. Likely need to invalidate TanStack Query cache on auth state change. Check `supabase.auth.onAuthStateChange()` handler.
- **CR-19: Add RIS logo** — Add RIS logo SVG to `frontend/public/ris-logo.svg`. Update sidebar in layout to show RIS logo alongside "Timesheet" text. Logo should be 32x32px.
- **CR-20: Add profile photo** — Update user avatar in topbar to show `profile.avatar_url` from Supabase auth. If no photo, show initials from `full_name`. Add avatar display in sidebar footer if collapsed.
- **BUG-01: Fix avatar "U" fallback** — In `layout.tsx:155-163`, change `getInitials()` to never return "U". If `full_name` is empty, return empty string or "?" — not a hardcoded letter. Also fix `avatarInitials` line 163 to use same logic.
- **BUG-02: Remove "Active" badge** — In `admin/users/page.tsx:153-157`, remove the "Active" stat card entirely (no `is_active` field exists in schema). Replace with "Total Users" count. Or: add `is_active` boolean to profiles schema + migration, then filter properly.
- **BUG-03: Fix Users status filter** — In `admin/users/page.tsx:101`, replace `matchesStatus = statusFilter === 'all'` with actual filtering logic. Since there's no `is_active` field, either: (a) remove the status filter dropdown entirely, or (b) add `is_active` to profiles schema and filter by it. Recommend option (a) for simplicity — remove the non-functional UI element.
- **BUG-04: E2E test cleanup** — Add `afterAll` hooks to all E2E test files that create data:
  - `charge-codes.spec.ts` — DELETE test charge codes matching "Test-Program-*"
  - `admin-rates.spec.ts` — DELETE test rates matching "L-TEST-*"
  - `workflow-approval.spec.ts` — DELETE test timesheets created during test
  - Use `page.request.delete()` or direct API calls in cleanup hooks

### 3. Dashboard Enhancements (CR-01, CR-02, CR-03)
- **Task ID**: dashboard-charts
- **Depends On**: infra-verify
- **Assigned To**: builder-dashboard-timeentry
- **Agent Type**: builder
- **Parallel**: true (can run alongside bug-fixes)
- **Backend: New Dashboard Module**
  - Create `backend/src/dashboard/dashboard.module.ts`, `dashboard.controller.ts`, `dashboard.service.ts`
  - Register in `app.module.ts`
  - **CR-01 endpoint**: `GET /dashboard/chargeability-ytd` — Query timesheet_entries joined with charge_codes (isBillable) grouped by month from Jan to current month. Return: `{ months: [{month, chargeability, billableHours, totalHours}], ytdChargeability }`
  - **CR-03 endpoint**: `GET /dashboard/program-distribution` — Query timesheet_entries joined with charge_codes hierarchy to get root program. Group hours by program. Return both current period and YTD. Return: `{ currentPeriod: [{programName, hours, percentage}], ytd: [...] }`
- **Frontend: Dashboard Components**
  - **CR-01**: Update Chargeability KPI card in `page.tsx` to show "85% YTD" instead of just current week
  - **CR-02**: Create `frontend/src/components/dashboard/ChargeabilityTrend.tsx` — Recharts LineChart showing monthly chargeability from Jan to current month. X-axis = months, Y-axis = chargeability %. Include 80% target line (dashed).
  - **CR-03**: Create `frontend/src/components/dashboard/ProgramDistribution.tsx` — Recharts PieChart showing hours distribution by program. Legend below with color dots + program name + percentage. Add toggle for "Current Period" vs "YTD".
  - Add both chart components to Dashboard page below KPI cards in a 2-column grid

### 4. Time Entry Improvements (CR-04, CR-05, CR-06, CR-07)
- **Task ID**: time-entry-improvements
- **Depends On**: infra-verify
- **Assigned To**: builder-dashboard-timeentry
- **Agent Type**: builder
- **Parallel**: false (depends on dashboard-charts completing first for same builder)
- **CR-04: Period Dropdown**
  - Create `frontend/src/components/time-entry/PeriodSelector.tsx` — Dropdown showing weeks as "Week 12 (Mar 17–21, 2026)". Generate list: current year + previous year (104 weeks). On select, navigate to that week's timesheet.
  - Add PeriodSelector next to existing week navigation arrows in Time Entry page
- **CR-05: Copy from Last Period**
  - Backend: Add `POST /timesheets/:id/copy-from-previous` to `timesheets.controller.ts` — Finds previous week's timesheet, copies its charge code rows (NOT hours) to current timesheet. Returns new entries with 0 hours.
  - Frontend: Add "Copy from Last Period" button in Time Entry page, next to Period Selector. On click, call API, then refetch entries. Show toast "Copied 3 charge codes from last week".
  - Button should be disabled if current timesheet already has entries or status is not 'draft'
- **CR-06 + BUG-05 + Half-Day Leave (consolidated)**
  - Ref: `specs/bug-vacation-day-input-not-blocked.md` + `specs/chore-improvements-half-day-leave-system-row.md`
  - **BUG-05 Fix: Block input on vacation days**
    - แก้ `TimesheetGrid.tsx:208`: เพิ่ม `isVacationDay` ใน disabled condition — `disabled={!canEdit || isSystemCode || isNonWorking || isVacationDay}`
    - Full-day vacation → disable ทุก cell ของวันนั้น (ยกเว้น LEAVE-001 system row)
    - Half-day vacation → ให้กรอกได้แต่ไม่เกิน 4h ในวันนั้น
    - Backend validation: reject entries > 0h ในวัน full-day vacation (server-side safety)
  - **Half-Day Leave Support (DB + API)**
    - เพิ่ม `leave_type` enum ใน `vacation_requests` table: `full_day`, `half_am`, `half_pm`
    - Migration: `ALTER TABLE vacation_requests ADD COLUMN leave_type TEXT DEFAULT 'full_day'`
    - อัพเดท vacation DTO + API endpoints ให้รับ/ส่ง `leaveType`
    - แก้ `autoFillLeaveEntries()`: map `full_day=8h`, `half_am=4h`, `half_pm=4h`
    - แก้ `validateMinimumHours()`: half-day leave = ต้อง log อีก 4h ที่เหลือ
    - แก้ `getWorkingDays()`: half-day vacation = count as 0.5 working days
  - **LEAVE-001 System Row UX**
    - ซ่อน LEAVE-001 จาก ChargeCodeSelector dropdown (ไม่ให้ user เพิ่มเอง)
    - Auto-show LEAVE-001 เป็น read-only row เมื่อมี approved vacation ในสัปดาห์
    - Style: background สีจาง `bg-purple-50/50`, badge "System - Leave", แสดง leave_type
  - **Calendar Page Update**
    - เพิ่ม radio สำหรับ leave_type: "Full Day", "Half Day (AM)", "Half Day (PM)" ในฟอร์มขอลา
    - Validation: half-day ต้อง startDate === endDate
  - **ผลสรุป**: Employee ไม่ต้องกรอก vacation hours เอง (auto-fill) + วันลาถูก block ไม่ให้กรอก CC อื่น + รองรับลาครึ่งวัน
- **CR-07: Request New Charge Code**
  - Backend: Add endpoints to `charge-codes.controller.ts`:
    - `POST /charge-codes/:id/request-access` — Creates a record in `charge_code_requests` table, sends notification to CC Owner
    - `GET /charge-codes/access-requests` — For CC owners/admins: list pending requests
    - `PATCH /charge-codes/access-requests/:id` — Approve/reject (on approve, auto-add user to `charge_code_users`)
  - Frontend: Create `frontend/src/components/time-entry/RequestChargeCode.tsx`:
    - Button "+ Request New CC" in Time Entry sticky bar
    - Dialog: search all charge codes (not just assigned), show CC owner name
    - Reason textarea (required)
    - Submit sends request → toast "Request sent to [owner name]"
  - Add notification to CC Owner when request arrives (use existing notifications table)

### 5. Charge Code Budget Detail & Tree UX (CR-08, CR-09, CR-10, CR-11)
- **Task ID**: charge-code-enhancements
- **Depends On**: infra-verify
- **Assigned To**: builder-chargecodes-reports
- **Agent Type**: builder
- **Parallel**: true (can run alongside dashboard-charts and bug-fixes)
- **CR-08: Budget Drill-Down**
  - Backend: Add `GET /charge-codes/:id/budget-detail` to controller — Returns hierarchical budget vs actual for the CC and all its children (recursive CTE query). Include: budget, actual, variance, percentage per child.
  - Frontend: Create `frontend/src/components/charge-codes/BudgetDetail.tsx` — New tab "Budget Detail" in charge code detail panel (right side). Show tree of children with budget bars (like budget page but scoped to this CC). Expandable rows with progress bars color-coded by severity.
- **CR-09: Team/Person Breakdown**
  - Backend: Extend budget-detail endpoint to include `teamBreakdown` (group by `profiles.department`) and `personBreakdown` (group by `profiles.id`). Each entry: `{ name, hours, cost, percentage }`.
  - Frontend: Create `frontend/src/components/charge-codes/TeamBreakdown.tsx` — Table below the budget hierarchy showing teams + expandable rows for individual persons. Columns: Team/Person, Hours, Cost (฿), Percentage (%).
- **CR-10: Tree View UX**
  - Modify charge codes page tree panel:
    - Use monospace font for CC ID column (fixed width alignment)
    - Right-align budget amounts with consistent formatting (฿X.XM)
    - Add tree connector lines using `border-l-2 border-muted` + `border-b-2` for each level
    - Increase indent spacing from current to 24px per level
    - Show budget amount inline: `PRG-001  Digital Transformation  ฿5.0M`
    - Add subtle background stripes for alternating rows
- **CR-11: Cascade Access**
  - Backend: Add `POST /charge-codes/:id/cascade-access` — In a transaction: find all descendant charge codes (recursive CTE), add `userIds` to `charge_code_users` for each (skip duplicates via ON CONFLICT DO NOTHING).
  - Frontend: In AccessManager component, add checkbox "Also add to all child charge codes" when adding users. When checked, call cascade endpoint instead of single-add endpoint.

### 6. Report Views (CR-13, CR-14, CR-15)
- **Task ID**: report-views
- **Depends On**: charge-code-enhancements
- **Assigned To**: builder-chargecodes-reports
- **Agent Type**: builder
- **Parallel**: false (same builder, sequential)
- **CR-13: Report by Program**
  - Backend: Add `GET /reports/by-program` to reports controller. Parameters: `programId`, `period` (YYYY-MM). Query: join timesheet_entries with charge_codes hierarchy filtered to program's subtree. Return: `{ program, budgetVsActual: {budget, actual, variance}, taskDistribution: [{taskName, hours, cost, %}], teamDistribution: [{team, hours, cost, %}] }`
  - Frontend: Create `frontend/src/components/reports/ReportByProgram.tsx`:
    - Program selector dropdown + Period selector
    - Budget vs Actual bar chart (Recharts)
    - Two columns: Task Distribution table (left) + Team Distribution table (right)
    - Each table: Name, Hours, Cost, %
- **CR-14: Report by Cost Center**
  - Backend: Add `GET /reports/by-cost-center` — Query by `profiles.department` (maps to cost center). Return chargeability of all team members in that cost center. Breakdown: hours by program (chargeable vs non-chargeable).
  - Frontend: Create `frontend/src/components/reports/ReportByCostCenter.tsx`:
    - Cost Center dropdown (populated from distinct `profiles.department`)
    - Overall chargeability gauge (reuse ChargeabilityGauge component)
    - Charge Distribution bar chart: program names on Y-axis, hours on X-axis, color = chargeable/non-chargeable
    - Team member table: Name, Billable Hours, Total Hours, Chargeability %
- **CR-15: Report by Person**
  - Backend: Add `GET /reports/by-person` — Query all timesheet_entries for a user across all periods. Group by charge code (→ program). Include vacation days count.
  - Frontend: Create `frontend/src/components/reports/ReportByPerson.tsx`:
    - Person selector (search by name) + Period range (from/to month)
    - Summary cards: Total Hours, Billable Hours, Chargeability %, Vacation Days
    - Charge History timeline (month-by-month stacked bar chart: hours per program)
    - Project Summary table: Project Name, Hours YTD, Cost YTD, % of Total
- **Reports Page Tabs**: Add tab navigation to Reports page: `[Overview] [By Program] [By Cost Center] [By Person]`. Default to Overview (current view). Each tab renders corresponding component.

### 7. Budget Page Enhancements (CR-16, CR-17)
- **Task ID**: budget-enhancements
- **Depends On**: infra-verify
- **Assigned To**: builder-budget-system
- **Agent Type**: builder
- **Parallel**: true (can run alongside other builders)
- **CR-16: Multi-Select Filter**
  - Create `frontend/src/components/budget/MultiSelectFilter.tsx`:
    - Chip-style multi-select with checkboxes for programs/charge codes
    - "Select All" / "Clear" buttons
    - Show count: "Showing 2 of 5 programs"
  - Modify Budget page: replace single filter with MultiSelectFilter
  - Backend: Modify `GET /budgets` to accept `chargeCodeIds` as comma-separated query param for filtering
- **CR-17: Team Breakdown in Budget**
  - Backend: Extend budget items response to include `topTeams: [{team, hours, cost, percentage}]` (top 5 teams by cost)
  - Frontend: Add expandable "Team Breakdown" section under each budget row when expanded. Show: Team Name, Hours, Cost, % of Total. Example: "Engineer 80% | BA 14% | QA 6%"

### 8. System & Performance (CR-21, CR-22)
- **Task ID**: system-performance
- **Depends On**: budget-enhancements
- **Assigned To**: builder-budget-system
- **Agent Type**: builder
- **Parallel**: false (same builder, sequential)
- **CR-22: Scalability** — Verify indexes are created (from step 1). Add `LIMIT` and pagination to all list endpoints that could return large datasets:
  - `GET /charge-codes` — add `limit=100&offset=0` support
  - `GET /timesheets/entries` — already scoped to week, OK
  - `GET /reports/*` — add date range limits (max 12 months)
  - Add `EXPLAIN ANALYZE` test for key queries with 200 users / 100 projects dataset
- **CR-21: In-App Chat Widget (Phase 1 — ไม่พึ่ง Microsoft Teams)**
  - **สถานะปัจจุบัน**: Backend มี `TeamsBotService` พร้อมแล้ว + endpoint `POST /integrations/teams/message` รองรับ: log time, query timesheet, query budget, query charge codes, help
  - **Phase 1 (ทำรอบนี้): In-App Chat Widget**
    1. **Frontend Chat UI** — เพิ่ม floating chat button (bottom-right corner) ใน layout
       - คลิกแล้วเปิด chat panel (slide-up หรือ popover)
       - แสดง chat messages แบบ bubble (user ขวา, bot ซ้าย)
       - Input field + send button
       - Suggested actions แสดงเป็น clickable chips ใต้ bot message
       - เรียก `POST /api/v1/integrations/teams/message` (authenticated — ใช้ Bearer token ที่มีอยู่)
    2. **NLP Enhancement** — ปรับ `parseTimeEntry()` ให้รองรับภาษาไทย:
       - "ลง 4 ชม. PRJ-042 วันนี้" → parse ได้
       - "กรอกเวลา 8h OMS เมื่อวาน" → parse ได้
       - "เวลาวันนี้เท่าไหร่" → แสดงสรุปชั่วโมง
    3. **Validation** — เพิ่ม: ตรวจสอบ user มี access CC ก่อน log, ตรวจสอบ vacation days, ตรวจสอบ timesheet status (ไม่ให้ log ถ้า submitted/locked)
  - **Phase 2 (อนาคต — รอ IT confirm)**: Microsoft Teams Bot integration (Azure Bot Service, tenant approval, user mapping)
  - **Ref**: `backend/src/integrations/teams-bot.service.ts`, `backend/src/integrations/integrations.controller.ts`
  - **New files**: `frontend/src/components/layout/ChatWidget.tsx`, `frontend/src/components/layout/ChatBubble.tsx`

### 9. Code Review
- **Task ID**: code-review
- **Depends On**: bug-fixes, dashboard-charts, time-entry-improvements, charge-code-enhancements, report-views, budget-enhancements, system-performance
- **Assigned To**: reviewer-cr1
- **Agent Type**: code-reviewer
- **Parallel**: false
- Review all files created/modified by all 4 builders for quality, efficiency, reuse, and accessibility issues
- Check for: duplicate code across new components, proper error handling, loading states, TanStack Query patterns (params inside queryFn), no hardcoded values, proper TypeScript types
- Verify no MOCK data, no placeholder strings, no TODO comments left in production code
- Fix all issues found directly
- Report what was fixed and what was skipped

### 10. Write Tests
- **Task ID**: write-tests
- **Depends On**: code-review
- **Assigned To**: tester-cr1
- **Agent Type**: test-writer
- **Parallel**: false
- Write comprehensive automated tests for all 22 CRs implemented code
- Cover: correctness, edge cases, error paths, data integrity
- Run all tests and ensure they pass
- **MANDATORY: Save test results to `docs/test-results/`** with this structure:
  ```
  docs/test-results/
  ├── test-cases.csv             # 12-column QA format
  ├── test-cases.md              # Grouped by Section
  ├── summary.md
  ├── backend/
  │   ├── unit-results.json
  │   └── unit-results.md
  ├── frontend/
  │   ├── unit-results.json
  │   └── unit-results.md
  ├── e2e/
  │   ├── e2e-results.json
  │   └── e2e-results.md
  └── screenshots/
      └── <test-id>-<step>--desktop.png
  ```
- **File naming rules**: kebab-case, double-dash before viewport
- Configure test runners to output JSON
- Write `docs/test-results/test-cases.csv` with 12 columns: ID, Title, Type, Section, Priority, Preconditions, Steps, Expected Result, Test Data, File, Status, Notes
- Write `docs/test-results/test-cases.md` grouped by Section
- Write `docs/test-results/summary.md` with pass/fail counts and date
- Report coverage areas and results

### 11. Update Docs
- **Task ID**: update-docs
- **Depends On**: write-tests
- **Assigned To**: docs-cr1
- **Agent Type**: docs-writer
- **Parallel**: false
- Update `docs/prd-runbook.md` with new features (CR-01 through CR-22)
- Update `docs/architecture.md` with new modules (Dashboard module, charge_code_requests table)
- Update `docs/api-reference.md` with new endpoints
- Update `docs/env-setup.md` if new env vars added
- Update `docs/troubleshooting.md` with CR-18 login session fix
- Create `docs/chatbot-roadmap.md` for CR-21 future plans
- **IMPORTANT**: Verify every internal link resolves to an existing file
- Report the documentation created or modified

### 12. Validate Final Output
- **Task ID**: validate-all
- **Depends On**: code-review, write-tests, update-docs
- **Assigned To**: validator-cr1
- **Agent Type**: validator
- **Parallel**: false
- Run all validation commands
- Run all automated tests (backend unit, frontend unit, E2E)
- Verify acceptance criteria met for all 22 CRs
- **Verify all documentation links**: Check every file referenced in docs/README.md actually exists
- **Verify runtime**: Start backend + frontend, curl key new endpoints for HTTP 200
- Verify screenshot evidence exists for every E2E `Snap:` line

### 13. Heal Failures (if any)
- **Task ID**: heal
- **Depends On**: validate-all
- **Assigned To**: team-lead (you)
- **Parallel**: false
- **Max Retries**: 2
- Only run this step if step 12 (validate-all) has failures
- Run: `python3 .claude/skills/validate/validate.py --json timesheet-cr1-executive-feedback`
- Parse the JSON output — each failure has a `heal` field
- Route each failure to the correct agent per Healing Rules
- After all fixes, re-run validation
- If still failing after 2 retries, stop and report remaining failures to the user

## Pipeline

Every plan follows this mandatory execution pipeline:

```
Infra Verify → Build (4 builders parallel) → Code Review → Write Tests (unit + E2E) → Update Docs → Validate (real runtime) → Heal (if needed) → Re-validate
```

- **Infra Verify**: Verify Supabase connection + create DB migration + indexes
- **Build**: 4 builders work in parallel on their assigned CRs
- **Code Review**: Single code-reviewer reviews all changes
- **Write Tests**: test-writer creates unit + frontend + E2E tests for all 22 CRs
- **Update Docs**: docs-writer updates all documentation
- **Validate Final**: validator confirms everything works at runtime
- **Heal**: Route failures to correct agents, max 2 retries

## Acceptance Criteria

IMPORTANT: Every feature criterion MUST have a `Verified by:` line linking to specific test IDs. Criteria without test coverage are NOT considered complete.

### Feature Criteria

#### Slide 1 — Dashboard
- [ ] CR-01: Dashboard KPI card แสดง % Chargeability YTD (ไม่ใช่แค่สัปดาห์ปัจจุบัน)
      Verified by: E2E-DASH-01, UNIT-DASH-01

- [ ] CR-02: Dashboard มี Chargeability trend graph แบบ line chart แสดงรายเดือน YTD พร้อมเส้น target 80%
      Verified by: E2E-DASH-02, UNIT-DASH-02

- [ ] CR-03: Dashboard มี Pie chart แสดง distribution ของ program ที่ user charge to สลับได้ระหว่าง Current Period กับ YTD
      Verified by: E2E-DASH-03, UNIT-DASH-03

#### Slide 2 — Time Entry
- [ ] CR-04: Time Entry มี dropdown เลือก Period (week) ได้ แทนที่จะกดลูกศรทีละสัปดาห์
      Verified by: E2E-TE-01

- [ ] CR-05: Time Entry มีปุ่ม "Copy from Last Period" ที่ copy charge code rows (ไม่ copy ชั่วโมง) จากสัปดาห์ก่อน
      Verified by: E2E-TE-02, UNIT-TS-01

- [ ] CR-06: LEAVE-001 auto-fill สำหรับ approved vacation (ไม่ต้องกรอกเอง, ไม่ต้อง approve ซ้ำ)
      Verified by: E2E-TE-03

- [ ] BUG-05: วัน full-day vacation ต้อง disable input ของ charge code อื่นทุกตัว
      Verified by: E2E-TE-06

- [ ] CHORE-01: รองรับลาครึ่งวัน (half_am / half_pm) — auto-fill 4h + ให้กรอกอีก 4h ที่เหลือ
      Verified by: E2E-TE-07, UNIT-TS-02

- [ ] CHORE-02: LEAVE-001 ซ่อนจาก dropdown, แสดงเป็น system row อัตโนมัติ, style แตกต่างจาก CC ปกติ
      Verified by: E2E-TE-03

- [ ] CR-07: Employee สามารถ request access charge code ใหม่ได้ โดยระบุเหตุผล → CC Owner ได้รับ notification → approve/reject
      Verified by: E2E-TE-04, E2E-TE-05 (negative: request without reason)

#### Slide 3 — Charge Code & Budget
- [ ] CR-08: Charge Code detail panel มี "Budget Detail" tab แสดง breakdown Budget vs Actual ของ parent และ children
      Verified by: E2E-CC-01, UNIT-CC-01

- [ ] CR-09: Budget Detail tab แสดง team breakdown (department) และ person breakdown ว่าใคร charge เท่าไหร่
      Verified by: E2E-CC-02

- [ ] CR-10: Tree view panel ซ้ายอ่านง่ายขึ้น — hierarchy ชัดเจน, ตัวเลข align, มี connector lines
      Verified by: E2E-CC-03

- [ ] CR-11: เพิ่มตัวเลือก cascade access ไปยัง child charge codes ทั้งหมดเมื่อเพิ่มผู้ใช้
      Verified by: E2E-CC-04, UNIT-CC-02

#### Known Bugs
- [ ] BUG-01: Avatar ไม่แสดง "U" อีกต่อไป — แสดง initials จริงจาก full_name หรือ empty state
      Verified by: E2E-SYS-03 (profile avatar check)

- [ ] BUG-02: หน้า Admin Users ไม่แสดง "Active" badge ที่ hardcoded — แสดงจำนวนจริงหรือลบออก
      Verified by: E2E-BUG-01

- [ ] BUG-03: Status filter ในหน้า Admin Users ถูกลบหรือทำงานได้จริง
      Verified by: E2E-BUG-01

- [ ] BUG-04: E2E tests มี cleanup hooks — ไม่ทิ้ง "Test-Program-*", "L-TEST-*" ใน DB หลังรัน
      Verified by: UNIT-E2E-CLEANUP-01

- [ ] BUG-05: วัน full-day vacation ต้อง disable input ของ charge code อื่นทั้ง frontend + backend validation
      Verified by: E2E-TE-06, UNIT-TS-03

#### Slide 4 — Approvals
- [ ] CR-12: Search ในหน้า Approvals ทำงานได้ — ค้นหาด้วยชื่อ, อีเมล, หรือ department ได้
      Verified by: E2E-AP-01

#### Slide 5 — Reports
- [ ] CR-13: หน้า Reports มี tab "By Program" แสดง Budget vs Actual, Charging Distribution by Task และ Team
      Verified by: E2E-RPT-01

- [ ] CR-14: หน้า Reports มี tab "By Cost Center" แสดง Chargeability ของทีม, Charge Distribution ว่า charge ไปโปรแกรมไหน
      Verified by: E2E-RPT-02

- [ ] CR-15: หน้า Reports มี tab "By Person" แสดงประวัติ charge ย้อนหลัง, สรุปเวลาแต่ละ project/vacation
      Verified by: E2E-RPT-03

#### Slide 6 — Budget
- [ ] CR-16: Budget page มี multi-select filter เลือกหลาย program/charge code พร้อมกัน
      Verified by: E2E-BUD-01

- [ ] CR-17: Budget page แสดง team breakdown ว่า actual ถูก charge โดยทีมไหน (expand row to see top teams)
      Verified by: E2E-BUD-02

#### Slide 7 — General
- [ ] CR-18: หลัง logout แล้ว re-login ด้วยชื่ออื่น ข้อมูลอัพเดทโดยไม่ต้อง refresh browser
      Verified by: E2E-SYS-01

- [ ] CR-19: Sidebar แสดง RIS logo
      Verified by: E2E-SYS-02

- [ ] CR-20: User avatar แสดงรูป profile photo (หรือ initials ถ้าไม่มีรูป)
      Verified by: E2E-SYS-03

- [ ] CR-21: มี in-app chat widget ที่ employee พิมพ์ natural language แล้วระบบ log timesheet ให้ (ผ่าน Teams Bot Service)
      Verified by: E2E-SYS-04, UNIT-BOT-01

- [ ] CR-22: ระบบมี performance indexes และ pagination สำหรับ list endpoints
      Verified by: UNIT-PERF-01

### E2E Test Specifications (MANDATORY for UI projects)

#### E2E-DASH-01: Dashboard แสดง Chargeability YTD
```
E2E-DASH-01: Dashboard แสดง % Chargeability YTD ใน KPI card
  Role: employee (wichai.s@central.co.th)
  Page: /

  Step 1: เปิดหน้า Dashboard
    Pre-check: sidebar แสดงเมนู Dashboard
    Action: คลิกเมนู Dashboard (หน้าแรก)
    Post-check: หน้า Dashboard โหลดสำเร็จ, greeting แสดงชื่อผู้ใช้
    Snap: "dashboard-loaded"

  Step 2: ตรวจสอบ Chargeability KPI card
    Pre-check: มี KPI cards 4 ใบแสดงอยู่
    Action: อ่านค่าใน Chargeability card
    Post-check: card แสดง "% YTD" (มีคำว่า YTD) พร้อมตัวเลข percentage
    Snap: "chargeability-ytd-card"

  Step 3: ตรวจสอบข้อมูลตรงกับ API
    Action: GET /api/v1/dashboard/chargeability-ytd
    Post-check: response มี ytdChargeability เป็นตัวเลข >= 0 และ <= 100

  Negative: ไม่มี — card แสดงค่า 0% ถ้าไม่มีข้อมูล
```

#### E2E-DASH-02: Dashboard Chargeability Trend Graph
```
E2E-DASH-02: Dashboard แสดง Chargeability trend graph YTD
  Role: employee (wichai.s@central.co.th)
  Page: /

  Step 1: เปิดหน้า Dashboard
    Action: Navigate to /
    Post-check: Dashboard โหลดสำเร็จ

  Step 2: ตรวจสอบ Chargeability Trend chart
    Pre-check: ส่วน charts ด้านล่าง KPI cards
    Action: มองหา chart ที่มีชื่อ "Chargeability Trend"
    Post-check: Line chart ปรากฏ, มีแกน X (เดือน) และแกน Y (%), มีเส้น target 80% (dashed)
    Snap: "chargeability-trend-chart"
```

#### E2E-DASH-03: Dashboard Program Distribution Pie Chart
```
E2E-DASH-03: Dashboard แสดง Pie chart distribution ของ program
  Role: employee (wichai.s@central.co.th)
  Page: /

  Step 1: เปิดหน้า Dashboard
    Action: Navigate to /
    Post-check: Dashboard โหลดสำเร็จ

  Step 2: ตรวจสอบ Program Distribution chart
    Pre-check: ส่วน charts ด้านล่าง KPI cards
    Action: มองหา chart "Program Distribution"
    Post-check: Pie chart ปรากฏ พร้อม legend แสดงชื่อ program + percentage
    Snap: "program-distribution-chart"

  Step 3: สลับระหว่าง Current Period กับ YTD
    Pre-check: มี toggle button "Current Period" / "YTD"
    Action: คลิก "YTD"
    Post-check: Pie chart อัพเดทข้อมูล, label เปลี่ยนเป็น "YTD"
    Snap: "program-distribution-ytd"
```

#### E2E-TE-01: Time Entry Period Dropdown
```
E2E-TE-01: Time Entry มี Period dropdown เลือกสัปดาห์ได้
  Role: employee (wichai.s@central.co.th)
  Page: /time-entry

  Step 1: เปิดหน้า Time Entry
    Action: คลิกเมนู Time Entry
    Post-check: หน้า Time Entry โหลด, grid แสดงสัปดาห์ปัจจุบัน
    Snap: "time-entry-loaded"

  Step 2: คลิก Period dropdown
    Pre-check: มี dropdown ข้างปุ่มลูกศร < >
    Action: คลิก dropdown "Period"
    Post-check: แสดงรายการสัปดาห์ เช่น "Week 12 (Mar 17–21, 2026)", "Week 11 (Mar 10–14, 2026)"
    Snap: "period-dropdown-open"

  Step 3: เลือกสัปดาห์ก่อนหน้า
    Action: เลือก "Week 11 (Mar 10–14, 2026)"
    Post-check: grid อัพเดทแสดงข้อมูลของสัปดาห์ที่เลือก, header เปลี่ยนเป็น "Week of Mar 10–14"
    Snap: "period-changed"
```

#### E2E-TE-02: Copy from Last Period
```
E2E-TE-02: Copy charge codes จากสัปดาห์ก่อนหน้า
  Role: employee (wichai.s@central.co.th)
  Page: /time-entry

  Step 1: ไปที่สัปดาห์ที่ยังว่าง (draft, ไม่มี entries)
    Pre-check: timesheet สถานะ Draft, ไม่มี charge code rows ใน grid
    Action: Navigate ไปสัปดาห์ที่ยังว่าง
    Post-check: grid ว่าง แสดงเฉพาะ "Add Charge Code"

  Step 2: คลิก "Copy from Last Period"
    Pre-check: ปุ่มแสดงอยู่ (enabled เพราะ grid ว่างและสัปดาห์ก่อนมี entries)
    Action: คลิก "Copy from Last Period"
    Post-check: charge code rows จากสัปดาห์ก่อนปรากฏใน grid (ชั่วโมงเป็น 0 ทั้งหมด), toast "Copied N charge codes from last week"
    Snap: "after-copy"

  Step 3: ตรวจสอบว่าชั่วโมงเป็น 0
    Action: ตรวจสอบทุกช่องใน grid
    Post-check: ทุกช่องแสดง 0 หรือว่าง (ไม่ copy ชั่วโมงจากสัปดาห์ก่อน)

  Negative: กด Copy เมื่อ grid มี entries อยู่แล้ว
    Step: เพิ่ม charge code 1 รายการ → กด "Copy from Last Period"
    Post-check: ปุ่ม disabled หรือ toast "Cannot copy — timesheet already has entries"
    Snap: "copy-disabled"
```

#### E2E-TE-03: LEAVE-001 Auto-Fill & System Row
```
E2E-TE-03: LEAVE-001 แสดงเป็น system row อัตโนมัติเมื่อมี approved vacation
  Role: employee (wichai.s@central.co.th)
  Page: /time-entry

  Step 1: เปิดหน้า Time Entry (สัปดาห์ที่มี approved vacation)
    Pre-check: Wichai มี approved vacation อย่างน้อย 1 วันในสัปดาห์นี้
    Action: คลิก Time Entry
    Post-check: grid แสดงสัปดาห์ปัจจุบัน, มี LEAVE-001 row ปรากฏอัตโนมัติ (ไม่ต้องเพิ่มเอง)
    Snap: "leave-system-row-visible"

  Step 2: ตรวจสอบ LEAVE-001 row style
    Action: ดู LEAVE-001 row ใน grid
    Post-check: (1) background สีจางกว่า row ปกติ (purple tint), (2) มี badge "System", (3) ชั่วโมง auto-fill 8h ในวันลา, (4) cell เป็น read-only (ไม่ให้แก้ไข)
    Snap: "leave-row-styled"

  Step 3: ตรวจสอบว่า LEAVE-001 ไม่อยู่ใน dropdown
    Action: คลิก "+ Add Charge Code"
    Post-check: LEAVE-001 ไม่ปรากฏในรายการ dropdown (ซ่อนจาก user)
    Snap: "leave-hidden-from-dropdown"

  Step 4: Submit ได้ปกติ
    Pre-check: ทุกวัน weekday มีชั่วโมงครบ 8h (รวม LEAVE-001)
    Action: คลิก Submit
    Post-check: สถานะเปลี่ยนเป็น Submitted
```

#### E2E-TE-06: Vacation Day Blocks Input on Other Charge Codes
```
E2E-TE-06: วัน vacation ต้อง disable input ของ charge code อื่น
  Role: employee (wichai.s@central.co.th)
  Page: /time-entry

  Step 1: เปิดสัปดาห์ที่มี approved vacation วันพฤหัสบดี
    Pre-check: Wichai มี approved full-day vacation วัน Thu
    Action: เปิด Time Entry → ไปสัปดาห์ที่มีลา
    Post-check: LEAVE-001 row แสดงอัตโนมัติ, Thu column มี 8h ใน LEAVE-001

  Step 2: พยายามกรอก hours ใน charge code อื่นวันพฤหัสบดี
    Pre-check: มี charge code อื่น (เช่น DEPT-SCM) ใน grid
    Action: คลิกช่อง DEPT-SCM / Thu
    Post-check: ช่อง disabled ไม่สามารถพิมพ์ได้, แสดง tooltip "On vacation" หรือ visual indicator สีจาง
    Snap: "vacation-day-blocked"

  Step 3: วันอื่นยังกรอกได้ปกติ
    Action: คลิกช่อง DEPT-SCM / Wed → พิมพ์ 8
    Post-check: กรอกได้สำเร็จ, แสดง 8h
    Snap: "non-vacation-day-ok"

  Step 4: ตรวจสอบ server-side validation
    Action: ลอง POST entry ผ่าน API สำหรับ DEPT-SCM วัน Thu (bypass frontend)
    Post-check: API reject entry (400 Bad Request หรือ ignore entry)

  Negative: ไม่สามารถ bypass ได้ทั้ง frontend และ backend
```

#### E2E-TE-07: Half-Day Leave Support
```
E2E-TE-07: รองรับลาครึ่งวัน (half-day AM/PM)
  Role: admin (tachongrak@central.co.th) → employee (wichai.s@central.co.th)
  Page: /calendar → /time-entry

  Step 1: [Admin] สร้าง half-day vacation สำหรับ Wichai
    Action: [admin] ไป Admin → Calendar → สร้าง vacation request สำหรับ Wichai: วันศุกร์ถัดไป, leave_type = "Half Day (AM)"
    Post-check: request สร้างสำเร็จ
    Snap: "half-day-request-created"

  Step 2: [Admin] อนุมัติ vacation
    Action: คลิก Approve ใน Pending Vacation Requests
    Post-check: สถานะเปลี่ยนเป็น Approved
    Snap: "half-day-approved"

  Step 3: [Employee] ตรวจสอบ LEAVE-001 แสดง 4h
    Action: [wichai.s] ไป Time Entry → สัปดาห์ที่มีลาครึ่งวัน
    Post-check: LEAVE-001 row แสดง 4h (ไม่ใช่ 8h) ในวันศุกร์, description แสดง "Annual Leave (AM)"
    Snap: "half-day-4h-autofill"

  Step 4: [Employee] กรอกอีก 4h ที่เหลือได้
    Pre-check: ช่อง charge code อื่นวันศุกร์ยังกรอกได้ (ไม่ block เพราะเป็นแค่ครึ่งวัน)
    Action: กรอก DEPT-SCM / Fri = 4h
    Post-check: กรอกสำเร็จ, daily total = 8h (4h leave + 4h work)
    Snap: "half-day-remaining-filled"

  Step 5: Submit ผ่าน minimum hours check
    Action: กรอก hours ครบทุกวัน → คลิก Submit
    Post-check: submit สำเร็จ ไม่มี "Incomplete Hours" dialog (ระบบนับ half-day leave = 4h ต่อ 8h target)

  Negative: กรอกเกิน 4h ในวันลาครึ่งวัน
    Step: [Employee] กรอก DEPT-SCM / Fri = 6h (รวม LEAVE 4h = 10h เกิน 8h)
    Post-check: validation warning "Total exceeds 8h on Fri (4h leave + 6h work)" หรือ system อนุญาตแต่แสดง warning
    Snap: "half-day-excess-warning"
```

#### E2E-TE-04: Request New Charge Code
```
E2E-TE-04: Employee ส่ง request ขอ access charge code ใหม่
  Role: employee (wichai.s@central.co.th)
  Page: /time-entry

  Step 1: คลิก "Request New CC"
    Pre-check: ปุ่ม "Request New CC" อยู่ข้าง "+ Add Charge Code"
    Action: คลิก "Request New CC"
    Post-check: dialog เปิดขึ้น มี search box และช่อง reason
    Snap: "request-dialog-open"

  Step 2: ค้นหา charge code ที่ต้องการ
    Action: พิมพ์ "CRM" ในช่อง search
    Post-check: แสดงรายการ charge codes ที่ตรง เช่น "PRJ-002 CRM Platform" พร้อมชื่อ Owner
    Snap: "search-results"

  Step 3: เลือก charge code และกรอกเหตุผล
    Action: เลือก PRJ-002 → พิมพ์เหตุผล "Need to log hours for CRM integration work"
    Post-check: ปุ่ม "Send Request" เป็น enabled

  Step 4: ส่ง request
    Action: คลิก "Send Request"
    Post-check: dialog ปิด, toast "Request sent to [ชื่อ Owner]"
    Snap: "request-sent"

  Step 5: ตรวจสอบ API
    Action: GET /api/v1/charge-codes/access-requests
    Post-check: มี request สถานะ 'pending' สำหรับ PRJ-002

  Negative: ส่ง request โดยไม่กรอกเหตุผล
    Step: เลือก charge code → ปล่อยช่อง reason ว่าง → คลิก "Send Request"
    Post-check: validation error "กรุณาระบุเหตุผล" ปรากฏ
    Snap: "reason-required-error"
```

#### E2E-TE-05: CC Owner อนุมัติ access request
```
E2E-TE-05: CC Owner อนุมัติ charge code access request
  Role: admin (tachongrak@central.co.th) → then employee (wichai.s@central.co.th)
  Page: /charge-codes

  Step 1: [Admin] ดู pending access requests
    Pre-check: มี request จาก E2E-TE-04 รออนุมัติ
    Action: ไปที่ Charge Codes → เลือก PRJ-002 → แท็บ Access
    Post-check: แสดงรายการ "Pending Requests" มี Wichai อยู่
    Snap: "pending-requests"

  Step 2: [Admin] อนุมัติ request
    Action: คลิก "Approve" ข้าง Wichai
    Post-check: Wichai ย้ายจาก Pending ไป Assigned Users, toast "Access granted"
    Snap: "request-approved"

  Step 3: [Employee] ตรวจสอบว่าเห็น charge code ใหม่
    Action: [wichai.s] ไป Time Entry → คลิก "+ Add Charge Code"
    Post-check: PRJ-002 CRM Platform ปรากฏใน dropdown
    Snap: "new-cc-available"
```

#### E2E-CC-01: Budget Detail Drill-Down
```
E2E-CC-01: Charge Code แสดง Budget Detail drill-down
  Role: admin (tachongrak@central.co.th)
  Page: /charge-codes

  Step 1: เลือก charge code ระดับ Program
    Action: คลิก "PRG-001 Digital Transformation" ใน tree
    Post-check: detail panel แสดงข้อมูล PRG-001
    Snap: "program-selected"

  Step 2: คลิกแท็บ "Budget Detail"
    Pre-check: มีแท็บ Overview, Budget Detail, Access
    Action: คลิก "Budget Detail"
    Post-check: แสดง hierarchy breakdown — parent (PRG-001) → children (PRJ-001, PRJ-002) พร้อม budget bars
    Snap: "budget-detail-tab"

  Step 3: ตรวจสอบตัวเลข
    Action: เปรียบเทียบ actual/budget ของ children กับ API
    Post-check: ผลรวม actual ของ children ≈ actual ของ parent

  Step 4: Expand child level
    Action: คลิก PRJ-001 เพื่อดู activity level
    Post-check: แสดง ACT-001, ACT-002 พร้อม budget bars ระดับย่อย
    Snap: "budget-detail-expanded"
```

#### E2E-CC-02: Team/Person Breakdown
```
E2E-CC-02: Budget Detail แสดง team/person breakdown
  Role: admin (tachongrak@central.co.th)
  Page: /charge-codes

  Step 1: เลือก PRG-001 → แท็บ Budget Detail
    Action: Navigate ตามขั้นตอน E2E-CC-01

  Step 2: ตรวจสอบ "Charging by Team" section
    Pre-check: มี section ใต้ budget hierarchy
    Action: scroll ลงไปที่ตาราง "Charging by Team"
    Post-check: ตารางแสดง: Team, Hours, Cost (฿), % — มีอย่างน้อย 1 แถว
    Snap: "team-breakdown"

  Step 3: Expand ดูรายบุคคล
    Action: คลิก expand ที่แถว team (เช่น "Engineer")
    Post-check: แสดงรายชื่อบุคคลในทีม: ชื่อ, Hours, Cost, %
    Snap: "person-breakdown"
```

#### E2E-CC-03: Improved Tree View
```
E2E-CC-03: Tree view อ่านง่ายขึ้น
  Role: admin (tachongrak@central.co.th)
  Page: /charge-codes

  Step 1: เปิดหน้า Charge Codes
    Action: คลิกเมนู Charge Codes
    Post-check: tree view แสดงใน panel ซ้าย
    Snap: "tree-view-before"

  Step 2: ตรวจสอบ alignment และ connector lines
    Pre-check: tree มีข้อมูลหลาย level
    Action: expand Program → Project → Activity
    Post-check: (1) CC ID ใช้ monospace font จัด align, (2) budget amount อยู่ขวามือ align กัน, (3) มีเส้น connector lines แสดง hierarchy, (4) indent ชัดเจน 24px ต่อ level
    Snap: "tree-view-improved"
```

#### E2E-CC-04: Cascade Access
```
E2E-CC-04: Cascade access ไปยัง child charge codes
  Role: admin (tachongrak@central.co.th)
  Page: /charge-codes

  Step 1: เลือก PRG-001 → แท็บ Access
    Action: คลิก PRG-001 → Access tab
    Post-check: แสดงรายชื่อ assigned users

  Step 2: เพิ่ม user พร้อม cascade
    Pre-check: มี checkbox "Also add to all child charge codes"
    Action: คลิก "+ Add" → ค้นหา user → ติ๊ก checkbox → ติ๊ก "Also add to all child charge codes" → คลิก Add
    Post-check: toast "Added to PRG-001 and 4 child charge codes"
    Snap: "cascade-access-added"

  Step 3: ตรวจสอบ child charge code
    Action: คลิก child (PRJ-001) ใน tree → Access tab
    Post-check: user ที่เพิ่มปรากฏในรายชื่อ
    Snap: "cascade-verified"
```

#### E2E-AP-01: Approvals Search
```
E2E-AP-01: Search ในหน้า Approvals ทำงานได้
  Role: charge_manager (nattaya.k@central.co.th)
  Page: /approvals

  Step 1: เปิดหน้า Approvals
    Pre-check: มี pending timesheets อย่างน้อย 1 รายการ
    Action: คลิกเมนู Approvals
    Post-check: แท็บ Pending แสดงรายการ
    Snap: "approvals-loaded"

  Step 2: ค้นหาด้วยชื่อ
    Action: พิมพ์ "wichai" ในช่อง search
    Post-check: รายการกรองเหลือเฉพาะ Wichai (หรือไม่มีถ้า Wichai ไม่ได้ submit)
    Snap: "search-by-name"

  Step 3: ค้นหาด้วย email
    Action: ลบ search → พิมพ์ "ploy.r@"
    Post-check: รายการกรองเหลือเฉพาะ Ploy
    Snap: "search-by-email"

  Step 4: ค้นหาที่ไม่มีผลลัพธ์
    Action: ลบ search → พิมพ์ "zzzznotexist"
    Post-check: แสดง "No results found" หรือรายการว่าง
    Snap: "search-no-results"
```

#### E2E-RPT-01: Report by Program
```
E2E-RPT-01: Reports tab "By Program"
  Role: admin (tachongrak@central.co.th)
  Page: /reports

  Step 1: เปิดหน้า Reports
    Action: คลิกเมนู Reports
    Post-check: หน้า Reports โหลด, มี tab navigation

  Step 2: คลิกแท็บ "By Program"
    Pre-check: tabs แสดง: Overview, By Program, By Cost Center, By Person
    Action: คลิก "By Program"
    Post-check: แสดง Program dropdown + Period dropdown
    Snap: "report-by-program-tab"

  Step 3: เลือก Program
    Action: เลือก "Digital Transformation" จาก dropdown
    Post-check: Budget vs Actual bar chart ปรากฏ, Task Distribution และ Team Distribution tables แสดงข้อมูล
    Snap: "report-by-program-data"

  Step 4: ตรวจสอบ Team Distribution
    Action: อ่านตาราง Team Distribution
    Post-check: แสดง: Team Name, Hours, Cost (฿), % — ผลรวม % = 100%
```

#### E2E-RPT-02: Report by Cost Center
```
E2E-RPT-02: Reports tab "By Cost Center"
  Role: admin (tachongrak@central.co.th)
  Page: /reports

  Step 1: คลิกแท็บ "By Cost Center"
    Action: คลิก tab "By Cost Center"
    Post-check: แสดง Cost Center dropdown

  Step 2: เลือก Cost Center
    Action: เลือก cost center (เช่น "Engineering")
    Post-check: Chargeability gauge แสดง %, Charge Distribution chart แสดง, Team member table แสดงรายชื่อ
    Snap: "report-by-cost-center"

  Step 3: ตรวจสอบ Charge Distribution
    Action: อ่าน chart
    Post-check: แสดง program names + hours (chargeable vs non-chargeable)
```

#### E2E-RPT-03: Report by Person
```
E2E-RPT-03: Reports tab "By Person"
  Role: admin (tachongrak@central.co.th)
  Page: /reports

  Step 1: คลิกแท็บ "By Person"
    Action: คลิก tab "By Person"
    Post-check: แสดง Person search + Period range

  Step 2: ค้นหา person
    Action: พิมพ์ "Wichai" → เลือก Wichai S.
    Post-check: Summary cards แสดง: Total Hours, Billable Hours, Chargeability %, Vacation Days
    Snap: "report-by-person"

  Step 3: ตรวจสอบ Charge History
    Action: scroll ลงไปที่ chart
    Post-check: Stacked bar chart แสดง hours per program รายเดือน
    Snap: "person-charge-history"

  Step 4: ตรวจสอบ Project Summary table
    Action: อ่านตาราง
    Post-check: แสดง Project Name, Hours YTD, Cost YTD, % of Total
```

#### E2E-BUD-01: Budget Multi-Select Filter
```
E2E-BUD-01: Budget page multi-select filter
  Role: admin (tachongrak@central.co.th)
  Page: /budget

  Step 1: เปิดหน้า Budget
    Action: คลิกเมนู Budget
    Post-check: Budget page โหลด, แสดง filter area

  Step 2: ใช้ multi-select filter
    Pre-check: filter แสดงรายชื่อ programs ทั้งหมดเป็น checkbox chips
    Action: ติ๊ก PRG-001 + PRG-002 (เลือก 2 จาก 3)
    Post-check: ตารางกรองเหลือ 2 programs, แสดง "Showing 2 of 3 programs"
    Snap: "multi-select-filtered"

  Step 3: Clear filter
    Action: คลิก "Clear"
    Post-check: กลับแสดงทั้งหมด
```

#### E2E-BUD-02: Budget Team Breakdown
```
E2E-BUD-02: Budget page team breakdown
  Role: admin (tachongrak@central.co.th)
  Page: /budget

  Step 1: Expand budget row
    Pre-check: ตาราง budget แสดงรายการ programs
    Action: คลิก expand ที่ PRG-001
    Post-check: แสดง children + Team Breakdown section

  Step 2: ตรวจสอบ Team Breakdown
    Action: อ่าน Team Breakdown
    Post-check: แสดง top teams เช่น "Engineer 75% | BA 14% | QA 9%"
    Snap: "budget-team-breakdown"
```

#### E2E-SYS-01: Login Session Fix
```
E2E-SYS-01: หลัง re-login ข้อมูลอัพเดทโดยไม่ต้อง refresh
  Role: admin (tachongrak@central.co.th) → employee (wichai.s@central.co.th)
  Page: /

  Step 1: Login ครั้งแรก
    Action: login ด้วย tachongrak@central.co.th
    Post-check: Dashboard แสดงชื่อ "Tachongrak", sidebar มีเมนู Admin
    Snap: "first-login"

  Step 2: Logout
    Action: คลิก avatar → Logout
    Post-check: redirect ไปหน้า /login

  Step 3: Login ด้วยชื่ออื่น
    Action: login ด้วย wichai.s@central.co.th
    Post-check: Dashboard แสดงชื่อ "Wichai" (ไม่ใช่ "Tachongrak"), sidebar ไม่มีเมนู Admin
    Snap: "second-login-updated"
```

#### E2E-SYS-02: RIS Logo
```
E2E-SYS-02: Sidebar แสดง RIS logo
  Role: employee (wichai.s@central.co.th)
  Page: /

  Step 1: ตรวจสอบ sidebar
    Action: มองที่ sidebar ซ้ายด้านบน
    Post-check: มี RIS logo ปรากฏ (ไม่ใช่แค่ "TS" icon)
    Snap: "ris-logo-visible"
```

#### E2E-SYS-03: Profile Photo
```
E2E-SYS-03: Avatar แสดง profile photo หรือ initials
  Role: employee (wichai.s@central.co.th)
  Page: /

  Step 1: ตรวจสอบ avatar ใน topbar
    Action: มองที่ avatar มุมขวาบน
    Post-check: แสดงรูป profile photo หรือ initials จากชื่อ (เช่น "WS" สำหรับ Wichai S.)
    Snap: "profile-avatar"
```

#### E2E-BUG-01: Admin Users Page — No Hardcoded "Active" Badge
```
E2E-BUG-01: หน้า Admin Users ไม่มี hardcoded "Active" badge และ status filter ทำงาน/ถูกลบ
  Role: admin (tachongrak@central.co.th)
  Page: /admin/users

  Step 1: เปิดหน้า Admin Users
    Action: คลิก Admin → Users ใน sidebar
    Post-check: ตารางผู้ใช้โหลดสำเร็จ
    Snap: "admin-users-loaded"

  Step 2: ตรวจสอบ stat cards
    Pre-check: มี stat cards ด้านบน
    Action: อ่านค่า stat cards
    Post-check: ไม่มี card ที่เขียนว่า "Active" พร้อมจำนวนทั้งหมด (ถ้ามี Active card ต้องแสดงจำนวนที่ถูกต้อง ไม่ใช่ total users)
    Snap: "stat-cards-no-hardcoded"

  Step 3: ตรวจสอบ status filter (ถ้ายังมี)
    Pre-check: ถ้ามี dropdown "Status"
    Action: เลือก status ที่ไม่ใช่ "All"
    Post-check: ตารางกรองตาม status จริง (ไม่ใช่แสดงทุกคนเหมือนเดิม) — หรือ dropdown ถูกลบแล้ว
```

#### E2E-SYS-04: In-App Chat Widget — Log Time via Chat
```
E2E-SYS-04: Employee ใช้ chat widget เพื่อ log เวลาด้วย natural language
  Role: employee (wichai.s@central.co.th)
  Page: /

  Step 1: เปิด chat widget
    Pre-check: มี floating chat button มุมขวาล่างของหน้าจอ
    Action: คลิก floating chat button
    Post-check: chat panel เปิดขึ้น, แสดงข้อความต้อนรับ + suggested actions เป็น clickable chips
    Snap: "chat-widget-open"

  Step 2: ถาม help
    Action: พิมพ์ "help" แล้วกด Send
    Post-check: bot ตอบกลับพร้อมรายการ commands ที่ใช้ได้ (Log time, Show timesheet, etc.)
    Snap: "chat-help-response"

  Step 3: Log เวลาผ่าน chat
    Action: พิมพ์ "Log 4h on PRJ-001 today" แล้วกด Send
    Post-check: bot ตอบ "Logged 4h on [ชื่อ CC] (PRJ-001) for [วันที่]"
    Snap: "chat-log-success"

  Step 4: ตรวจสอบว่า timesheet อัพเดทจริง
    Action: ไปหน้า Time Entry
    Post-check: PRJ-001 วันนี้แสดง 4h (ข้อมูลจาก chat ถูกบันทึกจริง)
    Snap: "chat-entry-verified"

  Step 5: ถามสรุปชั่วโมงวันนี้
    Action: กลับมา chat → พิมพ์ "How many hours did I log today?"
    Post-check: bot ตอบจำนวนชั่วโมงรวมวันนี้ + breakdown ต่อ charge code
    Snap: "chat-hours-today"

  Negative: Log เวลาใน charge code ที่ไม่มี access
    Step: พิมพ์ "Log 2h on XXXX-999 today"
    Post-check: bot ตอบ error "Charge code XXXX-999 not found" + แนะนำให้ดู charge codes ที่ assign
    Snap: "chat-invalid-cc"
```

### Infrastructure Criteria (verified by Infra Verify stage)
- All external service connections verified with real queries/requests
- No placeholder values remain in .env files
- Auth endpoint returns valid JWKS/keys
- Database accepts queries via configured connection string
- New `charge_code_requests` table exists and accepts INSERT
- Performance indexes exist on key columns

### Quality Criteria
- Code review passes with no remaining quality issues
- All unit tests pass (mocked dependencies)
- All E2E tests pass against real running servers (NOT mocked) — every E2E spec listed above must pass
- Every feature criterion has at least 1 test ID in its `Verified by:` line
- No MOCK data constants in production code
- No hardcoded values for dynamic data
- TanStack Query params built inside queryFn

### Documentation Criteria
- All documentation files referenced in indexes/READMEs actually exist
- `docs/env-setup.md` exists with environment variable descriptions
- `docs/architecture.md` exists with updated Mermaid diagram including new Dashboard module
- `docs/troubleshooting.md` includes CR-18 login session fix
- `docs/prd-runbook.md` updated with all new features
- `docs/chatbot-roadmap.md` exists with future plans

### Runtime Criteria (verified by Validate Final stage)
- All new API endpoints return HTTP 200: `/dashboard/chargeability-ytd`, `/dashboard/program-distribution`, `/reports/by-program`, `/reports/by-cost-center`, `/reports/by-person`, `/charge-codes/:id/budget-detail`, `/charge-codes/:id/request-access`
- At least one authenticated API call returns real data
- Auth flow works end-to-end
- Test case CSV saved to `docs/test-results/test-cases.csv` with 12 columns
- Test case markdown saved to `docs/test-results/test-cases.md` grouped by Section
- Test results summary saved to `docs/test-results/summary.md`
- Unit test results saved to `docs/test-results/backend/unit-results.json` and `.md`
- Frontend test results saved to `docs/test-results/frontend/unit-results.json` and `.md`
- E2E results saved to `docs/test-results/e2e/e2e-results.json` and `.md`
- Screenshots saved to `docs/test-results/screenshots/` with correct naming

## Validation Commands

```bash
# Backend compilation
cd backend && pnpm build

# Frontend build
cd frontend && pnpm build

# Backend unit tests
cd backend && pnpm test -- --json --outputFile=../docs/test-results/backend/unit-results.json

# Frontend unit tests
cd frontend && pnpm test -- --reporter=json --outputFile=../docs/test-results/frontend/unit-results.json

# E2E tests (requires both servers running)
cd frontend && npx playwright test --reporter=json --output=../docs/test-results/e2e/

# Verify test results files exist
test -f docs/test-results/test-cases.csv && head -1 docs/test-results/test-cases.csv | grep -q "ID,Title,Type,Section"
test -f docs/test-results/test-cases.md && grep -q '| ID' docs/test-results/test-cases.md
test -f docs/test-results/summary.md

# Verify documentation
test -f docs/env-setup.md
test -f docs/architecture.md && grep -q 'mermaid' docs/architecture.md
test -f docs/troubleshooting.md && grep -qE '### Issue|### Problem' docs/troubleshooting.md
test -f docs/chatbot-roadmap.md
test -f docs/prd-runbook.md

# Verify doc links
grep -oP '\]\(([^)]+\.md)\)' docs/*.md | while read -r link; do
  file=$(echo "$link" | grep -oP '\(([^)]+)\)' | tr -d '()')
  test -f "docs/$file" || echo "BROKEN LINK: $file"
done

# Verify new API endpoints (requires backend running on :3001)
curl -sf http://localhost:3001/api/v1/dashboard/chargeability-ytd -H "Authorization: Bearer $TOKEN" | jq '.ytdChargeability'
curl -sf http://localhost:3001/api/v1/dashboard/program-distribution -H "Authorization: Bearer $TOKEN" | jq '.currentPeriod | length'
curl -sf http://localhost:3001/api/v1/reports/by-program -H "Authorization: Bearer $TOKEN" | jq '.program'
curl -sf http://localhost:3001/api/v1/reports/by-cost-center -H "Authorization: Bearer $TOKEN" | jq '.chargeability'
curl -sf http://localhost:3001/api/v1/reports/by-person -H "Authorization: Bearer $TOKEN" | jq '.person'

# Verify screenshots exist
ls docs/test-results/screenshots/*.png | wc -l | grep -qv '^0$'
ls docs/test-results/screenshots/ | grep -q '\-\-desktop\.png'

# Verify unit test results
test -f docs/test-results/backend/unit-results.json && python3 -c "import json; d=json.load(open('docs/test-results/backend/unit-results.json')); print(f'Backend: {d.get(\"numPassedTests\", 0)} passed')"
test -f docs/test-results/backend/unit-results.md
test -f docs/test-results/frontend/unit-results.json
test -f docs/test-results/frontend/unit-results.md

# Verify DB migration applied
cd backend && node -e "const { drizzle } = require('drizzle-orm/postgres-js'); /* verify charge_code_requests table exists */"
```

## Healing Rules

- `compile error` → builder — Fix syntax or import errors in the failing file
- `nest build` → builder — Fix NestJS build errors (missing imports, circular deps)
- `next build` → builder — Fix Next.js build errors (missing components, type errors)
- `type error` → builder — Fix TypeScript type errors
- `jest` → test-writer — Fix failing backend unit tests
- `vitest` → test-writer — Fix failing frontend unit tests
- `playwright` → test-writer — Fix failing E2E tests or update selectors
- `test-cases.csv` → test-writer — Generate the missing test case CSV (12 columns)
- `test-cases.md` → test-writer — Generate the missing test case markdown grouped by Section
- `test-results/summary.md` → test-writer — Generate the missing test summary report
- `unit-results` → test-writer — Re-run tests and save results
- `unit-results.json` → test-writer — Configure test runner JSON output and re-run
- `screenshots` → test-writer — Capture missing screenshots via Playwright
- `code review` → code-reviewer — Re-review and fix remaining quality issues
- `broken link` → docs-writer — Create missing documentation files
- `missing env-setup` → docs-writer — Create docs/env-setup.md
- `missing architecture` → docs-writer — Create/update docs/architecture.md with Mermaid diagram
- `missing troubleshooting` → docs-writer — Create/update docs/troubleshooting.md
- `chatbot-roadmap` → docs-writer — Create docs/chatbot-roadmap.md
- `infra verify` → builder — Fix failing infrastructure connection
- `E2E smoke` → test-writer — Fix E2E smoke test
- `runtime` → builder — Fix runtime errors caught by real server validation
- `HTTP 4xx` → builder — Fix API endpoint returning errors
- `migration` → builder — Fix database migration issues

## Notes

- **CR-21 Chatbot**: Phase 1 = In-app chat widget (ใช้ backend ที่มีอยู่แล้ว `TeamsBotService`). Phase 2 = Microsoft Teams integration (รอ IT confirm ว่า org อนุญาตติดตั้ง custom bot ใน Teams ได้) — แยกเป็นแผนถัดไป
- **CR-22 Scalability**: 200 users + 100 projects + 5 years = ประมาณ 200 × 52 × 5 = 52,000 timesheets + 520,000 entries ไม่ใช่ dataset ใหญ่มาก แต่ต้องมี indexes ที่เหมาะสม
- **LEAVE-001**: System charge code สำหรับ vacation — ต้องมีใน seed data ถ้ายังไม่มี
- **RIS Logo**: ต้องขอ SVG file จากทีม branding — ถ้าไม่มีให้ใช้ placeholder text "RIS" ใน sidebar ก่อน
- **Profile Photo**: ใช้ `avatar_url` จาก Supabase Auth user metadata — ถ้าไม่มีรูปให้แสดง initials
- **Builder Parallelism**: builder-fixes, builder-dashboard-timeentry, builder-chargecodes-reports, builder-budget-system ทำงานคู่ขนานได้ (แต่ละคนแก้ไขไฟล์คนละชุด)
- **Test Data**: E2E tests ใช้ test accounts ที่มีอยู่แล้ว (wichai.s, nattaya.k, tachongrak) — ไม่ต้องสร้างข้อมูลใหม่
