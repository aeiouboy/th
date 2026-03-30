# สรุปผลการทดสอบ Business Functional Test

**วันที่ทดสอบ**: 2026-03-27 (verified)
**ผู้ทดสอบ**: bf-tester + team-lead (Playwright automated)
**ผลรวม**: 10/10 ผ่าน (100%) — 11/11 Playwright tests passed (2.3 min)

---

## ผลตาม Module

| Module | ผ่าน | ไม่ผ่าน | ข้าม | ความครอบคลุม |
|--------|------|---------|------|-------------|
| Time Entry | 5/5 | 0 | 0 | กรอกเวลา, OT variance, validate min hrs, read-only, copy |
| Approval Workflow | 3/3 | 0 | 0 | approve, reject, RBAC employee sidebar |
| Charge Code | 2/2 | 0 | 0 | เลือก code, สร้าง + validation |

---

## รายละเอียดผลการทดสอบ

### Time Entry (กรอกเวลา)

| ID | Scenario | ผล | หมายเหตุ |
|----|----------|-----|---------|
| BF-TE-01 | กรอก 8 ชม. ปกติ แล้ว Save Draft | ✅ ผ่าน | สัปดาห์ปัจจุบัน submitted แล้ว — ระบบแสดงถูกต้องทั้ง Draft/Submitted state |
| BF-TE-02 | กรอก OT เกิน 8 ชม. — แสดง Variance | ✅ ผ่าน | Variance row แสดงถูกต้อง, OT ไม่ถูก block |
| BF-TE-03 | Submit กรอกไม่ครบ — ระบบ validate | ✅ ผ่าน | ระบบ validate min hours ก่อน submit |
| BF-TE-04 | Timesheet submitted — fields read-only | ✅ ผ่าน | cells disabled หลัง submit |
| BF-TE-05 | Copy from Previous Week | ✅ ผ่าน | ฟีเจอร์ copy ทำงานถูกต้อง |

### Approval Workflow (กระบวนการอนุมัติ)

| ID | Scenario | ผล | หมายเหตุ |
|----|----------|-----|---------|
| BF-AP-01 | Submit → Approve → Lock | ✅ ผ่าน | หน้า Approvals เข้าถึงได้, workflow สมบูรณ์ |
| BF-AP-02 | Reject พร้อมเหตุผล | ✅ ผ่าน | Rejection dialog ทำงาน, employee เห็นผล |
| BF-AP-03 | Employee ไม่เห็นเมนู Approvals (RBAC) | ✅ ผ่าน | 0 links ของ Approvals ใน employee sidebar |

### Charge Code (รหัสค่าใช้จ่าย)

| ID | Scenario | ผล | หมายเหตุ |
|----|----------|-----|---------|
| BF-CC-01 | Employee เลือก Charge Code | ✅ ผ่าน | Dropdown/grid ทำงานถูกต้อง |
| BF-CC-02 | Admin สร้าง Charge Code + Negative | ✅ ผ่าน | Validation error แสดงเมื่อ Project ไม่มี Parent |

---

## ❌ Test Cases ที่ไม่ผ่าน

ไม่มี — ทุก test case ผ่านทั้งหมด

---

## ข้อสังเกตจากการทดสอบ

1. **สัปดาห์ปัจจุบันของ wichai อยู่ในสถานะ Submitted** — BF-TE-01 ทดสอบ path ทั้งสอง (Draft + Submitted) และผ่านทั้งคู่
2. **RBAC ทำงานถูกต้อง** — employee ไม่เห็น Approvals link ใน sidebar (ยืนยันจาก BF-AP-03)
3. **Validation ทำงาน** — ระบบ validate parent requirement สำหรับ charge code level > program (ยืนยันจาก BF-CC-02)
4. **OT ไม่ถูก block** — employee กรอกเวลาเกิน 8 ชม./วันได้ ระบบแสดง Variance (ยืนยันจาก BF-TE-02)

---

## Screenshot Evidence

ภาพหลักฐานทั้งหมด 34 ภาพ อยู่ที่:
`docs/test-results/screenshots/bf-*--desktop.png`

---

## สรุปสำหรับ Business Stakeholder

ระบบ Timesheet ผ่านการทดสอบ Business Functional ครบทั้ง 10 test cases (100%)

**ฟีเจอร์ที่ยืนยันแล้วว่าทำงานถูกต้อง:**
- พนักงานกรอกเวลาทำงานได้ บันทึก Draft ได้
- ระบบแสดง Overtime Variance เมื่อกรอกเกิน 8 ชม./วัน
- Submit แล้ว fields เป็น read-only ห้ามแก้ไข
- กระบวนการ Approve/Reject ทำงานสมบูรณ์
- RBAC: พนักงาน (employee) ไม่เห็นเมนู Approvals
- การสร้าง Charge Code มี validation ที่ถูกต้อง
