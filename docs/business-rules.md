# Business Rules & Conditional Logic

Single source of truth สำหรับทุก threshold, status condition, และ business logic ในระบบ Timesheet

---

## 1. Timesheet Status Workflow

```
draft → submitted → manager_approved → cc_approved → locked
                 ↘ rejected (กลับแก้ไขได้) ↗
```

| Status | Badge Color | Editable | Action |
|--------|------------|----------|--------|
| draft | Stone (gray) | Yes | Employee กรอกเวลา |
| submitted | Blue | No | รอ Manager approve |
| manager_approved | Teal | No | รอ CC Owner approve |
| cc_approved | Emerald | No | CC Owner approved แล้ว |
| locked | Purple | No | ปิดถาวร (auto หรือ cutoff) |
| rejected | Red | Yes | ถูกตีกลับ แก้แล้ว resubmit ได้ |

### Auto-Lock Conditions
1. **Approval complete**: Manager approve + CC Owner approve ครบ → auto-lock
2. **No CC Owner needed**: Manager approve แล้ว ไม่มี charge code ที่มี owner/approver → auto-lock ทันที
3. **Cutoff scheduler**: วันที่ 15 และสิ้นเดือน lock ทุก timesheet ที่ `periodEnd <= cutoffDate`

---

## 2. Hours & Validation

| Rule | Threshold | Enforced At |
|------|-----------|-------------|
| Weekly target | **40h** | Dashboard progress bar |
| Daily minimum | **8h per weekday** | Submit validation (backend + frontend) |
| Future dates | **ไม่บังคับ** | Validation skip วันที่ > today |
| Future weeks | **บล็อก navigation** | ปุ่ม `>` disabled ถ้า current week |
| Weekend/Holiday | ไม่ require | ตรวจจาก calendar table |

### Dashboard Progress Bar Color
| Condition | Color | Meaning |
|-----------|-------|---------|
| ≥ 100% of 40h | Green (`--accent-green`) | Target met |
| ≥ 50% of 40h | Teal (`--accent-teal`) | On track |
| < 50% of 40h | Amber (`--accent-amber`) | Falling behind |

### Daily Cell Color
| Condition | Color |
|-----------|-------|
| hours ≥ 8h | Green background |
| 0 < hours < 8h | Amber background |
| 0h | Neutral (gray) |

### Missing Hours Alert
| Condition | Alert Level |
|-----------|-------------|
| missing > 20h | **Critical** (red) |
| 0 < missing ≤ 20h | **Warning** (amber) |

---

## 3. Chargeability

**Formula**: `(Billable Hours ÷ Total Hours) × 100`

**Target**: **80%**

| Range | Color | Status |
|-------|-------|--------|
| ≥ 80% | Green | On target |
| 60% - 79% | Amber | Below target |
| < 60% | Red | Critical |

**Used in**: Dashboard stat card, Reports chargeability gauge, P/L team breakdown, Chargeability alerts

---

## 4. Budget & Forecast

### Forecast Formula
```
Burn Rate         = Actual Spent ÷ Elapsed Days
Forecast at Completion = Actual Spent + (Burn Rate × Remaining Days)
```
- `Elapsed Days` = วันนับจาก `validFrom` ถึงวันนี้ (min 1)
- `Remaining Days` = วันนับจากวันนี้ถึง `validTo` (min 0)
- คำนวณได้เฉพาะ charge code ที่มี `validFrom` + `validTo`

### Budget Status Thresholds

| Condition | Severity | Label | Color |
|-----------|----------|-------|-------|
| actual > budget (>100%) | **Red** | Over Budget | Red dot |
| actual > 90% of budget | **Orange** | Critical | Orange dot |
| actual > 80% of budget | **Yellow** | Warning | Yellow dot |
| forecast > budget | **Yellow** | At Risk | Yellow dot |
| else | **Green** | On Track | Green dot |

### Budget Summary Cards
| Card | Formula |
|------|---------|
| Total Budget | SUM(budgetAmount) ทุก charge code |
| Total Spent | SUM(actualSpent) ทุก charge code |
| Remaining | Total Budget - Total Spent |
| Forecast | SUM(forecastAtCompletion) ทุก charge code |
| X over | COUNT where actual > budget |
| X at risk | COUNT where actual > 80% of budget OR forecast > budget |

### Actual Cost Calculation
```
Actual Cost = Logged Hours × Employee Cost Rate (by Job Grade)
```
- Cost rate มาจาก `cost_rates` table จับคู่ `jobGrade` + `effectiveDate`
- คำนวณโดย `budgets.service.recalculate()`

---

## 5. Approval Rules

### Stage 1: Manager Approval
| Condition | Result |
|-----------|--------|
| Timesheet status = `submitted` | Can approve |
| Approver = employee's `managerId` | Authorized |
| Approver ≠ employee's manager | **ForbiddenException** |
| No CC owners on charge codes | Auto-lock after approve |

### Stage 2: CC Owner Approval
| Condition | Result |
|-----------|--------|
| Status = `manager_approved` | Can approve |
| Approver = `chargeCode.ownerId` or `approverId` | Authorized |
| All required CC approvers approved | Auto-lock |

### Rejection
| From Status | Who Can Reject |
|-------------|---------------|
| submitted | Manager (employee's managerId) |
| manager_approved | CC Owner (chargeCode ownerId/approverId) |

Result: status → `rejected`, comment stored, timesheet editable again

### Bulk Approve
- Select multiple → approve all (same conditions per timesheet)

---

## 6. Charge Code Hierarchy

### Hierarchy Levels & Validation
| Level | Parent Required | Allowed Parent |
|-------|----------------|----------------|
| Program | No | None (top-level) |
| Project | Yes | Program |
| Activity | Yes | Project |
| Task | Yes | Activity |

### ID Prefix
| Level | Prefix | Example |
|-------|--------|---------|
| Program | PRG | PRG-001 |
| Project | PRJ | PRJ-001 |
| Activity | ACT | ACT-001 |
| Task | TSK | TSK-001 |

### Access Control (AC10)
| Caller | Can Modify Access? |
|--------|-------------------|
| `chargeCode.ownerId` | Yes |
| `chargeCode.approverId` | Yes |
| Role = `admin` | Yes (any charge code) |
| Role = `charge_manager` (not owner) | **No → 403** |
| Role = `employee` | **No → 403** |

---

## 7. Role-Based Access Control (RBAC)

### Roles & Permissions
| Feature | employee | charge_manager | pmo | finance | admin |
|---------|----------|---------------|-----|---------|-------|
| Log time | Yes | Yes | Yes | Yes | Yes |
| View own timesheet | Yes | Yes | Yes | Yes | Yes |
| Approve timesheets | No | Yes | Yes | No | Yes |
| View pending approvals | No | Yes | Yes | No | Yes |
| View budget alerts | No | Yes | Yes | Yes | Yes |
| View team status | No | Yes | Yes | Yes | Yes |
| Create charge codes | No | Yes | No | No | Yes |
| Modify CC access | No | Owner only | No | No | Yes |
| View reports | Yes | Yes | Yes | Yes | Yes |
| Admin pages (Users/Calendar/Rates) | No | No | No | No | Yes |
| Trigger notifications | No | No | Yes | No | Yes |
| Upload project CSV | No | No | Yes | Yes | Yes |

### Manager Role Check (Dashboard view)
```
isManager = role in ['admin', 'charge_manager', 'pmo', 'finance']
```
- Manager sees: Pending Approvals + Team Status + Alerts cards
- Employee sees: My Recent Entries + Personal Alerts cards

### Sidebar Navigation
| Section | Visible To |
|---------|-----------|
| Main (Dashboard, Time Entry, Charge Codes) | All roles |
| Approvals | admin, charge_manager, pmo |
| Insight (Reports, Budget) | All roles |
| Admin (Users, Calendar, Rates) | admin only |

---

## 8. Scheduler & Cutoff Rules

### Timesheet Cutoff
| Schedule | Cron | Action |
|----------|------|--------|
| Mid-month | `0 0 15 * *` (15th, 00:05) | Lock all timesheets with `periodEnd ≤ 15th` |
| End-of-month | `0 0 28-31 * *` (last day, 00:05) | Lock all timesheets with `periodEnd ≤ last day` |

**Locks**: submitted, manager_approved, cc_approved → all become `locked`

### Daily Reminder
| Schedule | Cron | Action |
|----------|------|--------|
| Weekday 9AM | `0 9 * * 1-5` | Notify users with draft/no timesheet |

### Weekly Insights
| Schedule | Cron | Action |
|----------|------|--------|
| Monday 7AM | `0 7 * * 1` | Send weekly summary to admin/pmo/finance |

### Budget Recalculation
| Schedule | Cron | Action |
|----------|------|--------|
| Daily 2AM | `0 2 * * *` | Recalculate actual costs for all charge codes |

---

## 9. Notification Rules

### Notification Types & Triggers
| Type | Trigger | Recipients |
|------|---------|-----------|
| `timesheet_reminder` | Daily 9AM (weekdays) | Users with draft/no timesheet |
| `approval_reminder` | Manual trigger | Managers with pending approvals |
| `manager_summary` | Manual trigger | Managers (team completion stats) |
| `weekly_insights` | Monday 7AM | admin, pmo, finance roles |

### Delivery Channels
1. **Database** — all notifications persisted to `notifications` table
2. **Teams Webhook** — Adaptive Card sent (fire-and-forget, optional via `TEAMS_WEBHOOK_URL`)
3. **In-app** — NotificationBell + /notifications page

### NotificationBell Badge Count
```
totalCount = budgetAlerts.length + chargeabilityAlerts.length + unreadPersonalNotifications
```

---

## 10. Calendar & Working Days

### Non-Working Days
| Type | Source |
|------|--------|
| Weekends | `calendar.isWeekend = true` (Sat, Sun) |
| Holidays | `calendar.isHoliday = true` + holiday name |
| Vacations | `vacation_requests.status = 'approved'` (per user) |

### Working Days Formula
```
Working Days = Total Calendar Days - Weekends - Holidays - Approved Vacations
```

Used for:
- Min 8h validation (skip non-working days)
- Utilization reports (available hours = working days × 8)
- Notification reminders (expected hours so far this week)

---

## 11. Reports Stat Cards

### P/L Financial Impact
| Card | Formula |
|------|---------|
| Over-budget cost | SUM(actual - budget) where actual > budget |
| Low chargeability gap | `(target% - actual%) × totalHours × avgCostRate` |
| Net P/L impact | overBudgetCost + lowChargeabilityCost |

### Utilization Rate
```
Utilization = (Logged Hours ÷ Available Hours) × 100
Available Hours = Working Days × 8
```

| Range | Color |
|-------|-------|
| ≥ 80% | Green |
| 60% - 79% | Amber |
| < 60% | Red |

---

## Quick Reference: All Thresholds

| Metric | Value | Purpose |
|--------|-------|---------|
| Weekly hours target | 40h | Progress tracking |
| Daily hours minimum | 8h | Submit validation |
| Chargeability target | 80% | Performance metric |
| Budget warning | 80% used | Yellow alert |
| Budget critical | 90% used | Orange alert |
| Budget over | 100% used | Red alert |
| Missing hours critical | > 20h | Red vs amber alert |
| Cutoff dates | 15th & last day of month | Auto-lock |
| Chargeability red zone | < 60% | Red color in reports |
