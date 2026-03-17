// Shared test fixtures for the timesheet system

export const mockUser = {
  id: 'user-1',
  email: 'john.doe@company.com',
  fullName: 'John Doe',
  role: 'employee',
  department: 'Engineering',
  jobGrade: 'L5',
};

export const mockManagerUser = {
  id: 'user-2',
  email: 'manager@company.com',
  fullName: 'Jane Manager',
  role: 'charge_manager',
  department: 'Engineering',
  jobGrade: 'L7',
};

export const mockTimesheet = {
  id: 'ts-1',
  userId: 'user-1',
  periodStart: '2026-03-09',
  periodEnd: '2026-03-15',
  status: 'draft',
  submittedAt: null,
};

export const mockChargeCodes = [
  { chargeCodeId: 'PRJ-042', name: 'Web Portal', isBillable: true, programName: 'Digital Transformation', activityCategory: 'Development' },
  { chargeCodeId: 'ACT-010', name: 'Code Review', isBillable: true, programName: 'Digital Transformation', activityCategory: 'Review' },
  { chargeCodeId: 'TSK-005', name: 'Meetings', isBillable: false, programName: 'Operations', activityCategory: 'General' },
];

export const mockEntries = [
  { id: 'e1', chargeCodeId: 'PRJ-042', date: '2026-03-09', hours: '4.00', description: null, chargeCodeName: 'Web Portal', isBillable: true },
  { id: 'e2', chargeCodeId: 'ACT-010', date: '2026-03-09', hours: '2.00', description: null, chargeCodeName: 'Code Review', isBillable: true },
  { id: 'e3', chargeCodeId: 'TSK-005', date: '2026-03-09', hours: '2.00', description: null, chargeCodeName: 'Meetings', isBillable: false },
];

export const mockPendingTimesheets = [
  {
    id: 'pts-1',
    userId: 'emp-1',
    periodStart: '2026-03-09',
    periodEnd: '2026-03-15',
    status: 'submitted',
    submittedAt: '2026-03-15T08:00:00',
    totalHours: 40,
    employee: {
      id: 'emp-1',
      fullName: 'Alice Smith',
      email: 'alice@company.com',
      department: 'Engineering',
    },
  },
  {
    id: 'pts-2',
    userId: 'emp-2',
    periodStart: '2026-03-09',
    periodEnd: '2026-03-15',
    status: 'submitted',
    submittedAt: '2026-03-14T09:00:00',
    totalHours: 38,
    employee: {
      id: 'emp-2',
      fullName: 'Bob Jones',
      email: 'bob@company.com',
      department: 'Design',
    },
  },
];

export const mockChargeCodeTree = [
  {
    id: 'PRG-001',
    name: 'Digital Transformation',
    level: 'program',
    parentId: null,
    budgetAmount: '500000',
    isBillable: true,
    children: [
      {
        id: 'PRJ-001',
        name: 'Web Portal Redesign',
        level: 'project',
        parentId: 'PRG-001',
        budgetAmount: '200000',
        isBillable: true,
        children: [],
      },
    ],
  },
  {
    id: 'PRG-002',
    name: 'Operations',
    level: 'program',
    parentId: null,
    budgetAmount: null,
    isBillable: false,
    children: [],
  },
];

export const mockBudgetData = [
  { chargeCodeId: 'PRJ-042', chargeCodeName: 'Web Portal', budgetAmount: 200000, actualSpent: 150000, forecast: 190000 },
  { chargeCodeId: 'PRJ-018', chargeCodeName: 'Analytics Platform', budgetAmount: 80000, actualSpent: 72000, forecast: 85000 },
];

export const mockBudgetSummary = {
  totalBudget: 1000000,
  totalActualSpent: 642000,
  totalForecast: 980000,
  overallPercentage: 64,
  chargeCodesOverBudget: 2,
  chargeCodesAtRisk: 3,
  totalChargeCodes: 15,
};

export const mockBudgetAlerts = [
  {
    chargeCodeId: 'PRJ-042',
    name: 'Web Portal Redesign',
    budget: 200000,
    actual: 184000,
    forecast: 212000,
    severity: 'red',
    rootCauseActivity: 'ACT-015 Development',
  },
  {
    chargeCodeId: 'PRJ-018',
    name: 'Analytics Platform',
    budget: 80000,
    actual: 72000,
    forecast: 85000,
    severity: 'orange',
    rootCauseActivity: null,
  },
];

export const mockChargeabilityMembers = [
  { userId: 'u1', fullName: 'Alice Smith', chargeabilityRate: 85 },
  { userId: 'u2', fullName: 'Bob Jones', chargeabilityRate: 72 },
  { userId: 'u3', fullName: 'Carol White', chargeabilityRate: 65 },
];

export const mockActivityData = [
  { category: 'Development', hours: 120, percentage: 50 },
  { category: 'Review', hours: 60, percentage: 25 },
  { category: 'Meetings', hours: 30, percentage: 12.5 },
  { category: 'Documentation', hours: 30, percentage: 12.5 },
];

export const mockUtilizationData = [
  { department: 'Engineering', rate: 85, loggedHours: 320, availableHours: 376 },
  { department: 'Design', rate: 72, loggedHours: 200, availableHours: 278 },
  { department: 'QA', rate: 65, loggedHours: 150, availableHours: 231 },
];

export const mockAssignedUsers = [
  { userId: 'u1', email: 'alice@company.com', fullName: 'Alice Smith' },
  { userId: 'u2', email: 'bob@company.com', fullName: 'Bob Jones' },
];

export const mockAdminUsers = [
  { id: 'u1', email: 'alice@company.com', fullName: 'Alice Smith', role: 'employee', jobGrade: 'L4', department: 'Engineering', isActive: true },
  { id: 'u2', email: 'bob@company.com', fullName: 'Bob Jones', role: 'charge_manager', jobGrade: 'L6', department: 'Design', isActive: true },
];

export const mockRates = [
  { id: 'r1', jobGrade: 'L4', hourlyRate: '85.00', effectiveFrom: '2026-01-01', effectiveTo: null },
  { id: 'r2', jobGrade: 'L5', hourlyRate: '100.00', effectiveFrom: '2026-01-01', effectiveTo: null },
];

export const mockHolidays = [
  { id: '1', date: '2026-01-01', name: 'New Year\'s Day', country: 'TH' },
  { id: '2', date: '2026-12-25', name: 'Christmas Day', country: 'TH' },
];
