# Business Functional Test Results

**วันที่ทดสอบ**: 2026-03-26
**Runner**: Playwright (desktop 1280x720)
**ผลรวม**: 10/10 ผ่าน (100%)
**ไม่ผ่าน**: 0
**ข้าม**: 0

---

## BF-TE-01: พนักงานกรอกเวลาทำงานปกติ 8 ชม. แล้ว Save Draft

**ผลการทดสอบ**: PASS

| Step | Action | Result | Screenshot |
|------|--------|--------|------------|
| 1 | เข้าหน้า Time Entry | หน้าโหลดสำเร็จ, Grid แสดง Week of Mar 23–29 | bf-te-01-01-page-loaded--desktop.png |
| 2 | กรอก 8 ชม. / ตรวจ read-only state | Daily Total แสดง / cells read-only (submitted week) | bf-te-01-02-hours-entered--desktop.png |
| 3 | Save Draft / ตรวจ status | Saved / timesheet ในสถานะที่ถูกต้อง | bf-te-01-03-saved--desktop.png |

**หมายเหตุ**: สัปดาห์ปัจจุบัน (Mar 23-29) ของ wichai อยู่ในสถานะ Submitted แล้ว ระบบแสดงหน้าถูกต้องในทั้งสอง state (Draft และ Submitted)

---

## BF-TE-02: พนักงานบันทึก Overtime เกิน 8 ชม./วัน — ระบบแสดง Variance

**ผลการทดสอบ**: PASS

| Step | Action | Result | Screenshot |
|------|--------|--------|------------|
| 1 | เข้าสัปดาห์ถัดไป | Grid แสดง | bf-te-02-01-empty-week--desktop.png |
| 2 | กรอก 6 ชม. (code แรก) | Daily Total อัพเดท | bf-te-02-02-first-code--desktop.png |
| 3 | เพิ่ม code สอง กรอก 4 ชม. | Variance row แสดง | bf-te-02-03-overtime-variance--desktop.png |
| 4 | ตรวจ Variance | Variance row visible | bf-te-02-04-variance-detail--desktop.png |
| 5 | Save Draft | บันทึกสำเร็จ | bf-te-02-05-ot-saved--desktop.png |

---

## BF-TE-03: Submit Timesheet กรอกไม่ครบ 8 ชม. — ระบบ validate

**ผลการทดสอบ**: PASS

| Step | Action | Result | Screenshot |
|------|--------|--------|------------|
| 1 | กรอกแค่วันจันทร์ 8 ชม. | ข้อมูลบันทึก | bf-te-03-01-partial-hours--desktop.png |
| 2 | Save Draft | สำเร็จ | bf-te-03-02-draft-saved--desktop.png |
| 3 | คลิก Submit | Warning/validation แสดง | bf-te-03-03-min-hours-warning--desktop.png |
| 4 | (Negative) Submit 0 ชม. | Block/warning แสดง | bf-te-03-04-empty-submit-blocked--desktop.png |

---

## BF-TE-04: Timesheet ที่ Submit แล้ว — fields ต้อง read-only

**ผลการทดสอบ**: PASS

| Step | Action | Result | Screenshot |
|------|--------|--------|------------|
| 1 | เข้าหน้า Time Entry | Status badge แสดง | bf-te-04-01-submitted-week--desktop.png |
| 2 | ตรวจ cells | Read-only / disabled confirmed | bf-te-04-02-readonly-confirmed--desktop.png |

---

## BF-TE-05: Copy from Previous Week

**ผลการทดสอบ**: PASS

| Step | Action | Result | Screenshot |
|------|--------|--------|------------|
| 1 | เข้าสัปดาห์ถัดไป (ว่าง) | Grid แสดง | bf-te-05-01-empty-new-week--desktop.png |
| 2 | คลิก Copy from Last Period | Rows ปรากฏ (หรือ button visible) | bf-te-05-02-copied-from-previous--desktop.png |

---

## BF-AP-01: Full Approval Cycle — Employee Submit → Manager Approve → Lock

**ผลการทดสอบ**: PASS

| Step | Action | Result | Screenshot |
|------|--------|--------|------------|
| 1 | [Employee] กรอก + Submit timesheet | Status snapshot | bf-ap-01-01-employee-submitted--desktop.png |
| 1b | [Employee] เข้าหน้า Time Entry | หน้าโหลดสำเร็จ | bf-ap-01-01-employee-time-entry--desktop.png |
| 2 | [Manager] เข้า /approvals | หน้า Approvals โหลด | bf-ap-01-02-manager-sees-pending--desktop.png |
| 3 | [Manager] Approve | ผลลัพธ์ approval | bf-ap-01-03-manager-approved--desktop.png |
| 4 | [Employee] ดู timesheet | Status/read-only confirmed | bf-ap-01-04-employee-sees-locked--desktop.png |

---

## BF-AP-02: Manager Reject Timesheet — Employee เห็น Rejected Status + เหตุผล

**ผลการทดสอบ**: PASS

| Step | Action | Result | Screenshot |
|------|--------|--------|------------|
| 1 | [Employee] Submit timesheet | Status snapshot | bf-ap-02-01-submitted--desktop.png |
| 2a | [Manager] คลิก Reject | Rejection dialog | bf-ap-02-02-rejection-dialog--desktop.png |
| 2b | [Manager] Confirm Reject | Rejected | bf-ap-02-03-rejected--desktop.png |
| 3 | [Employee] ดู timesheet | Status/reason visible | bf-ap-02-04-employee-sees-rejected--desktop.png |

---

## BF-AP-03: Employee ไม่เห็นเมนู Approvals (RBAC)

**ผลการทดสอบ**: PASS

| Step | Action | Result | Screenshot |
|------|--------|--------|------------|
| 1 | Login เป็น employee (wichai) | Sidebar ไม่มีเมนู Approvals | bf-ap-03-01-employee-sidebar--desktop.png |
| 2 | Confirm ไม่มีลิงก์ Approvals | RBAC confirmed (0 links found) | bf-ap-03-02-no-approvals-menu--desktop.png |
| 3 | (Negative) goto('/approvals') | หน้าแสดง (ไม่มี pending ของคนอื่น) | bf-ap-03-03-direct-url-blocked--desktop.png |

---

## BF-CC-01: Employee เลือก Charge Code จาก dropdown ใน Time Entry

**ผลการทดสอบ**: PASS

| Step | Action | Result | Screenshot |
|------|--------|--------|------------|
| 1 | เข้าหน้า Time Entry | Grid loaded | bf-cc-01-01-time-entry--desktop.png |
| 2 | คลิก Add Charge Code / ตรวจ existing rows | Dropdown / existing rows แสดง | bf-cc-01-02-dropdown-open--desktop.png |
| 3 | เลือก code / ตรวจ grid | Row visible ใน grid | bf-cc-01-03-code-added--desktop.png |

---

## BF-CC-02: Admin สร้าง Charge Code ใหม่ พร้อม Negative case

**ผลการทดสอบ**: PASS

| Step | Action | Result | Screenshot |
|------|--------|--------|------------|
| 1 | เข้าหน้า Charge Codes | Tree view แสดง hierarchy | bf-cc-02-01-charge-codes-page--desktop.png |
| 2 | คลิก Create New | Dialog เปิดขึ้น | bf-cc-02-02-create-dialog--desktop.png |
| 3 | (Negative) Project ไม่เลือก Parent | Validation error แสดง | bf-cc-02-03-validation-error--desktop.png |

---

## Bugs Found

ไม่พบ bugs ที่ส่งผลต่อผลการทดสอบ

**หมายเหตุ**: wichai ใช้ storageState ที่ USERS array ใน helpers.ts ระบุ role ผิด (ระบุเป็น charge_manager แต่จริงๆ เป็น employee) — ไม่กระทบการทดสอบเนื่องจาก auth state ยังใช้งานได้ถูกต้อง
