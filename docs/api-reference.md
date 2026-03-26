# API Reference

Base URL: `/api/v1`

All endpoints require a `Authorization: Bearer <token>` header unless marked as **Public**. Role restrictions are noted where applicable.

## Pagination

Most list endpoints support offset-based pagination via two query parameters:

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | integer | `100` | `500` | Maximum number of records to return |
| `offset` | integer | `0` | — | Number of records to skip before returning results |

Example:
```
GET /api/v1/approvals/pending?limit=20&offset=40
```

Endpoints that use a different pagination scheme (such as `GET /budgets` which uses `page`/`limit`) document their parameters individually.

---

## Users

### GET /users/me

Get the current authenticated user's profile.

- **Auth**: Yes (any role)
- **Response**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "John Doe",
  "jobGrade": "L3",
  "managerId": "uuid",
  "role": "employee",
  "department": "Engineering",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

### PUT /users/me/avatar

Update the current user's avatar URL.

- **Auth**: Yes (any role)
- **Request Body**:
```json
{
  "avatarUrl": "https://storage.example.com/avatars/user-uuid.jpg"
}
```
- **Validation**: `avatarUrl` must be a valid HTTP or HTTPS URL.
- **Response**:
```json
{
  "avatarUrl": "https://storage.example.com/avatars/user-uuid.jpg"
}
```
- **Errors**: 400 (invalid or non-HTTP/S URL), 401 (unauthorized)

> **Storage note:** The frontend uploads files directly to the Supabase Storage bucket `avatars` (public, 2 MB limit) and then calls this endpoint with the resulting public URL. The backend stores only the URL string — it does not handle file uploads itself.

### PUT /users/me

Update the current user's profile.

- **Auth**: Yes (any role)
- **Request Body**:
```json
{
  "fullName": "John Doe",
  "department": "Engineering"
}
```
- **Response**: Updated profile object
- **Errors**: 400 (validation), 401 (unauthorized)

### GET /users

List all users.

- **Auth**: Yes, **admin** only
- **Response**: Array of profile objects
- **Errors**: 401, 403

### PUT /users/:id/role

Update a user's role.

- **Auth**: Yes, **admin** only
- **Request Body**:
```json
{
  "role": "charge_manager"
}
```
- **Response**: Updated profile object
- **Errors**: 400, 401, 403, 404

### PUT /users/:id/job-grade

Update a user's job grade.

- **Auth**: Yes, **admin** only
- **Request Body**:
```json
{
  "jobGrade": "L4"
}
```
- **Response**: Updated profile object
- **Errors**: 400, 401, 403, 404

---

## Timesheets

### POST /timesheets

Create a new timesheet.

- **Auth**: Yes (any role)
- **Request Body**:
```json
{
  "periodStart": "2026-03-01",
  "periodEnd": "2026-03-15"
}
```
- **Response**:
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
- **Errors**: 400, 401

### GET /timesheets

Get the current user's timesheet for a period.

- **Auth**: Yes (any role)
- **Query Params**: `period` (optional, date string, e.g. `2026-03-16`)
- **Response**: Timesheet object or null
- **Errors**: 401

### GET /timesheets/charge-codes

Get charge codes assigned to the current user.

- **Auth**: Yes (any role)
- **Response**: Array of charge code objects
- **Errors**: 401

### GET /timesheets/:id

Get a timesheet by ID.

- **Auth**: Yes (owner only)
- **Response**: Timesheet object
- **Errors**: 401, 404

### GET /timesheets/:id/entries

Get all entries for a timesheet.

- **Auth**: Yes (owner only)
- **Response**:
```json
[
  {
    "id": "uuid",
    "timesheetId": "uuid",
    "chargeCodeId": "PROJ-001",
    "date": "2026-03-01",
    "hours": "8.00",
    "description": "Development work",
    "calculatedCost": "400.00",
    "createdAt": "2026-03-01T00:00:00.000Z"
  }
]
```
- **Errors**: 401, 404

### PUT /timesheets/:id/entries

Create or update entries for a timesheet.

- **Auth**: Yes (owner only)
- **Request Body**:
```json
{
  "entries": [
    {
      "chargeCodeId": "PROJ-001",
      "date": "2026-03-01",
      "hours": 8,
      "description": "Development work"
    }
  ]
}
```
- **Response**: Array of upserted entry objects
- **Errors**: 400, 401, 404

### POST /timesheets/:id/copy-from-previous

Copy charge code rows from the previous period into the current draft timesheet. Hours are not copied — only the charge code structure.

- **Auth**: Yes (owner only)
- **Params**: `id` (UUID of the current draft timesheet)
- **Request Body**: None
- **Response**:
```json
{
  "entries": [
    {
      "id": "uuid",
      "timesheetId": "uuid",
      "chargeCodeId": "PROJ-001",
      "date": "2026-03-17",
      "hours": "0.00",
      "description": null,
      "calculatedCost": "0.00",
      "createdAt": "2026-03-17T00:00:00.000Z"
    }
  ]
}
```
- **Errors**:
  - `400` — no previous period timesheet found
  - `401` — unauthorized
  - `404` — timesheet not found

---

### POST /timesheets/:id/submit

Submit a timesheet for approval.

- **Auth**: Yes (owner only)
- **Request Body**: None
- **Response**: Updated timesheet with `status: "submitted"`
- **Errors**:
  - `400` — timesheet not in `draft` or `rejected` status
  - `400` — one or more weekdays have fewer than 8 hours logged (response body includes a `details` array listing each short day, e.g. `{ date: "2026-03-10", logged: 6, required: 8 }`)
  - `401` — unauthorized
  - `404` — timesheet not found

---

## Charge Codes

### GET /charge-codes

List all charge codes with optional filters and pagination.

- **Auth**: Yes (any role)
- **Query Params**:
  - `level` (optional): `program`, `project`, `activity`, `task`
  - `status` (optional): filter by status
  - `billable` (optional): `true` or `false`
  - `search` (optional): text search
  - `limit` (optional, default `50`): maximum number of records to return
  - `offset` (optional, default `0`): number of records to skip for pagination
- **Response**: Array of charge code objects
- **Errors**: 401

### GET /charge-codes/my

Get charge codes assigned to the current user.

- **Auth**: Yes (any role)
- **Response**: Array of charge code objects
- **Errors**: 401

### GET /charge-codes/tree

Get the full charge code hierarchy as a tree.

- **Auth**: Yes (any role)
- **Response**: Nested tree structure of charge codes
- **Errors**: 401

### POST /charge-codes

Create a new charge code.

- **Auth**: Yes, **admin** or **charge_manager**
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
- **Response**: Created charge code object
- **Errors**: 400, 401, 403

### GET /charge-codes/:id

Get a single charge code by ID.

- **Auth**: Yes (any role)
- **Response**: Charge code object
- **Errors**: 401, 404

### PUT /charge-codes/:id

Update a charge code.

- **Auth**: Yes, **admin** or **charge_manager**
- **Request Body**: Partial charge code fields
- **Response**: Updated charge code object
- **Errors**: 400, 401, 403, 404

### GET /charge-codes/:id/children

Get direct children of a charge code.

- **Auth**: Yes (any role)
- **Response**: Array of child charge code objects
- **Errors**: 401, 404

### GET /charge-codes/:id/budget-detail

Get budget breakdown for a charge code, including child charge codes and team breakdown.

- **Auth**: Yes (any role)
- **Response**:
```json
{
  "chargeCodeId": "PRG-001",
  "budget": 5000000,
  "actual": 3200000,
  "children": [
    {
      "chargeCodeId": "PRJ-001",
      "name": "Platform Modernization",
      "budget": 3000000,
      "actual": 2000000,
      "percentage": 67
    }
  ],
  "teamBreakdown": [
    {
      "team": "Engineering",
      "hours": 1200,
      "cost": 2400000,
      "percentage": 75
    }
  ],
  "personBreakdown": [
    {
      "userId": "uuid",
      "fullName": "Wichai Sukjai",
      "hours": 600,
      "cost": 1200000
    }
  ]
}
```
- **Errors**: 401, 404

### POST /charge-codes/:id/cascade-access

Propagate the current user access list of a charge code down to all child charge codes in a single transaction.

- **Auth**: Yes — **charge code owner**, **approver**, or **admin** only
- **Request Body**:
```json
{
  "userIds": ["uuid1", "uuid2"]
}
```
- **Response**:
```json
{
  "affected": 5
}
```
- **Errors**:
  - `401` — unauthorized
  - `403` — caller is not the charge code owner, approver, or admin
  - `404` — charge code not found

### POST /charge-codes/:id/request-access

Submit a request from the current user to be granted access to a charge code they are not assigned to.

- **Auth**: Yes (any role)
- **Request Body**:
```json
{
  "reason": "I need to log hours for the Q2 migration work"
}
```
- **Response**:
```json
{
  "requestId": "uuid",
  "status": "pending"
}
```
- **Errors**: 400, 401

### GET /charge-codes/access-requests/list

List access requests for charge codes where the current user is the owner or approver. Admins see all requests across all charge codes.

- **Auth**: Yes — **charge code owner**, **approver**, or **admin**
- **Response**:
```json
[
  {
    "id": "uuid",
    "requester": { "id": "uuid", "fullName": "Wichai Sukjai" },
    "chargeCode": { "id": "PRJ-002", "name": "CRM Platform" },
    "reason": "I need to log hours for the Q2 migration work",
    "status": "pending",
    "createdAt": "2026-03-18T10:00:00.000Z"
  }
]
```
- **Errors**: 401, 403

### PATCH /charge-codes/access-requests/:id

Approve or reject a charge code access request. Approving automatically grants `charge_code_access` to the requester.

- **Auth**: Yes — **charge code owner**, **approver**, or **admin**
- **Params**: `id` (UUID of the request)
- **Request Body**:
```json
{
  "status": "approved"
}
```
- **Response**: Updated request object
- **Errors**:
  - `400` — invalid status value
  - `401` — unauthorized
  - `403` — caller is not authorized to review this request
  - `404` — request not found

### PUT /charge-codes/:id/access

Update user access (assignments) for a charge code.

- **Auth**: Yes — **charge code owner**, **approver**, or **admin** only (AC10)
- **Request Body**:
```json
{
  "userIds": ["uuid1", "uuid2"]
}
```
- **Response**: Updated access list
- **Errors**:
  - `400` — invalid input
  - `401` — unauthorized
  - `403` — caller is not the charge code owner, approver, or admin
  - `404` — charge code not found

---

## Approvals

### GET /approvals/pending

Get timesheets pending the current user's approval, with optional search filtering (CR-12).

- **Auth**: Yes (any role -- returns results relevant to the caller's role)
- **Query Params**:
  - `search` (optional): filter by employee name, email, or department
- **Response**: Array of timesheet objects with user details. Each item now includes a `programs` field listing the charge code program names referenced by that timesheet's entries.
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "periodStart": "2026-03-01",
    "periodEnd": "2026-03-15",
    "status": "submitted",
    "user": { "id": "uuid", "fullName": "Wichai Sukjai", "department": "Engineering" },
    "programs": ["Digital Transformation", "CRM Platform"]
  }
]
```
- **Errors**: 401

### POST /approvals/:timesheet_id/approve

Approve a timesheet.

- **Auth**: Yes (manager or charge code approver)
- **Params**: `timesheet_id` (UUID)
- **Request Body**:
```json
{
  "comment": "Looks good"
}
```
- **Response**: Updated timesheet object
- **Errors**: 400, 401, 403, 404

### POST /approvals/:timesheet_id/reject

Reject a timesheet.

- **Auth**: Yes (manager or charge code approver)
- **Params**: `timesheet_id` (UUID)
- **Request Body**:
```json
{
  "comment": "Please correct the hours on March 5"
}
```
- **Response**: Updated timesheet object
- **Errors**: 400, 401, 403, 404

### POST /approvals/bulk-approve

Approve multiple timesheets at once.

- **Auth**: Yes (manager or charge code approver)
- **Request Body**:
```json
{
  "timesheet_ids": ["uuid1", "uuid2", "uuid3"]
}
```
- **Response**: Array of updated timesheet objects
- **Errors**: 400, 401, 403

### GET /approvals/history

Get the current user's approval action history.

- **Auth**: Yes (any role)
- **Response**: Array of approval log objects
- **Errors**: 401

### GET /approvals/:timesheet_id/detail

Get detailed view of a timesheet for approval review.

- **Auth**: Yes (any role)
- **Params**: `timesheet_id` (UUID)
- **Response**: Timesheet with entries, user details, and charge code info
- **Errors**: 401, 404

---

## Budgets

### GET /budgets

Get budget summaries with optional charge code filtering and pagination (CR-22).

- **Auth**: Yes — **admin**, **pmo**, or **finance** only
- **Query Params**:
  - `chargeCodeIds` (optional): comma-separated list of charge code IDs (e.g. `PRG-001,PRJ-002`)
  - `page` (optional, default `1`): page number (1-based)
  - `limit` (optional, default `20`, max `100`): items per page
- **Response**:
```json
{
  "data": [
    {
      "chargeCodeId": "PRG-001",
      "name": "Digital Transformation",
      "budget": 5000000,
      "actual": 3200000,
      "forecast": 4800000,
      "severity": "green"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```
- **Severity values**: `green` (≤80% used), `yellow` (80–90% or forecast overrun), `orange` (90–100%), `red` (>100%)
- **Errors**: 401, 403

### GET /budgets/:id/team-breakdown

Get team-level cost breakdown for a specific budget entry.

- **Auth**: Yes (any role)
- **Params**: `id` (budget UUID or charge code ID)
- **Response**:
```json
[
  {
    "team": "Engineering",
    "hours": 480,
    "cost": 960000,
    "percentage": 75
  },
  {
    "team": "QA",
    "hours": 120,
    "cost": 180000,
    "percentage": 14
  }
]
```
- **Errors**: 401, 404

### GET /budgets/alerts

Get budget alerts (charge codes exceeding thresholds).

- **Auth**: Yes (any role)
- **Response**: Array of alert objects
- **Errors**: 401

### GET /budgets/chargeability-alerts

Get chargeability alerts for employees who are below the target chargeability rate.

- **Auth**: Yes (any role)
- **Response**: Array of chargeability alert objects
- **Errors**: 401

### GET /budgets/summary

Get budget summary across all charge codes.

- **Auth**: Yes (any role)
- **Response**: Summary object with totals and per-charge-code breakdown
- **Errors**: 401

### POST /budgets/recalculate

Trigger a full budget recalculation.

- **Auth**: Yes, **admin** only
- **Request Body**: None
- **Response**: Recalculation result summary
- **Errors**: 401, 403

### GET /budgets/:charge_code_id

Get budget details for a specific charge code.

- **Auth**: Yes (any role)
- **Response**:
```json
{
  "chargeCodeId": "PROJ-001",
  "budgetAmount": "50000.00",
  "actualSpent": "32500.00",
  "forecastAtCompletion": "48000.00",
  "lastUpdated": "2026-03-15T00:00:00.000Z"
}
```
- **Errors**: 401, 404

### GET /budgets/:charge_code_id/forecast

Get forecast data for a charge code.

- **Auth**: Yes (any role)
- **Response**: Forecast object with projected spend
- **Errors**: 401, 404

---

## Calendar

### GET /calendar

Get calendar data for a year.

- **Auth**: Yes (any role)
- **Query Params**:
  - `year` (optional): e.g. `2026` (defaults to current year)
  - `country_code` (optional): e.g. `TH`
- **Response**: Array of calendar day objects
- **Errors**: 401

### GET /calendar/working-days

Get working day count between two dates.

- **Auth**: Yes (any role)
- **Query Params**:
  - `start` (required): date string
  - `end` (required): date string
- **Response**: Working day count and details
- **Errors**: 400, 401

### POST /calendar/holidays

Create a new holiday.

- **Auth**: Yes, **admin** only
- **Request Body**:
```json
{
  "date": "2026-04-13",
  "holidayName": "Songkran",
  "countryCode": "TH"
}
```
- **Response**: Created calendar entry
- **Errors**: 400, 401, 403

### PUT /calendar/holidays/:id

Update a holiday.

- **Auth**: Yes, **admin** only
- **Request Body**:
```json
{
  "holidayName": "Songkran Festival",
  "countryCode": "TH"
}
```
- **Response**: Updated calendar entry
- **Errors**: 400, 401, 403, 404

### DELETE /calendar/holidays/:id

Delete a holiday.

- **Auth**: Yes, **admin** only
- **Response**: Deleted confirmation
- **Errors**: 401, 403, 404

### POST /calendar/populate-weekends

Populate weekend entries for a given year.

- **Auth**: Yes, **admin** only
- **Request Body**:
```json
{
  "year": 2026
}
```
- **Response**: Count of weekend days created
- **Errors**: 400, 401, 403

---

## Vacations

### GET /vacations/me

Get the current user's vacation requests.

- **Auth**: Yes (any role)
- **Response**: Array of vacation request objects
- **Errors**: 401

### POST /vacations

Create a vacation request.

- **Auth**: Yes (any role)
- **Request Body**:
```json
{
  "startDate": "2026-04-14",
  "endDate": "2026-04-16"
}
```
- **Response**: Created vacation request
- **Errors**: 400, 401

### GET /vacations/pending

Get pending vacation requests for manager review.

- **Auth**: Yes, **charge_manager** or **admin**
- **Response**: Array of pending vacation request objects
- **Errors**: 401, 403

### POST /vacations/:id/approve

Approve a vacation request.

- **Auth**: Yes, **charge_manager** or **admin**
- **Response**: Updated vacation request with `status: "approved"`
- **Errors**: 401, 403, 404

### POST /vacations/:id/reject

Reject a vacation request.

- **Auth**: Yes, **charge_manager** or **admin**
- **Response**: Updated vacation request with `status: "rejected"`
- **Errors**: 401, 403, 404

---

## Dashboard

### GET /dashboard/chargeability-ytd

Get year-to-date chargeability data for the current user, broken down by month.

- **Auth**: Yes (any role)
- **Response**:
```json
{
  "ytdChargeability": 84.5,
  "months": [
    {
      "month": "2026-01",
      "chargeability": 87.2,
      "billableHours": 145,
      "totalHours": 166
    },
    {
      "month": "2026-02",
      "chargeability": 81.0,
      "billableHours": 130,
      "totalHours": 160
    }
  ]
}
```
- **Errors**: 401

### GET /dashboard/program-distribution

Get hours distribution across programs for the current user, with both current-period and YTD views.

- **Auth**: Yes (any role)
- **Response**:
```json
{
  "currentPeriod": [
    {
      "programName": "Digital Transformation",
      "programId": "PRG-001",
      "hours": 32,
      "percentage": 80
    }
  ],
  "ytd": [
    {
      "programName": "Digital Transformation",
      "programId": "PRG-001",
      "hours": 640,
      "percentage": 78
    }
  ]
}
```
- **Errors**: 401

---

## Reports

### GET /reports/by-program

Get budget vs actual, task distribution, and team distribution for a specific program (CR-13).

- **Auth**: Yes — **admin**, **pmo**, or **finance** only
- **Query Params**:
  - `programId` (required): charge code ID of the program
  - `period` (optional): month string, e.g. `2026-03`
- **Response**:
```json
{
  "program": { "id": "PRG-001", "name": "Digital Transformation" },
  "budget": 5000000,
  "actual": 3200000,
  "budgetVsActual": [
    { "name": "PRJ-001 Platform Mod.", "budget": 3000000, "actual": 2000000 }
  ],
  "taskDistribution": [
    { "category": "Development", "hours": 800, "percentage": 65 }
  ],
  "teamDistribution": [
    { "team": "Engineering", "hours": 960, "percentage": 78 }
  ]
}
```
- **Errors**: 400, 401, 404

### GET /reports/by-cost-center

Get chargeability and charge distribution for a specific cost center (CR-14).

- **Auth**: Yes — **admin**, **pmo**, or **finance** only
- **Query Params**:
  - `costCenter` (required): cost center identifier (maps to `profiles.department`, e.g. `DEPT-MER`)
  - `period` (optional): month string, e.g. `2026-03`
- **Response**:
```json
{
  "costCenter": "DEPT-MER",
  "chargeability": 83.5,
  "chargeDistribution": [
    { "chargeCodeId": "PRJ-001", "name": "Platform Mod.", "hours": 320, "isBillable": true }
  ],
  "nonChargeableHours": 40
}
```
- **Errors**: 400, 401

### GET /reports/by-person

Get hours history, project summary, vacation days, and total hours for a specific employee (CR-15).

- **Auth**: Yes — **admin**, **pmo**, or **finance** only
- **Query Params**:
  - `userId` (required): UUID of the employee
  - `periodFrom` (optional): start month, e.g. `2026-01`
  - `periodTo` (optional): end month, e.g. `2026-03`
- **Response**:
```json
{
  "person": { "id": "uuid", "fullName": "Wichai Sukjai", "jobGrade": "L3" },
  "totalHours": 160,
  "vacationDays": 2,
  "history": [
    { "month": "2026-01", "hours": 166, "chargeability": 87 }
  ],
  "projectSummary": [
    { "chargeCodeId": "PRJ-001", "name": "Platform Mod.", "hours": 128 }
  ]
}
```
- **Errors**: 400, 401, 404

### GET /reports/project-cost

Get project cost report for a charge code.

- **Auth**: Yes (any role)
- **Query Params**: `charge_code_id` (required)
- **Response**: Cost breakdown by user, period, and charge code
- **Errors**: 400, 401

### GET /reports/utilization

Get utilization report for a period.

- **Auth**: Yes (any role)
- **Query Params**: `period` (required, e.g. `2026-03`)
- **Response**: Per-user utilization percentages
- **Errors**: 400, 401

### GET /reports/chargeability

Get chargeability report.

- **Auth**: Yes (any role)
- **Query Params**: `team` (optional)
- **Response**: Billable vs non-billable hour ratios
- **Errors**: 401

### GET /reports/financial-impact

Get overall financial impact report with optional period and team filters.

- **Auth**: Yes (any role)
- **Query Params**:
  - `period` (optional): month string, e.g. `2026-03` — filters team and charge code breakdowns to that period
  - `team` (optional): department name — filters the `byTeam` array to a single team
- **Response**: Aggregated financial metrics with team and charge code breakdowns
- **Errors**: 401

### GET /reports/activity-distribution

Get activity distribution for a period.

- **Auth**: Yes (any role)
- **Query Params**: `period` (required, e.g. `2026-03`)
- **Response**: Hours distributed across activity categories
- **Errors**: 400, 401

### GET /reports/budget-alerts

Get budget alert report.

- **Auth**: Yes (any role)
- **Response**: Charge codes with budget warnings
- **Errors**: 401

---

## Integrations

### POST /integrations/teams/webhook

Microsoft Teams bot webhook endpoint.

- **Auth**: **Public** (no auth required -- verified by Bot Framework)
- **Request Body**: Bot Framework Activity object
- **Response**: Bot Framework Activity response
- **Errors**: N/A

### GET /integrations/teams/manifest

Get the Teams app manifest JSON.

- **Auth**: **Public**
- **Response**: Teams app manifest object

### POST /integrations/teams/message

Send a message to the Teams bot as an authenticated user.

- **Auth**: Yes (any role)
- **Request Body**:
```json
{
  "text": "show my timesheets"
}
```
- **Response**: Bot response with text and optional suggested actions
- **Errors**: 400, 401

### POST /integrations/notifications/send

Manually trigger all pending notifications.

- **Auth**: Yes, **admin** or **pmo**
- **Response**: Notification send result
- **Errors**: 401, 403

### GET /integrations/notifications

Get all stored notifications.

- **Auth**: Yes, **admin** or **pmo**
- **Response**: Array of notification objects
- **Errors**: 401, 403

---

## Notifications

User-facing notification inbox. Each notification is addressed to a specific user and tracks read state.

### GET /notifications

Get the authenticated user's notifications with optional pagination and filtering.

- **Auth**: Yes (any role)
- **Query Params**:
  - `limit` (optional, default `20`): maximum number of notifications to return
  - `offset` (optional, default `0`): number of notifications to skip (for pagination)
  - `unreadOnly` (optional): `true` to return only unread notifications
- **Response**:
```json
[
  {
    "id": "uuid",
    "type": "timesheet_reminder",
    "recipientId": "uuid",
    "subject": "Timesheet Reminder",
    "body": "You have logged 16h out of 24h expected so far this week...",
    "isRead": false,
    "createdAt": "2026-03-18T08:00:00.000Z",
    "readAt": null
  }
]
```
- **Notification types**: `timesheet_reminder`, `approval_reminder`, `manager_summary`, `weekly_insights`
- **Errors**: 401

### GET /notifications/unread-count

Get the count of unread notifications for the authenticated user.

- **Auth**: Yes (any role)
- **Response**:
```json
{
  "count": 3
}
```
- **Errors**: 401

### PATCH /notifications/:id/read

Mark a single notification as read.

- **Auth**: Yes (owner of the notification only)
- **Params**: `id` (UUID of the notification)
- **Request Body**: None
- **Response**: Updated notification object with `isRead: true` and `readAt` timestamp set
- **Errors**:
  - `401` — unauthorized
  - `403` — notification belongs to a different user
  - `404` — notification not found

### POST /notifications/read-all

Mark all of the authenticated user's notifications as read.

- **Auth**: Yes (any role)
- **Request Body**: None
- **Response**:
```json
{
  "success": true
}
```
- **Errors**: 401

### POST /integrations/projects/upload

Upload a project tracking CSV file.

- **Auth**: Yes, **admin**, **pmo**, or **finance**
- **Content-Type**: `multipart/form-data`
- **Request Body**: `file` field with CSV file
- **Response**: Import result summary
- **Errors**: 400 (no file), 401, 403
