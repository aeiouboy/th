-- Seed data for Timesheet & Cost Allocation System
-- Run against Supabase PostgreSQL

BEGIN;

-- ============================================================
-- PROFILES (4 additional users; admin already exists)
-- ============================================================
INSERT INTO profiles (id, email, full_name, job_grade, manager_id, role, department) VALUES
  ('a1b2c3d4-1111-4000-8000-000000000001', 'somchai.p@central.co.th',  'Somchai Prasert',   'L4', 'd3055e90-4396-4fb6-95fa-3767eafb8349', 'pmo',            'PMO'),
  ('a1b2c3d4-2222-4000-8000-000000000002', 'nattaya.k@central.co.th',  'Nattaya Kaewkla',   'L3', 'd3055e90-4396-4fb6-95fa-3767eafb8349', 'charge_manager', 'Finance'),
  ('a1b2c3d4-3333-4000-8000-000000000003', 'wichai.s@central.co.th',   'Wichai Srisuk',     'L2', 'a1b2c3d4-2222-4000-8000-000000000002', 'employee',       'Engineering'),
  ('a1b2c3d4-4444-4000-8000-000000000004', 'ploy.r@central.co.th',     'Ploy Rattanaporn',  'L2', 'a1b2c3d4-2222-4000-8000-000000000002', 'employee',       'Engineering')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CHARGE CODES (8 codes, hierarchical, mix of levels)
-- ============================================================
INSERT INTO charge_codes (id, name, parent_id, path, level, program_name, cost_center, activity_category, budget_amount, owner_id, approver_id, valid_from, valid_to, is_billable) VALUES
  ('PRG-001',      'Digital Transformation',   NULL,        'PRG-001',                      'program',  'Digital Transformation', 'CC-100', NULL,              5000000.00, 'd3055e90-4396-4fb6-95fa-3767eafb8349', 'd3055e90-4396-4fb6-95fa-3767eafb8349', '2026-01-01', '2026-12-31', true),
  ('PRJ-001',      'ERP Migration',            'PRG-001',   'PRG-001/PRJ-001',              'project',  'Digital Transformation', 'CC-100', NULL,              2000000.00, 'a1b2c3d4-1111-4000-8000-000000000001', 'd3055e90-4396-4fb6-95fa-3767eafb8349', '2026-01-01', '2026-06-30', true),
  ('PRJ-002',      'Mobile App Redesign',       'PRG-001',   'PRG-001/PRJ-002',              'project',  'Digital Transformation', 'CC-100', NULL,              1500000.00, 'a1b2c3d4-1111-4000-8000-000000000001', 'd3055e90-4396-4fb6-95fa-3767eafb8349', '2026-01-01', '2026-09-30', true),
  ('ACT-001',      'Backend Development',       'PRJ-001',   'PRG-001/PRJ-001/ACT-001',      'activity', 'Digital Transformation', 'CC-100', 'Development',     800000.00, 'a1b2c3d4-2222-4000-8000-000000000002', 'a1b2c3d4-1111-4000-8000-000000000001', '2026-01-01', '2026-06-30', true),
  ('ACT-002',      'Frontend Development',      'PRJ-001',   'PRG-001/PRJ-001/ACT-002',      'activity', 'Digital Transformation', 'CC-100', 'Development',     600000.00, 'a1b2c3d4-2222-4000-8000-000000000002', 'a1b2c3d4-1111-4000-8000-000000000001', '2026-01-01', '2026-06-30', true),
  ('TSK-001',      'API Integration',           'ACT-001',   'PRG-001/PRJ-001/ACT-001/TSK-001', 'task', 'Digital Transformation', 'CC-100', 'Development',     200000.00, 'a1b2c3d4-2222-4000-8000-000000000002', 'a1b2c3d4-2222-4000-8000-000000000002', '2026-02-01', '2026-04-30', true),
  ('ACT-OPS-001',  'General Operations',        NULL,        'ACT-OPS-001',                  'activity', NULL,                     'CC-200', 'Operations',      500000.00, 'd3055e90-4396-4fb6-95fa-3767eafb8349', 'd3055e90-4396-4fb6-95fa-3767eafb8349', '2026-01-01', '2026-12-31', false),
  ('ACT-TRN-001',  'Staff Training',            NULL,        'ACT-TRN-001',                  'activity', NULL,                     'CC-300', 'Training',        300000.00, 'a1b2c3d4-1111-4000-8000-000000000001', 'd3055e90-4396-4fb6-95fa-3767eafb8349', '2026-01-01', '2026-12-31', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CHARGE CODE USERS (assignments)
-- ============================================================
INSERT INTO charge_code_users (charge_code_id, user_id) VALUES
  -- Admin user
  ('PRG-001',     'd3055e90-4396-4fb6-95fa-3767eafb8349'),
  ('ACT-OPS-001', 'd3055e90-4396-4fb6-95fa-3767eafb8349'),
  ('ACT-TRN-001', 'd3055e90-4396-4fb6-95fa-3767eafb8349'),
  -- PMO user
  ('PRJ-001',     'a1b2c3d4-1111-4000-8000-000000000001'),
  ('PRJ-002',     'a1b2c3d4-1111-4000-8000-000000000001'),
  ('ACT-TRN-001', 'a1b2c3d4-1111-4000-8000-000000000001'),
  -- Charge manager
  ('ACT-001',     'a1b2c3d4-2222-4000-8000-000000000002'),
  ('ACT-002',     'a1b2c3d4-2222-4000-8000-000000000002'),
  ('TSK-001',     'a1b2c3d4-2222-4000-8000-000000000002'),
  ('ACT-OPS-001', 'a1b2c3d4-2222-4000-8000-000000000002'),
  -- Employee 1
  ('ACT-001',     'a1b2c3d4-3333-4000-8000-000000000003'),
  ('TSK-001',     'a1b2c3d4-3333-4000-8000-000000000003'),
  ('ACT-OPS-001', 'a1b2c3d4-3333-4000-8000-000000000003'),
  -- Employee 2
  ('ACT-002',     'a1b2c3d4-4444-4000-8000-000000000004'),
  ('PRJ-002',     'a1b2c3d4-4444-4000-8000-000000000004'),
  ('ACT-TRN-001', 'a1b2c3d4-4444-4000-8000-000000000004')
ON CONFLICT DO NOTHING;

-- ============================================================
-- TIMESHEETS (5 timesheets across users/statuses)
-- ============================================================
INSERT INTO timesheets (id, user_id, period_start, period_end, status, submitted_at, locked_at) VALUES
  ('00000001-0000-4000-8000-000000000001', 'd3055e90-4396-4fb6-95fa-3767eafb8349', '2026-03-01', '2026-03-15', 'draft',            NULL, NULL),
  ('00000002-0000-4000-8000-000000000002', 'a1b2c3d4-3333-4000-8000-000000000003', '2026-03-01', '2026-03-15', 'submitted',         '2026-03-14 09:00:00', NULL),
  ('00000003-0000-4000-8000-000000000003', 'a1b2c3d4-3333-4000-8000-000000000003', '2026-02-16', '2026-02-28', 'manager_approved',  '2026-02-27 17:00:00', NULL),
  ('00000004-0000-4000-8000-000000000004', 'a1b2c3d4-4444-4000-8000-000000000004', '2026-02-01', '2026-02-15', 'locked',            '2026-02-14 16:00:00', '2026-02-20 10:00:00'),
  ('00000005-0000-4000-8000-000000000005', 'a1b2c3d4-4444-4000-8000-000000000004', '2026-03-01', '2026-03-15', 'draft',             NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TIMESHEET ENTRIES (20+ entries)
-- ============================================================
INSERT INTO timesheet_entries (id, timesheet_id, charge_code_id, date, hours, description, calculated_cost) VALUES
  -- Admin draft timesheet
  ('e000000001-0000-4000-8000-000000000001', '0000000001-0000-4000-8000-000000000001', 'PRG-001',     '2026-03-03', 8.00, 'Program planning and review',       12000.00),
  ('e000000002-0000-4000-8000-000000000002', '0000000001-0000-4000-8000-000000000001', 'ACT-OPS-001', '2026-03-04', 4.00, 'Team standup and operations',        6000.00),
  ('e000000003-0000-4000-8000-000000000003', '0000000001-0000-4000-8000-000000000001', 'ACT-TRN-001', '2026-03-04', 4.00, 'New hire onboarding training',       6000.00),
  ('e000000004-0000-4000-8000-000000000004', '0000000001-0000-4000-8000-000000000001', 'PRG-001',     '2026-03-05', 8.00, 'Budget review meeting',              12000.00),
  ('e000000005-0000-4000-8000-000000000005', '0000000001-0000-4000-8000-000000000001', 'ACT-OPS-001', '2026-03-06', 6.00, 'Vendor coordination',                9000.00),
  -- Employee 1 submitted timesheet
  ('e000000006-0000-4000-8000-000000000006', '0000000002-0000-4000-8000-000000000002', 'ACT-001',     '2026-03-03', 8.00, 'API endpoint development',           4000.00),
  ('e000000007-0000-4000-8000-000000000007', '0000000002-0000-4000-8000-000000000002', 'ACT-001',     '2026-03-04', 6.00, 'Database migration scripts',         3000.00),
  ('e000000008-0000-4000-8000-000000000008', '0000000002-0000-4000-8000-000000000002', 'TSK-001',     '2026-03-04', 2.00, 'Integration testing setup',          1000.00),
  ('e000000009-0000-4000-8000-000000000009', '0000000002-0000-4000-8000-000000000002', 'TSK-001',     '2026-03-05', 8.00, 'REST API integration',               4000.00),
  ('e000000010-0000-4000-8000-000000000010', '0000000002-0000-4000-8000-000000000002', 'ACT-OPS-001', '2026-03-06', 2.00, 'Sprint retrospective',               1000.00),
  ('e000000011-0000-4000-8000-000000000011', '0000000002-0000-4000-8000-000000000002', 'ACT-001',     '2026-03-06', 6.00, 'Code review and refactoring',        3000.00),
  -- Employee 1 manager_approved timesheet (Feb)
  ('e000000012-0000-4000-8000-000000000012', '0000000003-0000-4000-8000-000000000003', 'ACT-001',     '2026-02-16', 8.00, 'Service layer implementation',       4000.00),
  ('e000000013-0000-4000-8000-000000000013', '0000000003-0000-4000-8000-000000000003', 'ACT-001',     '2026-02-17', 8.00, 'Unit test writing',                  4000.00),
  ('e000000014-0000-4000-8000-000000000014', '0000000003-0000-4000-8000-000000000003', 'TSK-001',     '2026-02-18', 4.00, 'API documentation',                  2000.00),
  ('e000000015-0000-4000-8000-000000000015', '0000000003-0000-4000-8000-000000000003', 'ACT-OPS-001', '2026-02-18', 4.00, 'Team meeting',                       2000.00),
  ('e000000016-0000-4000-8000-000000000016', '0000000003-0000-4000-8000-000000000003', 'ACT-001',     '2026-02-19', 8.00, 'Bug fixing sprint',                  4000.00),
  -- Employee 2 locked timesheet (Feb)
  ('e000000017-0000-4000-8000-000000000017', '0000000004-0000-4000-8000-000000000004', 'ACT-002',     '2026-02-02', 8.00, 'React component development',        4000.00),
  ('e000000018-0000-4000-8000-000000000018', '0000000004-0000-4000-8000-000000000004', 'ACT-002',     '2026-02-03', 8.00, 'UI/UX implementation',               4000.00),
  ('e000000019-0000-4000-8000-000000000019', '0000000004-0000-4000-8000-000000000004', 'PRJ-002',     '2026-02-04', 6.00, 'Mobile app wireframe review',        3000.00),
  ('e000000020-0000-4000-8000-000000000020', '0000000004-0000-4000-8000-000000000004', 'ACT-TRN-001', '2026-02-04', 2.00, 'React training session',             1000.00),
  ('e000000021-0000-4000-8000-000000000021', '0000000004-0000-4000-8000-000000000004', 'ACT-002',     '2026-02-05', 8.00, 'Responsive design implementation',   4000.00),
  -- Employee 2 draft timesheet (Mar)
  ('e000000022-0000-4000-8000-000000000022', '0000000005-0000-4000-8000-000000000005', 'ACT-002',     '2026-03-03', 8.00, 'Dashboard component build',          4000.00),
  ('e000000023-0000-4000-8000-000000000023', '0000000005-0000-4000-8000-000000000005', 'PRJ-002',     '2026-03-04', 4.00, 'Design system updates',              2000.00),
  ('e000000024-0000-4000-8000-000000000024', '0000000005-0000-4000-8000-000000000005', 'ACT-TRN-001', '2026-03-04', 4.00, 'CSS Grid workshop',                  2000.00)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- APPROVAL LOGS
-- ============================================================
INSERT INTO approval_logs (timesheet_id, approver_id, action, comment, approved_at, approval_type) VALUES
  ('0000000003-0000-4000-8000-000000000003', 'a1b2c3d4-2222-4000-8000-000000000002', 'approve', 'Looks good, approved.',                   '2026-02-28 09:00:00', 'manager'),
  ('0000000004-0000-4000-8000-000000000004', 'a1b2c3d4-2222-4000-8000-000000000002', 'approve', 'All entries verified.',                    '2026-02-16 10:00:00', 'manager'),
  ('0000000004-0000-4000-8000-000000000004', 'a1b2c3d4-1111-4000-8000-000000000001', 'approve', 'Charge code allocations confirmed.',       '2026-02-18 14:00:00', 'charge_code'),
  ('0000000002-0000-4000-8000-000000000002', 'a1b2c3d4-2222-4000-8000-000000000002', 'reject',  'Please add descriptions to 2 entries.',    '2026-03-15 11:00:00', 'manager')
ON CONFLICT DO NOTHING;

-- ============================================================
-- BUDGETS (4 budgets, some near/over threshold)
-- ============================================================
INSERT INTO budgets (charge_code_id, budget_amount, actual_spent, forecast_at_completion) VALUES
  ('PRJ-001',      2000000.00, 1750000.00, 2100000.00),
  ('PRJ-002',      1500000.00,  400000.00,  900000.00),
  ('ACT-001',       800000.00,  720000.00,  850000.00),
  ('ACT-OPS-001',   500000.00,  180000.00,  360000.00)
ON CONFLICT (charge_code_id) DO UPDATE SET
  budget_amount = EXCLUDED.budget_amount,
  actual_spent = EXCLUDED.actual_spent,
  forecast_at_completion = EXCLUDED.forecast_at_completion,
  last_updated = NOW();

-- ============================================================
-- CALENDAR (March 2026 working days + 2 holidays)
-- ============================================================
INSERT INTO calendar (date, is_weekend, is_holiday, holiday_name, country_code) VALUES
  ('2026-03-01', true,  false, NULL, 'TH'),
  ('2026-03-02', false, false, NULL, 'TH'),
  ('2026-03-03', false, false, NULL, 'TH'),
  ('2026-03-04', false, false, NULL, 'TH'),
  ('2026-03-05', false, false, NULL, 'TH'),
  ('2026-03-06', false, false, NULL, 'TH'),
  ('2026-03-07', true,  false, NULL, 'TH'),
  ('2026-03-08', true,  false, NULL, 'TH'),
  ('2026-03-09', false, false, NULL, 'TH'),
  ('2026-03-10', false, false, NULL, 'TH'),
  ('2026-03-11', false, false, NULL, 'TH'),
  ('2026-03-12', false, false, NULL, 'TH'),
  ('2026-03-13', false, true,  'Makha Bucha Day', 'TH'),
  ('2026-03-14', true,  false, NULL, 'TH'),
  ('2026-03-15', true,  false, NULL, 'TH'),
  ('2026-03-16', false, false, NULL, 'TH'),
  ('2026-03-17', false, false, NULL, 'TH'),
  ('2026-03-18', false, false, NULL, 'TH'),
  ('2026-03-19', false, false, NULL, 'TH'),
  ('2026-03-20', false, false, NULL, 'TH'),
  ('2026-03-21', true,  false, NULL, 'TH'),
  ('2026-03-22', true,  false, NULL, 'TH'),
  ('2026-03-23', false, false, NULL, 'TH'),
  ('2026-03-24', false, false, NULL, 'TH'),
  ('2026-03-25', false, false, NULL, 'TH'),
  ('2026-03-26', false, false, NULL, 'TH'),
  ('2026-03-27', false, false, NULL, 'TH'),
  ('2026-03-28', true,  false, NULL, 'TH'),
  ('2026-03-29', true,  false, NULL, 'TH'),
  ('2026-03-30', false, false, NULL, 'TH'),
  ('2026-03-31', false, false, NULL, 'TH'),
  -- April 6 = Chakri Day
  ('2026-04-06', false, true, 'Chakri Memorial Day', 'TH')
ON CONFLICT (date) DO NOTHING;

-- ============================================================
-- VACATION REQUESTS
-- ============================================================
INSERT INTO vacation_requests (user_id, start_date, end_date, vacation_status, approved_by) VALUES
  ('a1b2c3d4-3333-4000-8000-000000000003', '2026-04-13', '2026-04-17', 'pending',  NULL),
  ('a1b2c3d4-4444-4000-8000-000000000004', '2026-03-23', '2026-03-25', 'approved', 'a1b2c3d4-2222-4000-8000-000000000002'),
  ('a1b2c3d4-3333-4000-8000-000000000003', '2026-05-01', '2026-05-02', 'pending',  NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- COST RATES
-- ============================================================
INSERT INTO cost_rates (job_grade, hourly_rate, effective_from, effective_to) VALUES
  ('L2', 500.00,  '2026-01-01', NULL),
  ('L3', 750.00,  '2026-01-01', NULL),
  ('L4', 1000.00, '2026-01-01', NULL),
  ('L5', 1500.00, '2026-01-01', NULL)
ON CONFLICT DO NOTHING;

COMMIT;
