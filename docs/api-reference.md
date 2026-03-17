# API Reference

Base URL: `/api/v1`

All endpoints require a `Authorization: Bearer <token>` header unless marked as **Public**. Role restrictions are noted where applicable.

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

### POST /timesheets/:id/submit

Submit a timesheet for approval.

- **Auth**: Yes (owner only)
- **Request Body**: None
- **Response**: Updated timesheet with `status: "submitted"`
- **Errors**: 400 (not in draft status), 401, 404

---

## Charge Codes

### GET /charge-codes

List all charge codes with optional filters.

- **Auth**: Yes (any role)
- **Query Params**:
  - `level` (optional): `program`, `project`, `activity`, `task`
  - `status` (optional): filter by status
  - `billable` (optional): `true` or `false`
  - `search` (optional): text search
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

### PUT /charge-codes/:id/access

Update user access (assignments) for a charge code.

- **Auth**: Yes, **admin** or **charge_manager**
- **Request Body**:
```json
{
  "userIds": ["uuid1", "uuid2"]
}
```
- **Response**: Updated access list
- **Errors**: 400, 401, 403, 404

---

## Approvals

### GET /approvals/pending

Get timesheets pending the current user's approval.

- **Auth**: Yes (any role -- returns results relevant to the user)
- **Response**: Array of timesheet objects with user details
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

### GET /budgets/alerts

Get budget alerts (charge codes exceeding thresholds).

- **Auth**: Yes (any role)
- **Response**: Array of alert objects
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

## Reports

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

Get overall financial impact report.

- **Auth**: Yes (any role)
- **Response**: Aggregated financial metrics
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

### POST /integrations/projects/upload

Upload a project tracking CSV file.

- **Auth**: Yes, **admin**, **pmo**, or **finance**
- **Content-Type**: `multipart/form-data`
- **Request Body**: `file` field with CSV file
- **Response**: Import result summary
- **Errors**: 400 (no file), 401, 403
