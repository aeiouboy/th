# Chore: Half-Day Leave Support + LEAVE-001 System Row UX

## Metadata
adw_id: `improvements`
prompt: `half-day leave support + system row UX in time-entry page`

## Chore Description
ปรับปรุง 2 ส่วนที่เกี่ยวกับ LEAVE-001 ในหน้า time-entry:

**1. Half-Day Leave Support**
- เพิ่ม `leave_type` field ใน `vacation_requests` table รองรับ: `full_day` (8h), `half_am` (4h), `half_pm` (4h)
- อัพเดท vacation API (create/approve) ให้รับ leave_type
- แก้ `autoFillLeaveEntries()` ให้ fill ชั่วโมงตาม leave_type แทน hardcode 8h
- อัพเดท min-hours validation ให้นับ half-day leave ถูกต้อง (ลาครึ่งวัน = ต้อง log อีก 4h ที่เหลือ)

**2. System Row UX Improvements**
- ซ่อน LEAVE-001 จาก ChargeCodeSelector dropdown (ไม่ให้ user เพิ่มเอง)
- Auto-show LEAVE-001 เป็น read-only row เฉพาะเมื่อมี approved vacation ในสัปดาห์นั้น
- Style ให้แตกต่างจาก charge code ปกติ (สีจาง, icon, badge "System")
- แสดง leave_type ใน description (เช่น "Annual Leave (Half-day AM)")

## Relevant Files
Use these files to complete the chore:

### Database & Schema
- `backend/src/database/schema/vacation-requests.ts` — เพิ่ม `leave_type` enum + column
- `backend/src/database/schema/index.ts` — export schema ใหม่ถ้าจำเป็น

### Backend Services
- `backend/src/calendar/calendar.service.ts` — แก้ `createVacation()`, `getMyVacations()` ให้รองรับ leave_type
- `backend/src/calendar/calendar.controller.ts` — อัพเดท vacation endpoints
- `backend/src/calendar/dto/create-vacation.dto.ts` — เพิ่ม leave_type field
- `backend/src/timesheets/timesheets.service.ts` — แก้ `autoFillLeaveEntries()` ใช้ leave_type กำหนดชั่วโมง, แก้ `validateMinimumHours()`, แก้ `getUserChargeCodes()`
- `backend/src/calendar/calendar.service.ts` — แก้ `getWorkingDays()` ให้นับ half-day ถูกต้อง

### Frontend - Time Entry
- `frontend/src/app/(authenticated)/time-entry/page.tsx` — ซ่อน LEAVE-001 จาก dropdown, แก้ logic แสดง vacation row, อัพเดท VacationRequest interface
- `frontend/src/components/timesheet/ChargeCodeSelector.tsx` — filter out LEAVE-001 จาก unusedCodes
- `frontend/src/components/timesheet/TimesheetGrid.tsx` — ปรับ style system row, แสดง leave_type info
- `frontend/src/components/timesheet/EntryCell.tsx` — แสดง half-day value (4.00) แทน 8.00

### Frontend - Calendar/Vacation
- `frontend/src/app/(authenticated)/calendar/page.tsx` — เพิ่ม leave_type selector ในฟอร์มขอลา

### Tests
- `backend/src/timesheets/timesheets.service.spec.ts` — เพิ่ม test cases สำหรับ half-day
- `backend/src/calendar/calendar.service.spec.ts` — เพิ่ม test cases สำหรับ leave_type

### New Files
- `backend/drizzle/XXXX_add_leave_type.sql` — migration file สำหรับ leave_type column

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Add leave_type to Database Schema
- เพิ่ม `leaveTypeEnum` ใน `vacation-requests.ts`: `pgEnum('leave_type', ['full_day', 'half_am', 'half_pm'])`
- เพิ่ม column `leaveType` ใน `vacationRequests` table: `leaveType('leave_type').notNull().default('full_day')`
- Run `pnpm db:generate` แล้ว `pnpm db:migrate` เพื่อสร้าง migration

### 2. Update Vacation DTO & API
- เพิ่ม `leaveType` field ใน `CreateVacationDto` (optional, default: `full_day`)
- อัพเดท `calendar.service.ts`:
  - `createVacation()` — รับ `leaveType` parameter, insert ลง DB
  - `getMyVacations()` — return `leaveType` ด้วย
  - `getPendingVacationsForManager()` — return `leaveType` ด้วย
- อัพเดท `calendar.controller.ts` — pass leaveType จาก body ไปที่ service

### 3. Update autoFillLeaveEntries Logic
- แก้ `timesheets.service.ts` > `autoFillLeaveEntries()`:
  - Query vacation requests พร้อม `leaveType`
  - Map leave_type → hours: `full_day=8`, `half_am=4`, `half_pm=4`
  - Description: `"Annual Leave"`, `"Annual Leave (AM)"`, `"Annual Leave (PM)"`
  - Insert entry ด้วยชั่วโมงที่ถูกต้องตาม leave_type

### 4. Update Minimum Hours Validation
- แก้ `validateMinimumHours()` ใน `timesheets.service.ts`:
  - Half-day leave = ต้อง log อีก 4h ที่เหลือ (ไม่ skip ทั้งวัน)
  - Full-day leave = skip validation สำหรับวันนั้น (เหมือนเดิม)
  - Logic: `requiredHours = 8 - leaveHours` → ถ้า user hours >= requiredHours → pass

### 5. Update getWorkingDays Calculation
- แก้ `calendar.service.ts` > `getWorkingDays()`:
  - Half-day vacation = count as 0.5 working days (ไม่ใช่ 0)
  - Full-day vacation = count as 0 working days (เหมือนเดิม)

### 6. Hide LEAVE-001 from ChargeCodeSelector
- แก้ `ChargeCodeSelector.tsx`:
  - Filter out charge codes ที่ ID เริ่มต้นด้วย `LEAVE-` จาก `unusedCodes`
- หรือแก้ `getUserChargeCodes()` ใน backend ไม่ส่ง LEAVE-001 กลับไปใน list
  - แนะนำ: filter ที่ frontend เพราะ backend ยังต้องใช้ LEAVE-001 สำหรับ auto-fill

### 7. Auto-show LEAVE-001 as System Row
- แก้ `time-entry/page.tsx`:
  - เมื่อ `entriesData` โหลดมาแล้วมี LEAVE-001 entries → แสดง row อัตโนมัติ
  - ถ้า entries ไม่มี LEAVE-001 แต่มี approved vacation ในสัปดาห์ → ยังแสดง row (backend จะ fill ตอน save/submit)
  - ไม่ต้องให้ user เพิ่มเอง
- อัพเดท `VacationRequest` interface เพิ่ม `leaveType: 'full_day' | 'half_am' | 'half_pm'`

### 8. Style System Row Differently
- แก้ `TimesheetGrid.tsx`:
  - LEAVE-001 row: background สีจางกว่า row ปกติ (e.g., `bg-purple-50/50 dark:bg-purple-950/20`)
  - Badge: เปลี่ยนจาก "leave" เป็น icon + "System - Leave"
  - แสดง leave_type ข้างชื่อ (e.g., "Annual Leave (Half-day AM)")
  - แยก system rows ไว้ด้านบนสุดของ grid เสมอ

### 9. Update Calendar Page Vacation Form
- แก้ `frontend/src/app/(authenticated)/calendar/page.tsx`:
  - เพิ่ม radio/select สำหรับ leave_type: "Full Day", "Half Day (AM)", "Half Day (PM)"
  - Default: "Full Day"
  - ส่ง `leaveType` ไปกับ POST /vacations

### 10. Update Tests
- `timesheets.service.spec.ts`:
  - Test `autoFillLeaveEntries` กับ half_am → expect 4h entry
  - Test `autoFillLeaveEntries` กับ half_pm → expect 4h entry
  - Test `validateMinimumHours` กับ half-day leave → ต้อง log อีก 4h
- `calendar.service.spec.ts`:
  - Test `createVacation` กับ leaveType
  - Test `getWorkingDays` กับ half-day vacation → count as 0.5

### 11. Validate & Deploy
- Run `pnpm test` ใน backend
- Run `pnpm test` ใน frontend
- Run `pnpm build` ใน frontend (TypeScript check)
- Test manually: สร้าง half-day vacation → ดู time-entry → เช็คว่า fill 4h

## Validation Commands
Execute these commands to validate the chore is complete:

- `cd backend && pnpm db:generate` — Verify migration generates cleanly
- `cd backend && pnpm test -- --testPathPattern=timesheets.service` — Timesheet service tests pass
- `cd backend && pnpm test -- --testPathPattern=calendar.service` — Calendar service tests pass
- `cd backend && pnpm lint` — TypeScript compiles without errors
- `cd frontend && pnpm build` — Frontend builds without TypeScript errors
- `cd frontend && pnpm test` — Frontend unit tests pass
- Manual: Login → Calendar → สร้าง vacation request (half-day AM) → Approve → Go to Time Entry → ดูว่า LEAVE-001 row แสดง 4h

## Notes
- `leave_type` default เป็น `full_day` เพื่อ backward compatibility กับ vacation requests ที่มีอยู่แล้ว
- Half-day leave ที่ลาวันเดียว: `startDate === endDate`, `leaveType = 'half_am'` หรือ `'half_pm'`
- Half-day leave หลายวัน: ไม่รองรับ (ลาครึ่งวันหลายวันติดกันไม่ make sense) → validate ที่ backend ว่า half-day ต้อง `startDate === endDate`
- LEAVE-001 จะยังคงเป็น system charge code — backend จัดการ auto-fill, frontend แค่แสดง read-only
- หลัง implement เสร็จ push to `main` → auto deploy ทั้ง Railway + Vercel
