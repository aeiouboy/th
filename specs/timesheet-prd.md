# Timesheet Scope PRD (From CSV)

Source: `Timesheet Scope.csv`

## Objectives
The system should enable the organization to:
- Track actual effort spent by employees on projects, operational activities, and internal initiatives.
- Allocate labor costs to the correct charge codes / cost centers / projects.
- Monitor budget vs actual cost in near real-time.
- Provide transparency for cost allocation across business units, programs, and activities.
- Support management reporting for resource utilization and cost control.
- Analyze chargability and financial P/L (PE Cost) of team.

## Time Logging
Employees must be able to:
- Log time daily or weekly. But system will cut off every 15 and end of month.
- Allocate hours to one or more charge codes. Need to input minimum total of 8 hours / day.
- Split time across multiple activities in a day by selecting his/her registered tasks.
- Optional enter descriptions of work performed.

## Charge Code Structure
Charge codes must support hierarchical structure:
- Charge code can be defined at any level of the hierarchy.
- Mandatory to have charge code at top program level as minimum.
- Charge code id should have prefix or format to be easily differentiated for different level in hierarchy and able to roll up the charges.
- Charge code owner to be able to config and control access to each charge owner in the hierarchy and each charge owner can control who can charge to their charge code.

Example hierarchy:
- Program
- Project
- Activity Type
- Task

Charge code attributes:
- Charge Code ID
- Project / Program
- Cost Center
- Activity Category
- Budget Amount
- Charge Code Owner
- Charge Code Approver (default to charge Code Owner but can overide)
- Valid Date Range
- Billable / Non-Billable flag

## Approval Workflow
Timesheets must support approval process:
- Employee -> Line Manager -> Charge Code Approver

Functions:
- Submit weekly timesheet
- Charge approval (support bulk approval)
- Reject with comments
- Lock approved timesheets

## Budget Tracking
- Each charge code may contain a budgeted labor cost.
- System should calculate:
  - Actual Cost = Logged Hours x Employee Cost Rate by Job Grade

## Reporting & Analytics
The system must support dashboards /reports to monitor charging especially, actual charging vs planned and forecast if we will over the budget and which task is causing it. Also, the chargability of each team if we meet the target. Lastly, the financial impact from over budget as well as low chargability.

## User Roles
| Role | Responsibility |
|---|---|
| Employee | Log work hours |
| Charge Manager | Approve timesheet |
| PMO | Monitor project budget |
| Finance | Cost allocation |
| Admin | Manage charge codes |

## Expected Outputs
The system should generate:
1. Project cost reports
2. Program financial tracking
3. Resource utilization dashboards
4. Activity distribution analytics
5. Budget overrun alerts
6. Low Chargability alerts

## Advance Features
1. Easy & collaborative logging of work hour by employee via Teams chat/channel with suggested prompt, including easy chatbot for inquiry.
2. Reminder via Teams for all the roles that require actions.
3. Summary of complete and incomplete logging to remind the Charge Manager for any actions.
4. Weekly summary of insights and highlight to Program Owner and Cost Center Owner.
5. Able to upload or link to project tracking sheet for basic information.
6. Auto calendar for weekends, holidays, vacations.

## Acceptance Criteria
1. Employees can log time daily or weekly.
2. System enforces timesheet cutoff every 15th and end of month.
3. System requires minimum total 8 hours per day before timesheet submission.
4. Employees can allocate hours to one or more charge codes.
5. Employees can split time across multiple registered tasks in one day.
6. Employees can add optional work descriptions.
7. Charge codes support hierarchy levels: Program, Project, Activity Type, Task.
8. System supports charge code creation at any hierarchy level, with mandatory support at top program level.
9. Charge code ID supports prefix/format for level differentiation and charge roll-up.
10. Charge code owner can configure and control access in hierarchy.
11. Charge code stores required attributes: Charge Code ID, Project/Program, Cost Center, Activity Category, Budget Amount, Charge Code Owner, Charge Code Approver, Valid Date Range, Billable/Non-Billable flag.
12. Timesheet approval flow supports Employee -> Line Manager -> Charge Code Approver.
13. Approval functions support submit weekly timesheet, bulk approval, reject with comments, and lock approved timesheets.
14. System calculates actual cost as: `Actual Cost = Logged Hours x Employee Cost Rate by Job Grade`.
15. Reporting supports monitoring of actual vs planned charging, budget overrun forecast, overrun-driving tasks, team chargability vs target, and financial impact from over budget and low chargability.
16. System generates outputs: project cost reports, program financial tracking, resource utilization dashboards, activity distribution analytics, budget overrun alerts, and low chargability alerts.
17. Advanced features support Teams-based logging/inquiry, reminder notifications, incomplete logging summary for Charge Manager, weekly insight summary to Program Owner and Cost Center Owner, project tracking sheet upload/link, and auto calendar for weekends/holidays/vacations.
