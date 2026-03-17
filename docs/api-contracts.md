# API Contracts

Base URL: `http://localhost:3001/api/v1` (development)

All endpoints require `Authorization: Bearer <supabase_access_token>` unless marked **Public**. Obtain the token from Supabase Auth after login.

---

## Users

### GET /users/me

Get the current authenticated user's profile.

- **Auth**: Any authenticated role
- **Response (200)**:
```json
{
  "id": "d3055e90-4396-4fb6-95fa-3767eafb8349",
  "email": "user@example.com",
  "fullName": "Jane Doe",
  "jobGrade": "L3",
  "managerId": "uuid",
  "role": "employee",
  "department": "Engineering",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

| Error | Cause |
|-------|-------|
| 401 | Missing or invalid JWT |
| 404 | No profile row found for the JWT sub claim |

---

### PUT /users/me

Update the current user's profile fields.

- **Auth**: Any authenticated role
- **Request Body**:
```json
{
  "fullName": "Jane Doe",
  "department": "Engineering"
}
```
- **Response (200)**: Updated profile object (same shape as GET /users/me)

| Error | Cause |
|-------|-------|
| 400 | Validation error on submitted fields |
| 401 | Unauthorized |

---

### GET /users

List all user profiles.

- **Auth**: `admin` only
- **Response (200)**:
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "Jane Doe",
    "jobGrade": "L3",
    "role": "employee",
    "department": "Engineering"
  }
]
```

| Error | Cause |
|-------|-------|
| 401 | Unauthorized |
| 403 | Insufficient role |

---

### PUT /users/:id/role

Update a user's role.

- **Auth**: `admin` only
- **Path Params**: `id` — user UUID
- **Request Body**:
```json
{
  "role": "charge_manager"
}
```
Valid roles: `employee`, `charge_manager`, `pmo`, `finance`, `admin`
- **Response (200)**: Updated profile object

| Error | Cause |
|-------|-------|
| 400 | Invalid role value |
| 401 | Unauthorized |
| 403 | Insufficient role |
| 404 | User not found |

---

### PUT /users/:id/job-grade

Update a user's job grade.

- **Auth**: `admin` only
- **Path Params**: `id` — user UUID
- **Request Body**:
```json
{
  "jobGrade": "L4"
}
```
- **Response (200)**: Updated profile object

| Error | Cause |
|-------|-------|
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Insufficient role |
| 404 | User not found |

---

## Timesheets

### POST /timesheets

Create a new timesheet for a period.

- **Auth**: Any authenticated role
- **Request Body**:
```json
{
  "periodStart": "2026-03-01",
  "periodEnd": "2026-03-15"
}
```
- **Response (201)**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "periodStart": "2026-03-01",
  "periodEnd": "2026-03-15",
  "status": "draft",
  "submittedAt": null,
  "lockedAt": null,
  "rejectionComment": null,
  "createdAt": "2026-03-01T00:00:00.000Z",
  "updatedAt": "2026-03-01T00:00:00.000Z"
}
```

| Error | Cause |
|-------|-------|
| 400 | Invalid date range or timesheet already exists for this period |
| 401 | Unauthorized |

---

### GET /timesheets

Get the current user's timesheet for a period.

- **Auth**: Any authenticated role
- **Query Params**: `period` (optional) — any date within the period, e.g. `2026-03-16`
- **Response (200)**: Timesheet object or `null` if none exists for the period

---

### GET /timesheets/charge-codes

Get charge codes assigned to the current user (for use in time entry).

- **Auth**: Any authenticated role
- **Response (200)**:
```json
[
  {
    "chargeCodeId": "ACT-001",
    "name": "Development",
    "isBillable": true
  }
]
```

---

### GET /timesheets/:id

Get a timesheet by ID.

- **Auth**: Owner only
- **Path Params**: `id` — timesheet UUID
- **Response (200)**: Timesheet object

| Error | Cause |
|-------|-------|
| 401 | Unauthorized |
| 404 | Timesheet not found |

---

### GET /timesheets/:id/entries

Get all time entries for a timesheet.

- **Auth**: Owner only
- **Path Params**: `id` — timesheet UUID
- **Response (200)**:
```json
[
  {
    "id": "uuid",
    "timesheetId": "uuid",
    "chargeCodeId": "ACT-001",
    "date": "2026-03-01",
    "hours": "8.00",
    "description": "Feature development",
    "calculatedCost": "400.00",
    "createdAt": "2026-03-01T00:00:00.000Z"
  }
]
```

| Error | Cause |
|-------|-------|
| 401 | Unauthorized |
| 404 | Timesheet not found |

---

### PUT /timesheets/:id/entries

Upsert (create or update) entries for a timesheet. Replaces all existing entries.

- **Auth**: Owner only (timesheet must be in `draft` status)
- **Path Params**: `id` — timesheet UUID
- **Request Body**:
```json
{
  "entries": [
    {
      "chargeCodeId": "ACT-001",
      "date": "2026-03-01",
      "hours": 8,
      "description": "Feature development"
    }
  ]
}
```
- **Response (200)**: Array of upserted entry objects (same shape as GET /timesheets/:id/entries items)

| Error | Cause |
|-------|-------|
| 400 | Validation error or timesheet not in draft status |
| 401 | Unauthorized |
| 404 | Timesheet not found |

---

### POST /timesheets/:id/submit

Submit a timesheet for manager approval. Transitions status from `draft` or `rejected` to `submitted`.

- **Auth**: Owner only
- **Path Params**: `id` — timesheet UUID
- **Request Body**: None
- **Response (200)**: Updated timesheet object with `status: "submitted"`

**Minimum hours validation (400 — short weekdays):**
```json
{
  "message": "Minimum 8 hours required on weekdays",
  "details": [
    { "date": "2026-03-10", "logged": 6, "required": 8 },
    { "date": "2026-03-11", "logged": 0, "required": 8 }
  ]
}
```

The `details` array lists every weekday (excluding holidays from the calendar) where the total logged hours across all charge codes is less than 8. Holidays and weekends are automatically excluded.

| Error | Cause |
|-------|-------|
| 400 | Timesheet not in `draft` or `rejected` status |
| 400 | One or more weekdays have fewer than 8 hours logged |
| 401 | Unauthorized |
| 404 | Timesheet not found |

---

## Charge Codes

### GET /charge-codes

List all charge codes with optional filters.

- **Auth**: Any authenticated role
- **Query Params**:
  - `level` — `program | project | activity | task`
  - `status` — filter by code status
  - `billable` — `true | false`
  - `search` — text search against name or ID
- **Response (200)**: Array of charge code objects

---

### GET /charge-codes/tree

Get the full charge code hierarchy as a nested tree.

- **Auth**: Any authenticated role
- **Response (200)**:
```json
[
  {
    "id": "PROG-001",
    "name": "Main Program",
    "level": "program",
    "children": [
      {
        "id": "PROJ-001",
        "name": "Phase 1",
        "level": "project",
        "children": [
          {
            "id": "ACT-001",
            "name": "Development",
            "level": "activity",
            "isBillable": true,
            "children": []
          }
        ]
      }
    ]
  }
]
```

---

### GET /charge-codes/my

Get charge codes assigned to the current user.

- **Auth**: Any authenticated role
- **Response (200)**: Array of charge code objects (flat list)

---

### POST /charge-codes

Create a new charge code.

- **Auth**: `admin` or `charge_manager`
- **Request Body**:
```json
{
  "id": "PROJ-002",
  "name": "New Project",
  "parentId": "PROG-001",
  "level": "project",
  "programName": "Main Program",
  "costCenter": "CC-100",
  "activityCategory": "Development",
  "budgetAmount": 50000,
  "ownerId": "uuid",
  "approverId": "uuid",
  "validFrom": "2026-01-01",
  "validTo": "2026-12-31",
  "isBillable": true
}
```
- **Response (201)**: Created charge code object

| Error | Cause |
|-------|-------|
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Insufficient role |

---

### GET /charge-codes/:id

Get a single charge code by ID.

- **Auth**: Any authenticated role
- **Path Params**: `id` — charge code string ID (e.g., `PROJ-001`)
- **Response (200)**: Full charge code object

| Error | Cause |
|-------|-------|
| 401 | Unauthorized |
| 404 | Charge code not found |

---

### PUT /charge-codes/:id

Update a charge code's fields.

- **Auth**: `admin` or `charge_manager`
- **Path Params**: `id` — charge code string ID
- **Request Body**: Partial charge code fields (any subset of the POST body)
- **Response (200)**: Updated charge code object

| Error | Cause |
|-------|-------|
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Insufficient role |
| 404 | Charge code not found |

---

### GET /charge-codes/:id/children

Get direct children of a charge code.

- **Auth**: Any authenticated role
- **Path Params**: `id` — charge code string ID
- **Response (200)**: Array of child charge code objects

---

### PUT /charge-codes/:id/access

Update user assignments for a charge code.

- **Auth**: `admin` or `charge_manager`
- **Path Params**: `id` — charge code string ID
- **Request Body**:
```json
{
  "userIds": ["uuid1", "uuid2"]
}
```
- **Response (200)**: Updated access list

---

## Approvals

### GET /approvals/pending

Get timesheets pending the current user's approval, grouped by role.

- **Auth**: Any authenticated role
- **Response (200)**:
```json
{
  "asManager": [
    {
      "id": "uuid",
      "status": "submitted",
      "periodStart": "2026-03-01",
      "periodEnd": "2026-03-15",
      "employee": {
        "id": "uuid",
        "fullName": "Jane Doe",
        "department": "Engineering"
      }
    }
  ],
  "asCCOwner": []
}
```

---

### POST /approvals/:timesheet_id/approve

Approve a timesheet.

- **Auth**: Manager or charge code approver
- **Path Params**: `timesheet_id` — timesheet UUID
- **Request Body**:
```json
{
  "comment": "Looks good"
}
```
- **Response (200)**: `{ "success": true }`

| Error | Cause |
|-------|-------|
| 400 | Timesheet not in approvable state |
| 401 | Unauthorized |
| 403 | Not an approver for this timesheet |
| 404 | Timesheet not found |

---

### POST /approvals/:timesheet_id/reject

Reject a timesheet.

- **Auth**: Manager or charge code approver
- **Path Params**: `timesheet_id` — timesheet UUID
- **Request Body**:
```json
{
  "comment": "Please correct the hours on March 5"
}
```
- **Response (200)**: `{ "success": true }`

| Error | Cause |
|-------|-------|
| 400 | Timesheet not in rejectable state |
| 401 | Unauthorized |
| 403 | Not an approver for this timesheet |
| 404 | Timesheet not found |

---

### POST /approvals/bulk-approve

Approve multiple timesheets in one request.

- **Auth**: Manager or charge code approver
- **Request Body**:
```json
{
  "timesheet_ids": ["uuid1", "uuid2", "uuid3"]
}
```
- **Response (200)**: `{ "approved": ["uuid1", "uuid2", "uuid3"] }`

| Error | Cause |
|-------|-------|
| 400 | Invalid timesheet IDs |
| 401 | Unauthorized |
| 403 | Insufficient role |

---

### GET /approvals/history

Get the current user's approval action history.

- **Auth**: Any authenticated role
- **Response (200)**:
```json
[
  {
    "id": "uuid",
    "timesheetId": "uuid",
    "action": "approved",
    "comment": "Looks good",
    "actorId": "uuid",
    "createdAt": "2026-03-10T09:00:00.000Z"
  }
]
```

---

### GET /approvals/:timesheet_id/detail

Get detailed view of a timesheet for approval review.

- **Auth**: Any authenticated role
- **Path Params**: `timesheet_id` — timesheet UUID
- **Response (200)**: Timesheet with nested entries, user details, and charge code info

---

## Budgets

### GET /budgets/alerts

Get budget alerts for charge codes exceeding spend thresholds.

- **Auth**: Any authenticated role
- **Response (200)**:
```json
[
  {
    "chargeCodeId": "PROJ-001",
    "name": "Phase 1",
    "budget": 50000,
    "actual": 45000,
    "forecast": 52000,
    "severity": "orange",
    "rootCauseActivity": "ACT-002"
  }
]
```

Severity values: `yellow` (≥75% consumed), `orange` (≥90%), `red` (≥100%).

---

### GET /budgets/chargeability-alerts

Get chargeability alerts for employees who are below the target chargeability rate.

- **Auth**: Any authenticated role
- **Response (200)**:
```json
[
  {
    "type": "chargeability",
    "employeeId": "uuid",
    "name": "Wichai Srisuk",
    "billableHours": 60,
    "totalHours": 100,
    "chargeability": 60.0,
    "target": 80,
    "severity": "red",
    "costImpact": 1100
  }
]
```

- `severity`: `red` (chargeability < 60%), `orange` (60–69%), `yellow` (70–79%)
- `costImpact`: estimated cost of the chargeability gap in currency units (hours × average hourly rate)

---

### GET /budgets/summary

Get aggregated budget summary across all charge codes.

- **Auth**: Any authenticated role
- **Response (200)**:
```json
{
  "totalBudget": 200000,
  "totalActual": 130000,
  "totalForecast": 185000,
  "items": [
    {
      "chargeCodeId": "PROJ-001",
      "name": "Phase 1",
      "budgetAmount": "50000.00",
      "actualSpent": "32500.00",
      "forecastAtCompletion": "48000.00"
    }
  ]
}
```

---

### POST /budgets/recalculate

Trigger a full budget recalculation from approved timesheet entries.

- **Auth**: `admin` only
- **Request Body**: None
- **Response (200)**: Summary of recalculation results

| Error | Cause |
|-------|-------|
| 401 | Unauthorized |
| 403 | Insufficient role |

---

### GET /budgets/:charge_code_id

Get budget details for a specific charge code.

- **Auth**: Any authenticated role
- **Path Params**: `charge_code_id` — charge code string ID
- **Response (200)**:
```json
{
  "chargeCodeId": "PROJ-001",
  "budgetAmount": "50000.00",
  "actualSpent": "32500.00",
  "forecastAtCompletion": "48000.00",
  "lastUpdated": "2026-03-15T00:00:00.000Z"
}
```

| Error | Cause |
|-------|-------|
| 401 | Unauthorized |
| 404 | Budget record not found |

---

### GET /budgets/:charge_code_id/forecast

Get forecast projection data for a charge code.

- **Auth**: Any authenticated role
- **Path Params**: `charge_code_id` — charge code string ID
- **Response (200)**: Forecast object with projected monthly spend

---

## Reports

### GET /reports/utilization

Get utilization report showing hours logged vs capacity per user.

- **Auth**: Any authenticated role
- **Query Params**: `period` (required) — e.g. `2026-03`
- **Response (200)**:
```json
{
  "period": "2026-03",
  "users": [
    {
      "userId": "uuid",
      "fullName": "Jane Doe",
      "hoursLogged": 160,
      "capacity": 176,
      "utilizationPct": 90.9
    }
  ]
}
```

---

### GET /reports/chargeability

Get chargeability report showing billable vs non-billable hour ratios.

- **Auth**: Any authenticated role
- **Query Params**: `team` (optional) — filter by department/team name
- **Response (200)**:
```json
{
  "billableHours": 1200,
  "nonBillableHours": 400,
  "chargeabilityPct": 75.0,
  "breakdown": [
    {
      "userId": "uuid",
      "fullName": "Jane Doe",
      "billable": 160,
      "nonBillable": 16,
      "pct": 90.9
    }
  ]
}
```

---

### GET /reports/financial-impact

Get aggregated financial impact metrics across all approved timesheets, with team and charge code breakdowns.

- **Auth**: Any authenticated role
- **Query Params**:
  - `period` (optional) — month string, e.g. `2026-03`
  - `team` (optional) — department name to filter `byTeam` to a single team
- **Response (200)**:
```json
{
  "overBudgetCost": 12000,
  "overBudgetCount": 2,
  "lowChargeabilityCost": 8000,
  "netImpact": 20000,
  "avgCostRate": 55.00,
  "targetChargeability": 80,
  "actualChargeability": 72.5,
  "byTeam": [
    {
      "department": "Engineering",
      "totalHours": 320,
      "billableHours": 240,
      "chargeability": 75.0,
      "totalCost": 17600,
      "billableRevenue": 13200,
      "margin": -4400,
      "marginPercent": -25.0
    }
  ],
  "byChargeCode": [
    {
      "chargeCodeId": "PROJ-001",
      "chargeCodeName": "Backend API",
      "budget": 50000,
      "actual": 52000,
      "variance": -2000,
      "forecastOverrun": 3500
    }
  ]
}
```

---

### GET /reports/activity-distribution

Get hours distributed across activity categories for a period.

- **Auth**: Any authenticated role
- **Query Params**: `period` (required) — e.g. `2026-03`
- **Response (200)**:
```json
{
  "period": "2026-03",
  "categories": [
    { "category": "Development", "hours": 800, "pct": 55.6 },
    { "category": "Testing", "hours": 320, "pct": 22.2 }
  ]
}
```

---

### GET /reports/project-cost

Get cost breakdown for a specific charge code.

- **Auth**: Any authenticated role
- **Query Params**: `charge_code_id` (required)
- **Response (200)**: Cost breakdown by user, period, and sub-charge code

---

## Calendar

### GET /calendar

Get calendar days for a year.

- **Auth**: Any authenticated role
- **Query Params**:
  - `year` (optional) — e.g. `2026` (defaults to current year)
  - `country_code` (optional) — e.g. `TH`
- **Response (200)**:
```json
[
  {
    "id": "uuid",
    "date": "2026-04-13",
    "dayType": "holiday",
    "holidayName": "Songkran",
    "countryCode": "TH"
  }
]
```

---

### GET /calendar/working-days

Get working day count between two dates.

- **Auth**: Any authenticated role
- **Query Params**:
  - `start` (required) — date string, e.g. `2026-03-01`
  - `end` (required) — date string, e.g. `2026-03-31`
- **Response (200)**:
```json
{
  "workingDays": 21,
  "totalDays": 31,
  "holidays": 1,
  "weekends": 9
}
```

---

### POST /calendar/holidays

Create a new holiday entry.

- **Auth**: `admin` only
- **Request Body**:
```json
{
  "date": "2026-04-13",
  "holidayName": "Songkran",
  "countryCode": "TH"
}
```
- **Response (201)**: Created calendar entry object

---

### PUT /calendar/holidays/:id

Update an existing holiday.

- **Auth**: `admin` only
- **Path Params**: `id` — calendar entry UUID
- **Request Body**:
```json
{
  "holidayName": "Songkran Festival",
  "countryCode": "TH"
}
```
- **Response (200)**: Updated calendar entry object

---

### DELETE /calendar/holidays/:id

Delete a holiday entry.

- **Auth**: `admin` only
- **Path Params**: `id` — calendar entry UUID
- **Response (200)**: `{ "success": true }`

---

### POST /calendar/populate-weekends

Populate weekend (non-working day) entries for a given year.

- **Auth**: `admin` only
- **Request Body**:
```json
{
  "year": 2026
}
```
- **Response (200)**: `{ "count": 104 }`

---

## Vacations

### GET /vacations/me

Get the current user's vacation requests.

- **Auth**: Any authenticated role
- **Response (200)**: Array of vacation request objects

---

### POST /vacations

Submit a vacation request.

- **Auth**: Any authenticated role
- **Request Body**:
```json
{
  "startDate": "2026-04-14",
  "endDate": "2026-04-16"
}
```
- **Response (201)**: Created vacation request object

---

### GET /vacations/pending

Get pending vacation requests for manager review.

- **Auth**: `charge_manager` or `admin`
- **Response (200)**: Array of pending vacation request objects with submitter details

---

### POST /vacations/:id/approve

Approve a vacation request.

- **Auth**: `charge_manager` or `admin`
- **Path Params**: `id` — vacation request UUID
- **Response (200)**: Updated vacation request with `status: "approved"`

---

### POST /vacations/:id/reject

Reject a vacation request.

- **Auth**: `charge_manager` or `admin`
- **Path Params**: `id` — vacation request UUID
- **Response (200)**: Updated vacation request with `status: "rejected"`

---

## Cost Rates

### GET /cost-rates

List all job grade cost rates.

- **Auth**: `admin` or `finance`
- **Response (200)**:
```json
[
  {
    "id": 1,
    "jobGrade": "L3",
    "hourlyRate": "50.00",
    "effectiveFrom": "2026-01-01",
    "effectiveTo": null
  }
]
```

---

### POST /cost-rates

Create a new cost rate entry.

- **Auth**: `admin` only
- **Request Body**:
```json
{
  "jobGrade": "L4",
  "hourlyRate": "65.00",
  "effectiveFrom": "2026-01-01",
  "effectiveTo": null
}
```
- **Response (201)**: Created cost rate object

---

### PUT /cost-rates/:id

Update an existing cost rate.

- **Auth**: `admin` only
- **Path Params**: `id` — cost rate integer ID
- **Request Body**:
```json
{
  "hourlyRate": "70.00",
  "effectiveTo": "2026-12-31"
}
```
- **Response (200)**: Updated cost rate object

---

### DELETE /cost-rates/:id

Delete a cost rate entry.

- **Auth**: `admin` only
- **Path Params**: `id` — cost rate integer ID
- **Response (200)**: `{ "success": true }`

---

## Integrations

### POST /integrations/teams/webhook

Microsoft Teams bot webhook. Receives Bot Framework Activity objects from the Teams platform.

- **Auth**: **Public** (verified by Bot Framework secret, not JWT)
- **Content-Type**: `application/json`
- **Request Body**: Bot Framework Activity object
- **Response**: Bot Framework Activity response

---

### GET /integrations/teams/manifest

Get the Teams app manifest JSON for sideloading the bot.

- **Auth**: **Public**
- **Response (200)**: Teams app manifest object

---

### POST /integrations/teams/message

Send a message to the Teams bot as the authenticated user.

- **Auth**: Any authenticated role
- **Request Body**:
```json
{
  "text": "show my timesheets"
}
```
- **Response (200)**:
```json
{
  "text": "You have 1 pending timesheet for March 1–15.",
  "suggestedActions": ["Submit", "View entries"]
}
```

---

### POST /integrations/notifications/send

Manually trigger all pending notification dispatches.

- **Auth**: `admin` or `pmo`
- **Request Body**: None
- **Response (200)**: Notification dispatch result summary

---

### GET /integrations/notifications

List all stored notification records.

- **Auth**: `admin` or `pmo`
- **Response (200)**: Array of notification objects

---

### POST /integrations/projects/upload

Upload a project tracking CSV to bulk-import charge code or project data.

- **Auth**: `admin`, `pmo`, or `finance`
- **Content-Type**: `multipart/form-data`
- **Request Body**: `file` field containing the CSV file
- **Response (200)**: Import result summary with counts of created/updated/skipped rows

| Error | Cause |
|-------|-------|
| 400 | No file attached or invalid CSV format |
| 401 | Unauthorized |
| 403 | Insufficient role |
