# Bug: Vacation Day Allows Manual Hour Entry

## Metadata
severity: `medium`
reported: `2026-03-19`
affected_user: `Wichai Srisuk (wichai.s@central.co.th)`

## Bug Description
พนักงานที่มี approved vacation สามารถกรอกชั่วโมงใน charge code อื่นในวันที่ลาได้ ทั้งที่ควร block input

**สิ่งที่เกิด:**
- Wichai ลาวัน Thu 19 Mar 2026 (approved โดย Nattaya)
- หน้า Time Entry แสดง "Vacation" ที่ header ของวัน Thu 19 ถูกต้อง
- แต่ Wichai ยังกรอก 7h ใน DEPT-SCM ในวันนั้นได้
- Required row แสดงว่าง (skip validation เพราะเป็น vacation day)
- Variance แสดง `-` แทน ✓

**สิ่งที่ควรเกิด:**
- วันที่ลาเต็มวัน → input cell ต้อง **disabled** ไม่ให้กรอก hours ใน charge code ใดๆ
- วันที่ลาครึ่งวัน (future feature) → ให้กรอกได้ไม่เกิน 4h
- LEAVE-001 system row auto-fill 8h (หรือ 4h) สำหรับวันลา

## Root Cause
`EntryCell` disabled เฉพาะ system charge codes (LEAVE-001) และ weekends/holidays แต่ **ไม่ได้ disable สำหรับ vacation days ใน user charge codes**

ใน `TimesheetGrid.tsx` line 208:
```tsx
disabled={!canEdit || isSystemCode || isNonWorking}
```
`isNonWorking` เช็คแค่ weekend + holiday แต่ไม่รวม vacation days

## Relevant Files

### Frontend (จุดที่ต้องแก้)
- `frontend/src/components/timesheet/TimesheetGrid.tsx` — เพิ่ม vacation date check ใน disabled logic ของ EntryCell
- `frontend/src/components/timesheet/EntryCell.tsx` — อาจต้องแสดง visual indicator ว่า cell ถูก block เพราะ vacation
- `frontend/src/app/(authenticated)/time-entry/page.tsx` — pass `vacationDates` ไปให้ TimesheetGrid (อาจส่งอยู่แล้ว)

### Backend (validation เพิ่มเติม)
- `backend/src/timesheets/timesheets.service.ts` — เพิ่ม server-side validation: reject entries ที่มี hours > 0 ในวัน full-day vacation

## Step by Step Fix

### 1. Block Input on Vacation Days (Frontend)
- แก้ `TimesheetGrid.tsx`:
  - เช็คว่า `vacationDates` prop ถูก pass มาจาก time-entry page
  - เพิ่ม vacation check ใน disabled condition ของ EntryCell:
    ```tsx
    const isVacationDay = vacationDates?.has(dateStr);
    disabled={!canEdit || isSystemCode || isNonWorking || isVacationDay}
    ```
  - แสดง cell เป็นสีจาง + tooltip "On vacation" เมื่อ disabled เพราะ vacation

### 2. Visual Indicator for Blocked Cells
- แก้ `EntryCell.tsx`:
  - เพิ่ม prop `reason?: 'weekend' | 'holiday' | 'vacation' | 'system'`
  - แสดง icon หรือ text ตาม reason เมื่อ disabled
  - Vacation cell: แสดง `-` พร้อมสี purple จาง

### 3. Server-side Validation (Backend)
- แก้ `timesheets.service.ts` > `upsertEntries()`:
  - Query approved vacations สำหรับ user ในช่วง period
  - ถ้า entry มี hours > 0 ในวัน full-day vacation → reject entry นั้น (ไม่ save)
  - Log warning แต่ไม่ throw error (graceful handling)

### 4. Clear Existing Bad Data
- ลบ entry ที่ Wichai กรอกผิดในวัน vacation:
  ```sql
  DELETE FROM timesheet_entries
  WHERE timesheet_id = '4c655d3d-cf9b-4441-bbf6-dc0ac8c9af84'
  AND date = '2026-03-19'
  AND charge_code_id = 'DEPT-SCM';
  ```

### 5. Validate Fix
- Login เป็น Wichai → ไป Time Entry → Thu 19 ต้องไม่สามารถกรอก hours ใน DEPT-SCM ได้
- ลอง submit → ต้องไม่มี entry สำหรับ DEPT-SCM วัน Mar 19

## Validation Commands
- `cd frontend && pnpm build` — TypeScript compiles
- `cd frontend && pnpm test` — Unit tests pass
- `cd backend && pnpm test -- --testPathPattern=timesheets` — Timesheet tests pass
- Manual: Login as wichai.s → Time Entry → Thu 19 cell ใน DEPT-SCM ต้อง disabled

## Notes
- Bug นี้เกี่ยวข้องกับ chore half-day leave (`specs/chore-improvements-half-day-leave-system-row.md`) — ควรแก้ bug นี้ก่อนแล้วค่อย implement half-day
- Server-side validation สำคัญเพราะ frontend disable อย่างเดียวไม่พอ (user อาจ bypass ผ่าน API)
- ต้องพิจารณา: ถ้า vacation ถูก reject ภายหลัง → entries ที่ถูก block ไปแล้วจะกลับมาให้กรอกได้อัตโนมัติ (query vacation status real-time)
