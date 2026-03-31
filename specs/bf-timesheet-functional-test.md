# Plan: Business Functional Test Suite — Timesheet Core Functions

## Task Description
สร้างชุดทดสอบ Business Functional Test สำหรับระบบ Timesheet เพื่อยืนยันว่าทุก business flow ทำงานถูกต้องจากมุมมองผู้ใช้งานจริง ทดสอบบน local ก่อน commit และ deploy

ทดสอบครอบคลุม: Time Entry, Approval Workflow, Charge Code Management, Business Rules validation

## Objective
ได้ชุดทดสอบ Business Functional ที่:
1. ทดสอบทุก business scenario ของ Timesheet core functions
2. มี screenshot evidence ทุก step เป็นหลักฐาน
3. ผลทดสอบ push ขึ้น GitHub Issues — business stakeholder อ่านได้
4. bf-summary.md เขียนภาษาไทย สรุปผลรวมว่าผ่าน/ไม่ผ่านกี่ข้อ

## Problem Statement
ปัจจุบันระบบมีแต่ technical tests (unit + E2E element checks) — ไม่มี business-level validation ที่ยืนยันว่า:
- พนักงานกรอก OT ได้จริงหรือไม่?
- Submit แล้ว read-only จริงหรือไม่?
- Manager approve แล้ว status เปลี่ยนจริงหรือไม่?
- กฎ min 8 ชม./วัน ทำงานจริงหรือไม่?

## Solution Approach
เขียน Playwright E2E tests ในรูปแบบ Business Functional (BF-*) ที่:
- ชื่อ test เป็น business scenario ภาษาไทย
- ทุก step มี `// ✅ PASS CRITERIA` อธิบายว่าวัดผ่านจากอะไร
- ทุก step มี screenshot evidence
- ผลลัพธ์ถูกสร้างเป็น GitHub Issue พร้อม screenshots

## Tech Stack
- **Language**: TypeScript
- **Framework**: Next.js 16 (frontend), NestJS 11 (backend)
- **Runtime**: Node.js
- **Key APIs/Libraries**: Playwright, Supabase Auth
- **Build Tools**: pnpm
- **Testing**: Playwright E2E with business scenario format

## Technical Design

### Architecture
ไม่มีการแก้ไข implementation code — เป็น test-only plan

Test files จะอยู่ที่:
- `frontend/e2e/bf-time-entry.spec.ts` — Time Entry business tests
- `frontend/e2e/bf-approval-workflow.spec.ts` — Approval workflow tests
- `frontend/e2e/bf-charge-codes.spec.ts` — Charge code management tests

Results จะอยู่ที่:
- `docs/test-results/business-functional/` — BF test results
- `docs/test-results/screenshots/bf-*` — Screenshot evidence

### Key Design Decisions
1. **ไม่แก้ code** — test-only, ถ้าเจอ bug ให้ report ไม่ใช่แก้
2. **ใช้ real Supabase data** — ทดสอบกับ production-like data
3. **Screenshots ทุก step** — evidence ว่า action เกิดขึ้นจริง
4. **GitHub Issues** — 1 issue per test case, comment ผลพร้อมรูป
5. **ภาษาไทย** — bf-summary.md เขียนภาษาไทยเพื่อ business อ่าน

### Data Model
ใช้ test accounts ที่มีอยู่:
- `wichai.s@central.co.th` (employee) — กรอก timesheet, submit
- `nattaya.k@central.co.th` (charge_manager) — approve/reject
- `tachongrak@central.co.th` (admin) — full access, manage

### API / Interface Contracts
ทดสอบผ่าน UI (Playwright) ไม่ได้ call API ตรง แต่ verify ผ่าน:
- UI state changes (status badge, toast, disabled fields)
- API response checks via `page.request` (verify backend state)

## Relevant Files
Use these files to complete the task:

### Existing Files (DO NOT modify)
- `frontend/src/app/(authenticated)/time-entry/page.tsx` — Time Entry page
- `frontend/src/components/timesheet/TimesheetGrid.tsx` — Grid component (TARGET_HOURS = 8)
- `frontend/src/components/timesheet/EntryCell.tsx` — Cell input
- `frontend/src/app/(authenticated)/approvals/page.tsx` — Approvals page
- `backend/src/timesheets/timesheets.service.ts` — Submit logic, min 8hr validation
- `backend/src/approvals/approvals.service.ts` — Approve/reject logic
- `frontend/e2e/helpers.ts` — snap(), apiRequest(), FRONTEND_URL, BACKEND_URL

### New Files
- `frontend/e2e/bf-time-entry.spec.ts` — Time Entry business functional tests
- `frontend/e2e/bf-approval-workflow.spec.ts` — Approval workflow tests
- `frontend/e2e/bf-charge-codes.spec.ts` — Charge code tests
- `docs/test-results/business-functional/bf-test-cases.md`
- `docs/test-results/business-functional/bf-results.md`
- `docs/test-results/business-functional/bf-summary.md`
- `docs/test-results/github-issues.md`

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase.
- This plan is test-only — no builders needed. Only test-writer and validator.

### Team Members

- Test Writer
  - Name: bf-tester
  - Role: Write and execute Business Functional Tests for Timesheet system
  - Agent Type: test-writer
  - Resume: true

- Code Reviewer
  - Name: test-reviewer
  - Role: Review test quality — ensure BF tests have real actions, pass criteria, screenshots
  - Agent Type: code-reviewer
  - Resume: false

- Validator
  - Name: bf-validator
  - Role: Validate all BF tests pass, screenshots exist, GitHub Issues created
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Verify Infrastructure
- **Task ID**: infra-verify
- **Depends On**: none
- **Assigned To**: bf-tester
- **Agent Type**: test-writer
- **Parallel**: false
- Start backend on port 3001 and frontend on port 3002
- Verify both servers respond (health check)
- Verify auth works: login as wichai, nattaya, tachongrak
- If any check fails, STOP and report

### 2. Write BF Time Entry Tests
- **Task ID**: bf-time-entry
- **Depends On**: infra-verify
- **Assigned To**: bf-tester
- **Agent Type**: test-writer
- **Parallel**: false
- Create `frontend/e2e/bf-time-entry.spec.ts` with all BF-TE-* test cases from the E2E/BF specs below
- Each test must have: business scenario name (Thai), pass criteria comments, sequential screenshots
- Health check in `test.beforeAll`
- Run tests and capture all screenshots

### 3. Write BF Approval Workflow Tests
- **Task ID**: bf-approval
- **Depends On**: infra-verify
- **Assigned To**: bf-tester
- **Agent Type**: test-writer
- **Parallel**: false
- Create `frontend/e2e/bf-approval-workflow.spec.ts` with BF-AP-* test cases
- Tests involve role switching (employee → manager) using different storageState
- Each test must capture screenshots at every role transition

### 4. Write BF Charge Code Tests
- **Task ID**: bf-charge-codes
- **Depends On**: infra-verify
- **Assigned To**: bf-tester
- **Agent Type**: test-writer
- **Parallel**: false
- Create `frontend/e2e/bf-charge-codes.spec.ts` with BF-CC-* test cases
- Test charge code selection, search, access control

### 5. Run All BF Tests and Save Results
- **Task ID**: run-bf-tests
- **Depends On**: bf-time-entry, bf-approval, bf-charge-codes
- **Assigned To**: bf-tester
- **Agent Type**: test-writer
- **Parallel**: false
- Run all BF test files: `npx playwright test e2e/bf-*.spec.ts --project=desktop`
- Save results to `docs/test-results/business-functional/`
- Create bf-test-cases.md, bf-results.md, bf-summary.md (ภาษาไทย)
- Create GitHub Issues for each test case with screenshot evidence
- Save issue mapping to `docs/test-results/github-issues.md`

### 6. Code Review
- **Task ID**: code-review
- **Depends On**: run-bf-tests
- **Assigned To**: test-reviewer
- **Agent Type**: code-reviewer
- **Parallel**: false
- Review all BF test files for quality:
  - Every test has `// ✅ PASS CRITERIA` comments
  - Every test has sequential screenshots (bf-xx-01, bf-xx-02, ...)
  - No `test.fail()` used
  - No conditional guards hiding failures
  - Tests perform real actions, not just visibility checks
- READ at least 3 screenshots — verify they show real app state (no errors)
- Fix any issues found

### 7. Write Tests
- **Task ID**: write-tests
- **Depends On**: code-review
- **Assigned To**: bf-tester
- **Agent Type**: test-writer
- **Parallel**: false
- This is the mandatory pipeline step — verify all test result files exist
- Re-run any tests if code reviewer made changes
- Ensure docs/test-results/ has all required files

### 8. Validate Final Output
- **Task ID**: validate-all
- **Depends On**: code-review, write-tests
- **Assigned To**: bf-validator
- **Agent Type**: validator
- **Parallel**: false
- Run all validation commands
- Verify every BF test has a corresponding GitHub Issue with screenshots
- READ at least 5 screenshots — verify no error screens
- Verify bf-summary.md is in Thai and readable by non-developers
- Verify pass/fail counts match actual test results

### 9. Heal Failures (if any)
- **Task ID**: heal
- **Depends On**: validate-all
- **Assigned To**: team-lead (you)
- **Parallel**: false
- **Max Retries**: 2
- Route failures to bf-tester for test fixes or bug reporting

## Pipeline

```
Infra Verify → Write BF Tests (Time Entry + Approval + Charge Codes) → Run & Save Results → Code Review → Validate → Heal
```

## Acceptance Criteria

### Feature Criteria

- [ ] BF-TE-01 ถึง BF-TE-05 (Time Entry) ทดสอบครบทุก scenario
      Verified by: BF-TE-01, BF-TE-02, BF-TE-03, BF-TE-04, BF-TE-05
- [ ] BF-AP-01 ถึง BF-AP-03 (Approval Workflow) ทดสอบ cross-role workflow
      Verified by: BF-AP-01, BF-AP-02, BF-AP-03
- [ ] BF-CC-01 ถึง BF-CC-02 (Charge Codes) ทดสอบ CRUD + access control
      Verified by: BF-CC-01, BF-CC-02
- [ ] ทุก test case มี screenshot evidence ทุก step
      Verified by: validator screenshot count check
- [ ] ทุก test case ถูก push เป็น GitHub Issue พร้อม screenshots
      Verified by: github-issues.md mapping
- [ ] bf-summary.md เขียนภาษาไทย อ่านได้โดย business stakeholder
      Verified by: validator content check

### E2E Test Specifications (MANDATORY for UI projects)

E2E-BF-TE-01: Employee กรอกเวลาทำงานปกติ 8 ชม. แล้ว Save Draft
  Role: employee (wichai.s@central.co.th)
  Page: /time-entry

  Step 1: เข้าหน้า Time Entry
    Pre-check: Grid แสดงสัปดาห์ปัจจุบัน (จ-อา)
    Action: navigate ไป /time-entry
    Post-check: Grid visible, status = Draft หรือ Unsaved
    Snap: "bf-te-01-01-page-loaded"

  Step 2: กรอกชั่วโมงวันจันทร์ = 8 ชม. ใน charge code แรก
    Pre-check: cell วันจันทร์ editable (ไม่ disabled)
    Action: click cell → พิมพ์ 8
    Post-check: Daily Total วันจันทร์ = 8.00, Variance = ✓ (check mark)
    Snap: "bf-te-01-02-hours-entered"

  Step 3: Save Draft
    Pre-check: Save Draft button enabled
    Action: click "Save Draft"
    Post-check: status แสดง "Draft", toast success
    Snap: "bf-te-01-03-saved"

E2E-BF-TE-02: Employee กรอก Overtime เกิน 8 ชม./วัน — ระบบแสดง Variance
  Role: employee (wichai.s@central.co.th)
  Page: /time-entry

  Step 1: เข้าหน้า Time Entry สัปดาห์ที่ยังไม่มีข้อมูล
    Pre-check: เลือกสัปดาห์อนาคตที่ยังว่าง
    Action: navigate หรือเลื่อนไปสัปดาห์ถัดไป
    Post-check: Grid ว่าง, Daily Total = 0.00 ทุกวัน
    Snap: "bf-te-02-01-empty-week"

  Step 2: กรอก charge code แรก = 6 ชม. วันจันทร์
    Action: click cell จันทร์ row แรก → พิมพ์ 6
    Post-check: Daily Total = 6.00
    Snap: "bf-te-02-02-first-code"

  Step 3: เพิ่ม charge code ที่สอง กรอก = 4 ชม. วันจันทร์ (รวม 10 ชม.)
    Action: click "+ Add Charge Code" → เลือก code → กรอก 4 ชม.
    Post-check: Daily Total = 10.00, Required = 8.00, Variance = +2.0
    Snap: "bf-te-02-03-overtime-variance"

  Step 4: ยืนยัน Variance แสดงถูกต้อง
    Pre-check: Variance row แสดงค่า
    Action: ตรวจค่า Variance วันจันทร์
    Post-check: Variance = +2.0 (ไม่ใช่ check mark, ไม่ใช่ -8.0)
    Snap: "bf-te-02-04-variance-detail"

  Step 5: Save Draft — ยืนยันว่า OT ไม่ถูก block
    Action: click "Save Draft"
    Post-check: บันทึกสำเร็จ, ไม่มี error
    Snap: "bf-te-02-05-ot-saved"

E2E-BF-TE-03: Employee Submit Timesheet ที่มีวันกรอกไม่ครบ 8 ชม. — ระบบ validate
  Role: employee (wichai.s@central.co.th)
  Page: /time-entry

  Step 1: กรอกชั่วโมงแค่วันจันทร์ = 8 ชม. (อังคาร-ศุกร์ = 0)
    Action: กรอก 8 ชม. เฉพาะวันจันทร์
    Post-check: Daily Total จันทร์ = 8, อังคาร-ศุกร์ = 0
    Snap: "bf-te-03-01-partial-hours"

  Step 2: Save Draft ก่อน
    Action: click "Save Draft"
    Post-check: saved successfully
    Snap: "bf-te-03-02-draft-saved"

  Step 3: คลิก Submit
    Action: click "Submit"
    Post-check: ระบบแสดง warning dialog ว่ามีวันที่กรอกไม่ครบ 8 ชม.
    Snap: "bf-te-03-03-min-hours-warning"

  Negative: Submit โดยไม่กรอกชั่วโมงเลย
    Step: กรอก 0 ชม. ทุกวัน → click Submit
    Post-check: ระบบ block หรือ warning ว่าไม่มีข้อมูลจะ submit
    Snap: "bf-te-03-04-empty-submit-blocked"

E2E-BF-TE-04: Timesheet ที่ Submit แล้ว — fields ต้อง read-only
  Role: employee (wichai.s@central.co.th)
  Page: /time-entry

  Step 1: เข้าหน้า Time Entry ของสัปดาห์ที่เคย Submit แล้ว
    Pre-check: status = "submitted" หรือ "approved" หรือ "locked"
    Action: navigate ไปสัปดาห์ที่ submit แล้ว
    Post-check: Status badge แสดง Submitted/Approved/Locked
    Snap: "bf-te-04-01-submitted-week"

  Step 2: ลอง click cell เพื่อแก้ไขชั่วโมง
    Action: click ที่ cell ชั่วโมงใดก็ได้
    Post-check: cell ไม่สามารถแก้ไขได้ (disabled/readonly)
    Snap: "bf-te-04-02-readonly-confirmed"

E2E-BF-TE-05: Copy from Previous Week
  Role: employee (wichai.s@central.co.th)
  Page: /time-entry

  Step 1: เข้าหน้า Time Entry สัปดาห์ใหม่ (ว่าง)
    Action: navigate ไปสัปดาห์ที่ยังไม่มีข้อมูล
    Post-check: Grid ว่าง
    Snap: "bf-te-05-01-empty-new-week"

  Step 2: คลิก "Copy from Last Period"
    Pre-check: ปุ่ม Copy visible
    Action: click "Copy from Last Period"
    Post-check: Charge code rows จากสัปดาห์ก่อนปรากฏใน grid
    Snap: "bf-te-05-02-copied-from-previous"

E2E-BF-AP-01: Full Approval Cycle — Employee Submit → Manager Approve → Lock
  Role: employee (wichai.s@central.co.th) → charge_manager (nattaya.k@central.co.th)
  Page: /time-entry → /approvals

  Step 1: [Employee] กรอกและ submit timesheet
    Action: กรอก 8 ชม. ทุกวัน จ-ศ → Save → Submit
    Post-check: status = Submitted
    Snap: "bf-ap-01-01-employee-submitted"

  Step 2: [Manager] เข้าหน้า Approvals
    Action: login เป็น nattaya → ไปหน้า /approvals
    Post-check: เห็น pending timesheet ของ wichai
    Snap: "bf-ap-01-02-manager-sees-pending"

  Step 3: [Manager] Approve timesheet
    Action: click Approve
    Post-check: timesheet หายจาก pending list, status เปลี่ยนเป็น Approved/Locked
    Snap: "bf-ap-01-03-manager-approved"

  Step 4: [Employee] กลับมาดู timesheet
    Action: login เป็น wichai → ไปหน้า Time Entry สัปดาห์ที่ถูก approve
    Post-check: status = Approved/Locked, fields เป็น read-only
    Snap: "bf-ap-01-04-employee-sees-locked"

E2E-BF-AP-02: Manager Reject Timesheet — Employee เห็น rejected status
  Role: employee → charge_manager
  Page: /time-entry → /approvals

  Step 1: [Employee] Submit timesheet
    Action: กรอกและ submit
    Post-check: status = Submitted
    Snap: "bf-ap-02-01-submitted"

  Step 2: [Manager] Reject พร้อมเหตุผล
    Action: login เป็น nattaya → click Reject → ใส่ comment "ชั่วโมงไม่ถูกต้อง"
    Post-check: rejection dialog ปิด, timesheet หายจาก pending
    Snap: "bf-ap-02-02-rejection-dialog"
    Snap: "bf-ap-02-03-rejected"

  Step 3: [Employee] เห็น rejected status พร้อมเหตุผล
    Action: login เป็น wichai → เข้าหน้า Time Entry
    Post-check: status = Rejected, แสดงเหตุผล "ชั่วโมงไม่ถูกต้อง"
    Snap: "bf-ap-02-04-employee-sees-rejected"

E2E-BF-AP-03: Employee ไม่เห็นเมนู Approvals (RBAC)
  Role: employee (wichai.s@central.co.th)
  Page: / (dashboard)

  Step 1: Login เป็น employee
    Action: login เป็น wichai
    Post-check: sidebar แสดงเฉพาะเมนูที่ employee เข้าถึงได้
    Snap: "bf-ap-03-01-employee-sidebar"

  Step 2: ตรวจว่าไม่เห็น Approvals
    Post-check: ไม่มีเมนู "Approvals" ใน sidebar
    Snap: "bf-ap-03-02-no-approvals-menu"

  Negative: Employee navigate ตรงไป /approvals
    Action: goto('/approvals') ตรง
    Post-check: ถูก redirect หรือแสดง empty state (ไม่มี pending ของตัวเอง)
    Snap: "bf-ap-03-03-direct-url-blocked"

E2E-BF-CC-01: Employee เลือก Charge Code จาก dropdown
  Role: employee (wichai.s@central.co.th)
  Page: /time-entry

  Step 1: เข้าหน้า Time Entry
    Action: navigate ไป /time-entry
    Post-check: Grid loaded
    Snap: "bf-cc-01-01-time-entry"

  Step 2: คลิก "+ Add Charge Code"
    Action: click dropdown "Add Charge Code"
    Post-check: dropdown แสดง charge codes ที่ assign ให้
    Snap: "bf-cc-01-02-dropdown-open"

  Step 3: เลือก charge code
    Action: เลือก code จาก dropdown
    Post-check: row ใหม่ปรากฏใน grid
    Snap: "bf-cc-01-03-code-added"

E2E-BF-CC-02: Admin สร้าง Charge Code ใหม่
  Role: admin (tachongrak@central.co.th)
  Page: /charge-codes

  Step 1: เข้าหน้า Charge Codes
    Action: navigate ไป /charge-codes
    Post-check: Tree view แสดง charge codes hierarchy
    Snap: "bf-cc-02-01-charge-codes-page"

  Step 2: คลิก Create New
    Action: click "+ Create New"
    Post-check: Dialog เปิดขึ้น
    Snap: "bf-cc-02-02-create-dialog"

  Negative: สร้าง Project โดยไม่เลือก Parent
    Action: เลือก Level = "Project", ไม่เลือก Parent → click Create
    Post-check: Validation error แสดง
    Snap: "bf-cc-02-03-validation-error"

### Business Functional Test Specifications

BF-TE-01: พนักงานกรอกเวลาทำงานปกติ 8 ชม. แล้ว Save Draft
  Role: employee (wichai.s@central.co.th)
  Business Rule: บันทึกเวลาปกติ 8 ชม./วัน ต้องสำเร็จ, Daily Total ต้องแสดงถูกต้อง

  Steps:
  | # | Action | Expected | Pass Criteria |
  |---|--------|----------|---------------|
  | 1 | เข้าหน้า Time Entry | Grid แสดง, status Draft/Unsaved | หน้าโหลดไม่ error |
  | 2 | กรอก 8 ชม. วันจันทร์ | Daily Total = 8.00, Variance = ✓ | ตัวเลขถูกต้อง |
  | 3 | Save Draft | status = Draft, toast success | บันทึกสำเร็จ |

BF-TE-02: พนักงานบันทึก Overtime เกิน 8 ชม./วัน — ระบบแสดง Variance
  Role: employee (wichai.s@central.co.th)
  Business Rule: OT (>8 ชม.) ต้องแสดง Variance แต่ไม่ block การบันทึก

  Steps:
  | # | Action | Expected | Pass Criteria |
  |---|--------|----------|---------------|
  | 1 | เข้าสัปดาห์ว่าง | Grid ว่าง | Daily Total = 0 ทุกวัน |
  | 2 | กรอก code แรก = 6 ชม. | Total = 6 | ตัวเลข update |
  | 3 | เพิ่ม code สอง = 4 ชม. | Total = 10, Variance = +2.0 | Variance แสดงค่าเกิน |
  | 4 | ตรวจ Variance detail | +2.0 ไม่ใช่ -8.0 | Variance = hours - 8 |
  | 5 | Save Draft | บันทึกสำเร็จ | ไม่ถูก block |

BF-TE-03: Submit Timesheet กรอกไม่ครบ 8 ชม. — ระบบ validate
  Role: employee (wichai.s@central.co.th)
  Business Rule: Submit ต้อง validate min 8 ชม./วัน ทุกวันทำงาน

  Steps:
  | # | Action | Expected | Pass Criteria |
  |---|--------|----------|---------------|
  | 1 | กรอกแค่จันทร์ 8 ชม. | อ-ศ = 0 | ข้อมูลบันทึกถูก |
  | 2 | Save Draft | สำเร็จ | draft saved |
  | 3 | Submit | Warning ว่ากรอกไม่ครบ | dialog/toast แสดง warning |
  | 4 | (Negative) Submit 0 ชม. ทุกวัน | ถูก block/warning | ไม่ให้ submit เปล่า |

BF-TE-04: Timesheet ที่ Submit แล้ว — read-only
  Role: employee (wichai.s@central.co.th)
  Business Rule: หลัง submit fields ต้อง disabled ห้ามแก้ไข

  Steps:
  | # | Action | Expected | Pass Criteria |
  |---|--------|----------|---------------|
  | 1 | เข้าสัปดาห์ที่ submit แล้ว | status = Submitted+ | badge แสดงถูกต้อง |
  | 2 | Click cell เพื่อแก้ไข | ไม่สามารถแก้ได้ | cell disabled/readonly |

BF-TE-05: Copy from Previous Week
  Role: employee (wichai.s@central.co.th)
  Business Rule: copy charge code rows จากสัปดาห์ก่อนมาใช้ซ้ำ

  Steps:
  | # | Action | Expected | Pass Criteria |
  |---|--------|----------|---------------|
  | 1 | เข้าสัปดาห์ใหม่ (ว่าง) | Grid ว่าง | ไม่มี rows |
  | 2 | Click Copy from Last Period | Rows จากสัปดาห์ก่อนปรากฏ | มี charge code rows |

BF-AP-01: Full Approval Cycle (submit → approve → lock)
  Role: employee → charge_manager
  Business Rule: Timesheet ต้องผ่าน approval workflow: draft → submitted → approved → locked

  Steps:
  | # | Action | Expected | Pass Criteria |
  |---|--------|----------|---------------|
  | 1 | [Employee] กรอก+submit | status = Submitted | badge = Submitted |
  | 2 | [Manager] เข้า Approvals | เห็น pending ของ employee | pending list ไม่ว่าง |
  | 3 | [Manager] Approve | status เปลี่ยน | หายจาก pending |
  | 4 | [Employee] เช็ค status | Approved/Locked, read-only | fields disabled |

BF-AP-02: Manager Reject — Employee เห็นเหตุผล
  Role: employee → charge_manager
  Business Rule: Reject ต้องมีเหตุผล, employee ต้องเห็นเหตุผล

  Steps:
  | # | Action | Expected | Pass Criteria |
  |---|--------|----------|---------------|
  | 1 | [Employee] Submit | status = Submitted | submitted |
  | 2 | [Manager] Reject + comment | dialog → rejected | comment ถูกบันทึก |
  | 3 | [Employee] เช็ค | status = Rejected + เหตุผล | เห็น comment |

BF-AP-03: Employee ไม่เห็นเมนู Approvals (RBAC)
  Role: employee
  Business Rule: employee ไม่มีสิทธิ์ approve — ไม่ควรเห็นเมนู

  Steps:
  | # | Action | Expected | Pass Criteria |
  |---|--------|----------|---------------|
  | 1 | Login เป็น employee | sidebar employee menus | ไม่มี Approvals |
  | 2 | Navigate /approvals ตรง | redirect/empty | ไม่มี pending |

BF-CC-01: Employee เลือก Charge Code
  Role: employee
  Business Rule: employee เห็นเฉพาะ charge codes ที่ assign ให้

  Steps:
  | # | Action | Expected | Pass Criteria |
  |---|--------|----------|---------------|
  | 1 | เข้า Time Entry | Grid loaded | page loaded |
  | 2 | Click Add Charge Code | dropdown แสดง codes | codes visible |
  | 3 | เลือก code | row เพิ่มใน grid | row appears |

BF-CC-02: Admin สร้าง Charge Code (CRUD + Negative)
  Role: admin
  Business Rule: admin สร้าง charge code ได้, Project ต้องมี Parent

  Steps:
  | # | Action | Expected | Pass Criteria |
  |---|--------|----------|---------------|
  | 1 | เข้า Charge Codes | tree view | page loaded |
  | 2 | Click Create New | dialog opens | form visible |
  | 3 | (Negative) Project ไม่เลือก Parent | validation error | error message |

### Infrastructure Criteria
- Backend running on port 3001 (verified by health check)
- Frontend running on port 3002 (verified by health check)
- Auth works for all 3 test accounts
- Supabase DB connection stable

### Quality Criteria
- All BF tests pass against real running servers
- No `test.fail()` used anywhere
- Every test has `// ✅ PASS CRITERIA` comments
- Every test has sequential screenshots

### Documentation Criteria
- `docs/test-results/business-functional/bf-test-cases.md` exists
- `docs/test-results/business-functional/bf-results.md` exists with screenshot links
- `docs/test-results/business-functional/bf-summary.md` exists in Thai
- `docs/test-results/github-issues.md` maps test IDs to issue numbers

### Runtime Criteria
- All BF E2E tests pass: `npx playwright test e2e/bf-*.spec.ts --project=desktop`
- Screenshots exist in `docs/test-results/screenshots/bf-*`
- GitHub Issues created with screenshot evidence

## Validation Commands

- `lsof -ti:3001 >/dev/null && echo "backend OK" || echo "FAIL: backend not running"` — Backend health
- `lsof -ti:3002 >/dev/null && echo "frontend OK" || echo "FAIL: frontend not running"` — Frontend health
- `cd frontend && npx playwright test e2e/bf-*.spec.ts --project=desktop` — Run all BF tests
- `test -f docs/test-results/business-functional/bf-test-cases.md` — BF test cases exist
- `test -f docs/test-results/business-functional/bf-results.md` — BF results exist
- `test -f docs/test-results/business-functional/bf-summary.md` — BF summary exists
- `grep -q 'ผ่าน\|ไม่ผ่าน\|ผลรวม' docs/test-results/business-functional/bf-summary.md` — Summary is in Thai
- `ls docs/test-results/screenshots/bf-te-* 2>/dev/null | wc -l | grep -v '^0$'` — BF screenshots exist
- `test -f docs/test-results/github-issues.md` — GitHub issue mapping exists
- `test -f docs/test-results/summary.md` — Overall summary exists
- `test -f docs/env-setup.md` — Env setup doc exists
- `test -f docs/architecture.md` — Architecture doc exists
- `grep -q 'mermaid' docs/architecture.md` — Architecture has Mermaid diagram
- `test -f docs/troubleshooting.md` — Troubleshooting doc exists
- `grep -q '### Issue\|### Problem' docs/troubleshooting.md` — Troubleshooting has entries

## Healing Rules

- `backend not running` → test-writer — Start backend: `cd backend && pnpm start:dev`
- `frontend not running` → test-writer — Start frontend: `cd frontend && pnpm dev --port 3002`
- `test fail` → test-writer — Fix test code or report implementation bug
- `test.fail` → test-writer — Remove test.fail() and use test.skip() with bug description
- `screenshots` → test-writer — Capture missing screenshots via snap()
- `bf-summary` → test-writer — Generate bf-summary.md in Thai
- `bf-test-cases` → test-writer — Generate bf-test-cases.md
- `bf-results` → test-writer — Generate bf-results.md with screenshot evidence
- `github-issues` → test-writer — Create missing GitHub Issues for test cases
- `Runtime TypeError` → test-writer — Report implementation bug, mark test as skip
- `broken link` → docs-writer — Fix broken doc links
- `missing env-setup` → docs-writer — Create docs/env-setup.md
- `missing architecture` → docs-writer — Create docs/architecture.md
- `missing troubleshooting` → docs-writer — Create docs/troubleshooting.md

## Notes
- ทดสอบบน local เท่านั้น — ไม่ deploy
- Backend port 3001, Frontend port 3002 (ห้ามใช้ port 3000)
- ใช้ env vars `E2E_FRONTEND_PORT=3002` และ `E2E_BACKEND_PORT=3001`
- ถ้าเจอ bug ให้ report ในผลทดสอบ ไม่ต้องแก้ implementation code
- bf-summary.md ต้องเขียนภาษาไทยเพื่อให้ business อ่าน
- password ทุก account = `password1234`
