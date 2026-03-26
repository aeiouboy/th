# Business Functional Test Cases

> Generated: 2026-03-26 | Runner: Playwright | Total: 10 | Pass: 10 | Fail: 0 | Skip: 0

---

### BF-TE-01: พนักงานกรอกเวลาทำงานปกติ 8 ชม. แล้ว Save Draft

| Field | Detail |
|---|---|
| **Priority** | High |
| **Section** | BF > Time Entry |
| **File** | `frontend/e2e/bf-time-entry.spec.ts` |
| **Role** | employee (wichai.s@central.co.th) |
| **Business Rule** | บันทึกเวลาปกติ 8 ชม./วัน ต้องสำเร็จ, Daily Total ต้องแสดงถูกต้อง |

**Preconditions:**
1. เข้าระบบด้วย wichai.s@central.co.th (employee)
2. Timesheet สถานะ Draft (หรือ submitted — ระบบต้องโหลดหน้าได้)

**Test Data:**
- ผู้ใช้: wichai.s@central.co.th (employee)
- ชั่วโมง: 8 ชม. วันจันทร์

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | เข้าหน้า Time Entry (/time-entry) | หน้าโหลดสำเร็จ, Grid แสดงสัปดาห์ปัจจุบัน |
| 2 | กรอก 8 ชม. ใน cell วันจันทร์ (ถ้า Draft) | Daily Total อัพเดท, Variance แสดง |
| 3 | คลิก Save Draft | Toast success แสดง, status = Draft |

---

### BF-TE-02: พนักงานบันทึก Overtime เกิน 8 ชม./วัน — ระบบแสดง Variance

| Field | Detail |
|---|---|
| **Priority** | High |
| **Section** | BF > Time Entry |
| **File** | `frontend/e2e/bf-time-entry.spec.ts` |
| **Role** | employee (wichai.s@central.co.th) |
| **Business Rule** | OT (>8 ชม.) ต้องแสดง Variance แต่ไม่ block การบันทึก |

**Preconditions:**
1. เข้าระบบด้วย wichai.s@central.co.th
2. มีสัปดาห์ที่สามารถกรอกข้อมูลได้

**Test Data:**
- Charge Code 1: 6 ชม., Charge Code 2: 4 ชม. (รวม 10 ชม. > 8)

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | เข้าหน้า Time Entry (สัปดาห์ถัดไป) | Grid แสดง, Daily Total = 0 |
| 2 | กรอก 6 ชม. ใน charge code แรก | Daily Total = 6.00 |
| 3 | เพิ่ม charge code ที่สอง กรอก 4 ชม. | Daily Total = 10.00, Variance row แสดง |
| 4 | ตรวจ Variance row | Variance แสดงค่าที่ถูกต้อง |
| 5 | คลิก Save Draft | บันทึกสำเร็จ (OT ไม่ถูก block) |

---

### BF-TE-03: Submit Timesheet กรอกไม่ครบ 8 ชม. — ระบบ validate

| Field | Detail |
|---|---|
| **Priority** | High |
| **Section** | BF > Time Entry |
| **File** | `frontend/e2e/bf-time-entry.spec.ts` |
| **Role** | employee (wichai.s@central.co.th) |
| **Business Rule** | Submit ต้อง validate min 8 ชม./วัน ทุกวันทำงาน |

**Preconditions:**
1. เข้าระบบด้วย wichai.s@central.co.th
2. Timesheet Draft

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | กรอกแค่วันจันทร์ 8 ชม. (อ-ศ = 0) | Daily Total จันทร์ = 8, วันอื่น = 0 |
| 2 | Save Draft | สำเร็จ |
| 3 | คลิก Submit | Warning/dialog แสดงว่ากรอกไม่ครบ |
| 4 | (Negative) Submit 0 ชม. | Block หรือ warning |

---

### BF-TE-04: Timesheet ที่ Submit แล้ว — fields ต้อง read-only

| Field | Detail |
|---|---|
| **Priority** | High |
| **Section** | BF > Time Entry |
| **File** | `frontend/e2e/bf-time-entry.spec.ts` |
| **Role** | employee (wichai.s@central.co.th) |
| **Business Rule** | หลัง submit fields ต้อง disabled ห้ามแก้ไข |

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | เข้าหน้า Time Entry | Status badge แสดง |
| 2 | ตรวจ cells ว่า editable หรือไม่ | ถ้า submitted: cells disabled/read-only |

---

### BF-TE-05: Copy from Previous Week

| Field | Detail |
|---|---|
| **Priority** | Medium |
| **Section** | BF > Time Entry |
| **File** | `frontend/e2e/bf-time-entry.spec.ts` |
| **Role** | employee (wichai.s@central.co.th) |
| **Business Rule** | Copy charge code rows จากสัปดาห์ก่อนมาใช้ซ้ำ |

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | เข้าสัปดาห์ถัดไป (ว่าง) | Grid ว่าง |
| 2 | คลิก Copy from Last Period | Charge code rows ปรากฏ |

---

### BF-AP-01: Full Approval Cycle — Employee Submit → Manager Approve → Lock

| Field | Detail |
|---|---|
| **Priority** | High |
| **Section** | BF > Approval Workflow |
| **File** | `frontend/e2e/bf-approval-workflow.spec.ts` |
| **Role** | employee → charge_manager |
| **Business Rule** | Timesheet ต้องผ่าน workflow: draft → submitted → approved/locked |

**Preconditions:**
1. wichai.s@central.co.th (employee) — กรอก timesheet
2. nattaya.k@central.co.th (charge_manager) — approve

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | [Employee] กรอก + Submit timesheet | status = Submitted |
| 2 | [Manager] เข้า /approvals | เห็น pending timesheets |
| 3 | [Manager] คลิก Approve | timesheet หายจาก pending |
| 4 | [Employee] ดู timesheet | status = Approved/Locked, fields read-only |

---

### BF-AP-02: Manager Reject Timesheet — Employee เห็น Rejected Status + เหตุผล

| Field | Detail |
|---|---|
| **Priority** | High |
| **Section** | BF > Approval Workflow |
| **File** | `frontend/e2e/bf-approval-workflow.spec.ts` |
| **Role** | employee → charge_manager → employee |
| **Business Rule** | Reject ต้องมีเหตุผล, employee ต้องเห็นเหตุผล |

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | [Employee] Submit timesheet | status = Submitted |
| 2 | [Manager] Reject + กรอกเหตุผล "ชั่วโมงไม่ถูกต้อง" | Dialog ปิด, rejected |
| 3 | [Employee] ดู timesheet | status = Rejected, เห็นเหตุผล |

---

### BF-AP-03: Employee ไม่เห็นเมนู Approvals (RBAC)

| Field | Detail |
|---|---|
| **Priority** | High |
| **Section** | BF > RBAC |
| **File** | `frontend/e2e/bf-approval-workflow.spec.ts` |
| **Role** | employee (wichai.s@central.co.th) |
| **Business Rule** | Employee ไม่มีสิทธิ์ approve — ไม่ควรเห็นเมนู Approvals |

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Login เป็น employee, เข้า dashboard | Sidebar ไม่มีเมนู Approvals |
| 2 | (Negative) goto('/approvals') ตรง | ไม่เห็น pending ของคนอื่น |

---

### BF-CC-01: Employee เลือก Charge Code จาก dropdown ใน Time Entry

| Field | Detail |
|---|---|
| **Priority** | Medium |
| **Section** | BF > Charge Codes |
| **File** | `frontend/e2e/bf-charge-codes.spec.ts` |
| **Role** | employee (wichai.s@central.co.th) |
| **Business Rule** | Employee เห็นเฉพาะ charge codes ที่ assign ให้ |

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | เข้าหน้า Time Entry | Grid loaded |
| 2 | คลิก Add Charge Code | Dropdown แสดง assigned codes |
| 3 | เลือก code | Row ใหม่ปรากฏใน grid |

---

### BF-CC-02: Admin สร้าง Charge Code ใหม่ พร้อม Negative case

| Field | Detail |
|---|---|
| **Priority** | Medium |
| **Section** | BF > Charge Codes |
| **File** | `frontend/e2e/bf-charge-codes.spec.ts` |
| **Role** | admin (tachongrak@central.co.th) |
| **Business Rule** | Admin สร้าง charge code ได้, Project ต้องมี Parent |

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | เข้าหน้า Charge Codes | Tree view แสดง hierarchy |
| 2 | คลิก Create New | Dialog เปิดขึ้น |
| 3 | (Negative) เลือก Level=Project ไม่เลือก Parent | Validation error แสดง |
