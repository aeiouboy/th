# Database Schema

## Entity Relationship Diagram

```mermaid
erDiagram
    profiles ||--o{ timesheets : "creates"
    profiles ||--o{ charge_code_users : "assigned to"
    profiles ||--o{ approval_logs : "performs"
    profiles ||--o{ vacation_requests : "requests"
    profiles }o--o| profiles : "managed by"
    profiles ||--o{ charge_codes : "owns"
    profiles ||--o{ charge_codes : "approves"

    timesheets ||--o{ timesheet_entries : "contains"
    timesheets ||--o{ approval_logs : "reviewed in"

    charge_codes ||--o{ timesheet_entries : "charged to"
    charge_codes ||--o{ charge_code_users : "grants access"
    charge_codes ||--o| budgets : "tracked by"
    charge_codes }o--o| charge_codes : "parent of"

    profiles {
        uuid id PK
        varchar email
        varchar full_name
        varchar job_grade
        uuid manager_id FK
        user_role role
        varchar department
        timestamp created_at
        timestamp updated_at
    }

    cost_rates {
        serial id PK
        varchar job_grade
        numeric hourly_rate
        date effective_from
        date effective_to
    }

    charge_codes {
        varchar id PK
        varchar name
        varchar parent_id FK
        varchar path
        charge_code_level level
        varchar program_name
        varchar cost_center
        varchar activity_category
        numeric budget_amount
        uuid owner_id FK
        uuid approver_id FK
        date valid_from
        date valid_to
        boolean is_billable
        timestamp created_at
        timestamp updated_at
    }

    charge_code_users {
        varchar charge_code_id PK_FK
        uuid user_id PK_FK
    }

    timesheets {
        uuid id PK
        uuid user_id FK
        date period_start
        date period_end
        timesheet_status status
        timestamp submitted_at
        timestamp locked_at
        text rejection_comment
        timestamp created_at
        timestamp updated_at
    }

    timesheet_entries {
        uuid id PK
        uuid timesheet_id FK
        varchar charge_code_id FK
        date date
        numeric hours
        text description
        numeric calculated_cost
        timestamp created_at
    }

    approval_logs {
        serial id PK
        uuid timesheet_id FK
        uuid approver_id FK
        approval_action action
        text comment
        timestamp approved_at
        approval_type approval_type
    }

    budgets {
        varchar charge_code_id PK_FK
        numeric budget_amount
        numeric actual_spent
        numeric forecast_at_completion
        timestamp last_updated
    }

    calendar {
        serial id PK
        date date UK
        boolean is_weekend
        boolean is_holiday
        varchar holiday_name
        varchar country_code
    }

    vacation_requests {
        serial id PK
        uuid user_id FK
        date start_date
        date end_date
        vacation_status vacation_status
        uuid approved_by FK
        timestamp created_at
    }
```

## Table Definitions

### profiles

Stores user profile data, linked to Supabase Auth users by UUID.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `uuid` | PK | -- | Matches Supabase Auth user ID |
| `email` | `varchar(255)` | NOT NULL | -- | User email address |
| `full_name` | `varchar(255)` | nullable | -- | Display name |
| `job_grade` | `varchar(50)` | nullable | -- | Job grade (e.g., L1, L2, L3) used for cost rate lookup |
| `manager_id` | `uuid` | FK -> profiles.id | -- | Direct manager (self-referencing) |
| `role` | `user_role` enum | NOT NULL | `'employee'` | One of: `employee`, `charge_manager`, `pmo`, `finance`, `admin` |
| `department` | `varchar(255)` | nullable | -- | Department name |
| `created_at` | `timestamp` | NOT NULL | `now()` | Record creation time |
| `updated_at` | `timestamp` | NOT NULL | `now()` | Last update time |

### cost_rates

Lookup table mapping job grades to hourly cost rates, with effective date ranges.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `serial` | PK | auto | Auto-incrementing ID |
| `job_grade` | `varchar(50)` | NOT NULL | -- | Job grade identifier |
| `hourly_rate` | `numeric(10,2)` | NOT NULL | -- | Cost per hour |
| `effective_from` | `date` | NOT NULL | -- | Rate effective start date |
| `effective_to` | `date` | nullable | -- | Rate effective end date (null = current) |

### charge_codes

Hierarchical charge code structure using materialized path pattern.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `varchar(50)` | PK | -- | Human-readable code (e.g., `PROJ-001`) |
| `name` | `varchar(255)` | NOT NULL | -- | Descriptive name |
| `parent_id` | `varchar(50)` | FK -> charge_codes.id | -- | Parent charge code for hierarchy |
| `path` | `varchar(1000)` | nullable | -- | Materialized path (e.g., `PROG-001/PROJ-001`) |
| `level` | `charge_code_level` enum | nullable | -- | One of: `program`, `project`, `activity`, `task` |
| `program_name` | `varchar(255)` | nullable | -- | Top-level program name |
| `cost_center` | `varchar(100)` | nullable | -- | Associated cost center |
| `activity_category` | `varchar(100)` | nullable | -- | Activity category for reporting |
| `budget_amount` | `numeric(12,2)` | nullable | -- | Allocated budget |
| `owner_id` | `uuid` | FK -> profiles.id | -- | Charge code owner |
| `approver_id` | `uuid` | FK -> profiles.id | -- | Designated approver for timesheet entries |
| `valid_from` | `date` | nullable | -- | Start of validity period |
| `valid_to` | `date` | nullable | -- | End of validity period |
| `is_billable` | `boolean` | -- | `true` | Whether hours are billable |
| `created_at` | `timestamp` | NOT NULL | `now()` | Record creation time |
| `updated_at` | `timestamp` | NOT NULL | `now()` | Last update time |

### charge_code_users

Junction table assigning users to charge codes they can book time against.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `charge_code_id` | `varchar(50)` | PK, FK -> charge_codes.id | -- | Charge code |
| `user_id` | `uuid` | PK, FK -> profiles.id | -- | Assigned user |

**Primary Key**: Composite (`charge_code_id`, `user_id`)

### timesheets

Stores timesheet headers with period and approval status.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `uuid` | PK | `gen_random_uuid()` | Auto-generated UUID |
| `user_id` | `uuid` | NOT NULL, FK -> profiles.id | -- | Timesheet owner |
| `period_start` | `date` | NOT NULL | -- | Period start date |
| `period_end` | `date` | NOT NULL | -- | Period end date |
| `status` | `timesheet_status` enum | NOT NULL | `'draft'` | One of: `draft`, `submitted`, `manager_approved`, `cc_approved`, `locked`, `rejected` |
| `submitted_at` | `timestamp` | nullable | -- | When the timesheet was submitted |
| `locked_at` | `timestamp` | nullable | -- | When the timesheet was locked |
| `rejection_comment` | `text` | nullable | -- | Reason for rejection |
| `created_at` | `timestamp` | NOT NULL | `now()` | Record creation time |
| `updated_at` | `timestamp` | NOT NULL | `now()` | Last update time |

### timesheet_entries

Individual time entries within a timesheet.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `uuid` | PK | `gen_random_uuid()` | Auto-generated UUID |
| `timesheet_id` | `uuid` | NOT NULL, FK -> timesheets.id | -- | Parent timesheet |
| `charge_code_id` | `varchar(50)` | NOT NULL, FK -> charge_codes.id | -- | Charge code billed |
| `date` | `date` | NOT NULL | -- | Date of the entry |
| `hours` | `numeric(4,2)` | NOT NULL | -- | Hours worked |
| `description` | `text` | nullable | -- | Work description |
| `calculated_cost` | `numeric(10,2)` | nullable | -- | Computed cost (hours x rate) |
| `created_at` | `timestamp` | NOT NULL | `now()` | Record creation time |

### approval_logs

Audit trail for all approval and rejection actions.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `serial` | PK | auto | Auto-incrementing ID |
| `timesheet_id` | `uuid` | NOT NULL, FK -> timesheets.id | -- | Reviewed timesheet |
| `approver_id` | `uuid` | NOT NULL, FK -> profiles.id | -- | User who took the action |
| `action` | `approval_action` enum | NOT NULL | -- | One of: `approve`, `reject` |
| `comment` | `text` | nullable | -- | Approver's comment |
| `approved_at` | `timestamp` | NOT NULL | `now()` | When the action was taken |
| `approval_type` | `approval_type` enum | NOT NULL | -- | One of: `manager`, `charge_code` |

### budgets

Tracks budget consumption per charge code.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `charge_code_id` | `varchar(50)` | PK, FK -> charge_codes.id | -- | Charge code being tracked |
| `budget_amount` | `numeric(12,2)` | nullable | -- | Total budget allocation |
| `actual_spent` | `numeric(12,2)` | -- | `'0'` | Actual cost from approved entries |
| `forecast_at_completion` | `numeric(12,2)` | nullable | -- | Projected total cost at completion |
| `last_updated` | `timestamp` | NOT NULL | `now()` | Last recalculation time |

### calendar

Non-working day calendar for working day calculations.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `serial` | PK | auto | Auto-incrementing ID |
| `date` | `date` | UNIQUE, NOT NULL | -- | Calendar date |
| `is_weekend` | `boolean` | -- | `false` | Whether the date is a weekend |
| `is_holiday` | `boolean` | -- | `false` | Whether the date is a holiday |
| `holiday_name` | `varchar(255)` | nullable | -- | Name of the holiday |
| `country_code` | `varchar(2)` | -- | `'TH'` | Country code for regional holidays |

### vacation_requests

Employee vacation/leave requests with approval tracking.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `serial` | PK | auto | Auto-incrementing ID |
| `user_id` | `uuid` | NOT NULL, FK -> profiles.id | -- | Requesting user |
| `start_date` | `date` | NOT NULL | -- | Vacation start date |
| `end_date` | `date` | NOT NULL | -- | Vacation end date |
| `vacation_status` | `vacation_status` enum | NOT NULL | `'pending'` | One of: `pending`, `approved`, `rejected` |
| `approved_by` | `uuid` | FK -> profiles.id | -- | Manager who approved/rejected |
| `created_at` | `timestamp` | NOT NULL | `now()` | Request creation time |

## Enum Types

| Enum | Values |
|------|--------|
| `user_role` | `employee`, `charge_manager`, `pmo`, `finance`, `admin` |
| `charge_code_level` | `program`, `project`, `activity`, `task` |
| `timesheet_status` | `draft`, `submitted`, `manager_approved`, `cc_approved`, `locked`, `rejected` |
| `approval_action` | `approve`, `reject` |
| `approval_type` | `manager`, `charge_code` |
| `vacation_status` | `pending`, `approved`, `rejected` |
