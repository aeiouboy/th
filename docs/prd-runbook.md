# PRD Runbook — Timesheet & Cost Allocation System

คู่มือการใช้งานระบบตาม Acceptance Criteria ฉบับสำหรับผู้ใช้และ PMO

---

## สารบัญ

- [AC-1: บันทึกเวลารายวันหรือรายสัปดาห์](#ac-1-employees-can-log-time-daily-or-weekly)
- [AC-2: ระบบตัดรอบ (Cutoff) ทุกวันที่ 15 และสิ้นเดือน](#ac-2-timesheet-cutoff-every-15th-and-end-of-month)
- [AC-3: กำหนดชั่วโมงขั้นต่ำ 8 ชั่วโมง/วัน ก่อน Submit](#ac-3-minimum-8-hours-per-day-before-submission)
- [AC-4: Allocate ชั่วโมงไปยัง Charge Code หลายรายการ](#ac-4-allocate-hours-to-multiple-charge-codes)
- [AC-5: แบ่งเวลาในหนึ่งวันไปยัง Task หลายรายการ](#ac-5-split-time-across-multiple-tasks-in-one-day)
- [AC-6: เพิ่ม Description ของงาน (Optional)](#ac-6-optional-work-descriptions)
- [AC-7: โครงสร้าง Hierarchy ของ Charge Code](#ac-7-charge-code-hierarchy)
- [AC-8: สร้าง Charge Code ได้ทุกระดับ](#ac-8-charge-code-creation-at-any-level)
- [AC-9: Charge Code ID รองรับ Prefix ตามระดับ](#ac-9-charge-code-id-prefix-format)
- [AC-10: Charge Code Owner ควบคุมการเข้าถึง](#ac-10-charge-code-owner-access-control)
- [AC-11: Charge Code เก็บ Attributes ครบถ้วน](#ac-11-charge-code-attributes)
- [AC-12: Workflow อนุมัติ Employee → Charge Manager → Locked](#ac-12-approval-workflow)
- [AC-13: ฟังก์ชัน Submit, Bulk Approve, Reject, Lock](#ac-13-approval-functions)
- [AC-14: คำนวณ Actual Cost = ชั่วโมง × Cost Rate ตาม Job Grade](#ac-14-actual-cost-calculation)
- [AC-15: Reports ติดตาม Actual vs Planned, Forecast, Chargeability](#ac-15-reporting-and-monitoring)
- [AC-16: Outputs: Project Cost, Utilization, Budget Alerts, Chargeability Alerts](#ac-16-report-outputs)
- [AC-17: Advanced Features (Teams, Reminders, Calendar, etc.)](#ac-17-advanced-features)

---

## AC-1: Employees can log time daily or weekly

**สถานะ**: ✅ รองรับ
**เมนู**: Time Entry (sidebar → "Time Entry")

### วิธีใช้งาน

1. คลิก **Time Entry** ในแถบเมนูซ้าย
2. หน้าจะแสดง grid ของสัปดาห์ปัจจุบัน (จันทร์–อาทิตย์)
3. ใช้ปุ่ม `<` และ `>` ในส่วน "Week of ..." เพื่อเลื่อนไปดูสัปดาห์ก่อนหน้า
   - ปุ่ม `>` จะถูก disable หากเป็นสัปดาห์ปัจจุบันหรืออนาคต (ป้องกันการ log ล่วงหน้า)
4. คลิกที่ช่อง (cell) ตรงแถว Charge Code และคอลัมน์วันที่ต้องการ แล้วพิมพ์จำนวนชั่วโมง
   - รองรับทศนิยม เช่น `4.5` สำหรับ 4 ชั่วโมงครึ่ง
   - กด `Tab` เพื่อเลื่อนไปเซลล์ถัดไป (ขวา), กด `Enter` เพื่อเลื่อนลง
5. สลับ view ระหว่าง **Week** (7 วัน) และ **Bi-week** (14 วัน) ได้จากปุ่ม toggle มุมขวาบน

### หมายเหตุ

- ระบบ **Auto-save ทุก 30 วินาที** หากมีการแก้ไข (จะแสดงข้อความ "Unsaved" สีส้มหากมีการเปลี่ยนแปลงที่ยังไม่บันทึก)
- กด **Save Draft** เพื่อบันทึกด้วยตนเอง
- ไม่สามารถแก้ไข timesheet ที่สถานะ `Submitted` หรือ `Locked` ได้
- Timesheet ที่ถูก `Rejected` จะกลับมาแก้ไขได้อีกครั้ง

---

## AC-2: Timesheet Cutoff Every 15th and End of Month

**สถานะ**: ⚠️ รองรับบางส่วน
**เมนู**: Time Entry

### วิธีใช้งาน

ระบบป้องกันการ log ในอนาคตโดยปุ่ม `>` จะถูก disable เมื่อถึงสัปดาห์ปัจจุบัน แต่ **logic ตัดรอบตามวันที่ 15 และสิ้นเดือนยังไม่ถูก enforce อย่างเต็มที่** ที่ backend

### สิ่งที่รองรับแล้ว

- ป้องกันการ navigate ไปสัปดาห์ในอนาคต
- เมื่อตรวจสอบ 8 ชั่วโมงก่อน submit ระบบจะข้ามวันในอนาคต (เฉพาะวันที่ผ่านมาแล้วจะถูกตรวจ)

### สิ่งที่ยังขาด

- Backend ยังไม่ block การ submit timesheet หลังวันที่ 15 หรือสิ้นเดือนอย่างเป็นทางการ
- ไม่มีการแสดง "deadline" หรือ "cutoff date" ในหน้า Time Entry

### หมายเหตุ

- สำหรับการ enforce cutoff: ต้องพึ่งนโยบายและการแจ้งเตือนจากผู้จัดการในขณะนี้

---

## AC-3: Minimum 8 Hours Per Day Before Submission

**สถานะ**: ✅ รองรับ
**เมนู**: Time Entry

### วิธีใช้งาน

1. กรอกชั่วโมงในแต่ละวันใน grid
2. เมื่อกดปุ่ม **Submit** ระบบจะตรวจสอบทุกวันจันทร์–ศุกร์ที่ผ่านมาแล้ว
3. หากวันใดมีชั่วโมงรวมน้อยกว่า 8 ชั่วโมง จะมี dialog popup แสดงรายการวันที่มีชั่วโมงไม่ครบ

   **ตัวอย่าง Dialog:**
   ```
   Incomplete Hours
   The following days have less than 8 hours logged:

   Mon (Mar 18)     4.0h / 8h
   Wed (Mar 20)     6.5h / 8h
   ```

4. กด **OK, Got It** เพื่อปิด dialog และกลับไปแก้ไข — ระบบจะ **ไม่ submit** จนกว่าทุกวันจะครบ 8 ชั่วโมง

### หมายเหตุ

- การตรวจสอบเฉพาะวันจันทร์–ศุกร์ (weekday) ที่ผ่านมาเท่านั้น วันเสาร์–อาทิตย์ไม่นับ
- วันในอนาคต (เช่น หากวันนี้คือวันพุธ วันพฤหัส–ศุกร์จะยังไม่ถูกตรวจ) จะถูกข้ามไป

---

## AC-4: Allocate Hours to Multiple Charge Codes

**สถานะ**: ✅ รองรับ
**เมนู**: Time Entry

### วิธีใช้งาน

1. ในหน้า Time Entry ด้านล่างจะมีปุ่ม **+ Add Charge Code** (Sticky action bar)
2. คลิกปุ่มดังกล่าว จะมี dropdown ให้เลือก Charge Code จากรายการที่ assigned ให้กับ user
3. เลือก Charge Code ที่ต้องการ — แถวใหม่จะถูกเพิ่มใน grid
4. กรอกชั่วโมงในแต่ละวันสำหรับแต่ละ Charge Code ตามต้องการ
5. สามารถเพิ่มได้หลาย Charge Code ในสัปดาห์เดียวกัน

### ลบ Charge Code ออกจาก Grid

- คลิกปุ่ม `×` ที่ด้านซ้ายของแถว Charge Code เพื่อลบออก (ชั่วโมงที่กรอกไว้จะหายไป)

### หมายเหตุ

- Charge Code ที่แสดงในรายการเป็น Charge Code ที่ assigned ให้กับ user เท่านั้น
- หาก Charge Code ที่ต้องการไม่ปรากฏ ติดต่อ Admin หรือ Charge Code Owner เพื่อขอสิทธิ์เข้าถึง

---

## AC-5: Split Time Across Multiple Tasks in One Day

**สถานะ**: ✅ รองรับ
**เมนู**: Time Entry

### วิธีใช้งาน

1. เพิ่ม Charge Code หลายรายการใน grid (ตาม AC-4)
2. ในคอลัมน์วันเดียวกัน ให้กรอกชั่วโมงในแต่ละแถว Charge Code ตามสัดส่วนที่ทำงานจริง

   **ตัวอย่าง:**
   ```
   วันจันทร์ 18 มี.ค.
   - PRJ-001 Digital Platform    4h
   - OPS-002 Internal Support    2h
   - ADM-001 Admin Work          2h
   รวม: 8h
   ```

3. ระบบจะแสดงยอดรวมชั่วโมงต่อวันโดยอัตโนมัติ

### หมายเหตุ

- ไม่มีการจำกัดจำนวน Charge Code ต่อวัน — แบ่งได้ตามความเป็นจริงของงาน
- ค่าที่กรอกได้เป็นทศนิยม เช่น `1.5`, `2.25`

---

## AC-6: Optional Work Descriptions

**สถานะ**: ✅ รองรับ
**เมนู**: Time Entry → Note icon บนเซลล์ชั่วโมง

### วิธีใช้งาน

**เพิ่ม Note ใหม่:**
1. กรอกชั่วโมงในเซลล์ที่ต้องการก่อน
2. เอา mouse hover บนเซลล์นั้น — จะมีปุ่มไอคอนดินสอ (สีเขียว) ปรากฏที่มุมขวาบนของเซลล์
3. คลิกปุ่มดังกล่าว — จะมี dialog "Note for [ชื่อ Charge Code] · [วันที่]" popup ขึ้นมา
4. พิมพ์คำอธิบายงานที่ทำในวันนั้น
5. คลิก **Save Note**

**ดู/แก้ไข Note ที่มีอยู่แล้ว:**
- เซลล์ที่มี note จะมี **สามเหลี่ยมสีส้มเล็กๆ** ที่มุมขวาบน (corner triangle indicator)
- คลิกสามเหลี่ยมนั้นเพื่อเปิด dialog แก้ไข note

### หมายเหตุ

- Note เป็น optional ไม่จำเป็นต้องกรอกทุกเซลล์
- Note จะถูกบันทึกพร้อมกับชั่วโมงเมื่อกด Save Draft หรือ Submit
- Note ยังแสดงในรายงานที่ผู้อนุมัติดู (ผู้อนุมัติสามารถอ่าน context ของงานได้)

---

## AC-7: Charge Code Hierarchy

**สถานะ**: ✅ รองรับ
**เมนู**: Charge Codes

### โครงสร้าง 4 ระดับ

| ระดับ | Badge สี | ความหมาย |
|-------|---------|---------|
| Program | สีเทาเข้ม | ระดับสูงสุด เช่น Digital Transformation Program |
| Project | สีเขียวน้ำทะเล (teal) | Project ภายใต้ Program |
| Activity | สีส้มอำพัน | กิจกรรมภายใต้ Project |
| Task | สีม่วง | งานย่อยภายใต้ Activity |

### วิธีดู Hierarchy

1. คลิก **Charge Codes** ในเมนูซ้าย
2. Panel ซ้ายจะแสดง **Tree view** — สามารถกด `▶` เพื่อ expand/collapse แต่ละระดับ
3. คลิก Charge Code ใดๆ เพื่อดูรายละเอียดใน Panel ขวา (ระดับ, Owner, Budget, ฯลฯ)

### หมายเหตุ

- ระบบรองรับ hierarchy สูงสุด 4 ระดับ (program → project → activity → task)
- Charge Code ระดับ `program` ไม่มี parent

---

## AC-8: Charge Code Creation at Any Level

**สถานะ**: ✅ รองรับ
**เมนู**: Charge Codes → สิทธิ์ Admin หรือ Charge Manager

### วิธีสร้าง Charge Code ใหม่ (ระดับ Top)

1. คลิก **Charge Codes** ในเมนู
2. คลิกปุ่ม **+ Create New** (ด้านบนของ panel ซ้าย)
3. กรอกข้อมูลในฟอร์ม:
   - **Level**: เลือก Program / Project / Activity / Task
   - **Name**: ชื่อ Charge Code
   - **Parent** (บังคับสำหรับระดับที่ไม่ใช่ Program): เลือก Charge Code แม่
   - **Billable**: เลือก Yes/No
   - **Budget Amount**: งบประมาณ (optional)
   - **Cost Center, Valid From/To, Owner, Approver** ตามต้องการ
4. คลิก **Create**

### วิธีสร้าง Charge Code ลูก (Child) จาก Tree

1. ใน Tree view panel ซ้าย hover บน Charge Code ที่ต้องการเพิ่ม child
2. จะมีปุ่ม `+` ปรากฏ — คลิกเพื่อสร้าง child ในระดับถัดไปทันที (ระบบกำหนด Level และ Parent อัตโนมัติ)

### หมายเหตุ

- **Program** เป็นระดับบังคับ — ต้องมี Program อย่างน้อยหนึ่งรายการก่อนจึงสร้าง Project ได้
- ระดับ Project, Activity, Task ต้องมี Parent เสมอ (ระบบ validate และ block หากไม่เลือก Parent)

---

## AC-9: Charge Code ID Prefix Format

**สถานะ**: ✅ รองรับ
**เมนู**: Charge Codes

### รูปแบบ ID

Charge Code ID เป็น free-text ที่ Admin/Charge Manager กำหนดเอง รองรับการใช้ prefix เพื่อแยกระดับ เช่น:

| ตัวอย่าง ID | ระดับ | ความหมาย |
|------------|------|---------|
| `PRG-001` | Program | Digital Transformation |
| `PRJ-001` | Project | Platform Modernization |
| `ACT-001` | Activity | Backend Development |
| `TSK-001` | Task | API Integration |

### วิธีกำหนด ID

1. ในฟอร์มสร้าง Charge Code กรอก **Charge Code ID** ตามรูปแบบที่องค์กรกำหนด
2. ระบบแสดง ID ใน mono font เพื่อให้อ่านง่าย และ ID ใช้ในการ roll-up ค่าใช้จ่ายใน hierarchy

### หมายเหตุ

- ไม่มีการ validate รูปแบบ ID แบบอัตโนมัติ — ขึ้นกับ naming convention ขององค์กร
- แนะนำให้กำหนดมาตรฐาน เช่น `DEPT-TYPE-NNN` ก่อนเริ่มใช้งานจริง

---

## AC-10: Charge Code Owner Access Control

**สถานะ**: ✅ รองรับ
**เมนู**: Charge Codes → แท็บ "Access"

### วิธีจัดการสิทธิ์ (สำหรับ Charge Code Owner/Admin)

1. คลิก Charge Code ที่ต้องการจัดการใน panel ซ้าย
2. ใน panel ขวา คลิกแท็บ **Access**
3. จะเห็นรายชื่อ **Assigned Users** (ผู้ที่มีสิทธิ์ log เวลาไปยัง Charge Code นี้)

**เพิ่ม User:**
4. คลิก **+ Add**
5. ค้นหา user ด้วยชื่อหรืออีเมล
6. Tick checkbox เลือก user ที่ต้องการ (รองรับ multi-select)
7. คลิก **Add (N)** เพื่อยืนยัน

**ลบ User:**
- คลิกปุ่ม `×` ข้างชื่อ user ในรายการ Assigned Users

### หมายเหตุ

- เฉพาะ Charge Code ที่ user ได้รับ assign เท่านั้นจะปรากฏใน dropdown ของหน้า Time Entry
- Owner และ Approver ของ Charge Code ถูกกำหนดในหน้า Create/Edit Charge Code (ไม่ใช่แท็บ Access)
- ขณะนี้การควบคุมสิทธิ์อยู่ที่ระดับ Charge Code แต่ละรายการ — ไม่ได้ cascade ลง child อัตโนมัติ

---

## AC-11: Charge Code Attributes

**สถานะ**: ✅ รองรับ
**เมนู**: Charge Codes → Overview tab

### Attributes ที่รองรับ

| Attribute | ที่เก็บ/ที่แสดง |
|-----------|--------------|
| Charge Code ID | Header ของ detail panel (monospace font) |
| Project/Program | Field `programName` และ hierarchy tree |
| Cost Center | แท็บ Overview → "Cost center" |
| Activity Category | แท็บ Overview → "Activity Category" |
| Budget Amount | แท็บ Budget → "Total budget" |
| Charge Code Owner | แท็บ Overview → "Owner" |
| Charge Code Approver | แท็บ Overview → "Approver" (default = Owner, สามารถ override ได้) |
| Valid Date Range | แท็บ Overview → "Valid" (วันเริ่ม–สิ้นสุด) |
| Billable/Non-Billable | แท็บ Overview → "Billable" (Yes/No) |

### วิธีแก้ไข Attributes

1. คลิก Charge Code ใน panel ซ้าย
2. คลิกปุ่ม **Edit** (panel ขวา มุมบนขวา)
3. แก้ไขค่าที่ต้องการ → คลิก **Save**

---

## AC-12: Approval Workflow

**สถานะ**: ✅ รองรับ
**เมนู**: Approvals (มองเห็นเฉพาะ admin, charge_manager)

### ลำดับขั้นตอน

```
Employee (submit)
     ↓
Charge Manager (approve/reject)
     ↓
Locked (ปิดการแก้ไข)
```

**Single-stage approval**: Charge Manager (ผู้ที่เป็น manager ของ employee หรือ CC Owner/Approver ของ charge code ที่มี entry) approve ครั้งเดียว → approved → auto-lock เมื่อ period สิ้นสุด

### สถานะ Timesheet

| สถานะ | สี Badge | ความหมาย |
|-------|---------|---------|
| Draft | เทา | กำลังบันทึก ยังไม่ submit |
| Submitted | เหลือง | ส่งอนุมัติแล้ว รอ Charge Manager |
| Approved | เขียว | Charge Manager อนุมัติแล้ว รอ auto-lock เมื่อ period จบ |
| Locked | เขียว | ถูก Lock แล้ว แก้ไขไม่ได้ |
| Rejected | แดง | ถูกปฏิเสธ กลับมาแก้ไขได้ |

### เงื่อนไขการ Lock

- ถ้า period **จบแล้ว** (วันนี้ > periodEnd): approve → **locked ทันที**
- ถ้า period **ยังไม่จบ**: approve → **approved** → ระบบ auto-lock เมื่อถึง cutoff (15th / สิ้นเดือน)

### ใครเห็น Pending Approval?

ผู้ที่ตรงเงื่อนไขอย่างน้อยหนึ่งข้อ:
1. เป็น **manager** ของ employee ที่ submit (`profiles.managerId`)
2. เป็น **CC Owner** ของ charge code ที่มี entry ใน timesheet (`chargeCodes.ownerId`)
3. เป็น **CC Approver** ของ charge code ที่มี entry ใน timesheet (`chargeCodes.approverId`)

### หมายเหตุ

- Manager ถูกกำหนดผ่าน field `managerId` ในตาราง profiles (Admin จัดการผ่าน /admin/users)
- CC Owner/Approver ถูกกำหนดในหน้า Charge Code
- PMO ไม่สามารถ approve timesheet ได้ — PMO มีสิทธิ์ดู Reports และ Budget เท่านั้น (monitor only)
- การแจ้งเตือนผ่าน Notification Bell เมื่อมี timesheet ส่งมาอนุมัติ

---

## AC-13: Approval Functions

**สถานะ**: ✅ รองรับ
**เมนู**: Approvals

### Submit Timesheet (Employee)

1. ไปที่ **Time Entry**
2. กรอกชั่วโมงครบทุกวัน (≥ 8h/วัน สำหรับวัน weekday ที่ผ่านมา)
3. คลิก **Submit →**
4. Timesheet status เปลี่ยนเป็น `Submitted`

### Approve Timesheet (Charge Manager)

1. ไปที่ **Approvals**
2. เลือกแท็บ **Pending Approvals**
3. Timesheets ที่รอการอนุมัติจะแสดงเป็นรายการ พร้อม badge จำนวน
4. **Bulk Approve:** Tick checkbox หลายรายการ → คลิก **Approve Selected**
5. **Approve รายการเดียว:** คลิกปุ่ม ✓ ข้างรายการ
6. **Reject:** คลิกปุ่ม ✗ → กรอก comment → Confirm

### Lock Timesheet

- เมื่อ Charge Manager approve:
  - ถ้า period จบแล้ว → `Locked` ทันที
  - ถ้า period ยังไม่จบ → `Approved` (รอ auto-lock)
- ระบบ auto-lock timesheets ที่ status = `submitted` หรือ `approved` เมื่อถึง cutoff (15th / สิ้นเดือน)

### ดูประวัติการอนุมัติ

1. ไปที่ **Approvals** → แท็บ **History**
2. ดูรายการที่ Approve/Reject พร้อมวันที่, type (Manager/CC), และ comment

---

## AC-14: Actual Cost Calculation

**สถานะ**: ✅ รองรับ
**เมนู**: Budget, Reports → ใช้สูตร `Actual Cost = Hours × Hourly Rate (by Job Grade)`

### วิธีการคำนวณ

ระบบคำนวณอัตโนมัติโดย:
1. ดึง `job_grade` ของ employee จาก profile
2. ค้นหา `hourly_rate` จากตาราง Cost Rates ที่ตรงกับ job_grade และวันที่บันทึก
3. คำนวณ `calculated_cost = hours × hourly_rate` ต่อ entry
4. Roll up ค่าใช้จ่ายผ่าน charge code hierarchy (leaf → activity → project → program)

### กำหนด Cost Rates (Admin)

1. ไปที่ **Admin → Rates** (เฉพาะ admin เท่านั้น)
2. ดูตาราง Cost Rates แสดง Job Grade, Hourly Rate, Effective From/To, Status
3. คลิก **Add Rate** → กรอก Job Grade (เช่น `L3`), Hourly Rate, วันที่มีผล
4. รองรับ Rate ที่มี Effective Date Range — ระบบใช้ Rate ที่ถูกต้องตามวันที่บันทึก

### กำหนด Company Billing Rate

- ในหน้า Admin → Rates มีส่วน **Company Billing Rate** (อัตราเรียกเก็บจากลูกค้า/วัน)
- คลิกปุ่มดินสอเพื่อแก้ไข → ระบบแสดง rate ต่อวันและแปลงเป็นต่อชั่วโมงให้อัตโนมัติ

### กำหนด Job Grade ให้ User (Admin)

1. ไปที่ **Admin → Users**
2. คลิกปุ่มดินสอข้าง user ที่ต้องการ
3. แก้ไข field **Job Grade** (เช่น `L3`, `L5`)
4. คลิก **Save Changes**

### หมายเหตุ

- หาก user ไม่มี job_grade หรือไม่มี cost rate ตรงกับวันที่ → ค่า `calculated_cost` จะเป็น 0
- ข้อมูลต้นทุนจะปรากฏใน Budget และ Reports หลังจาก recalculate (trigger โดย admin หรืออัตโนมัติ)

---

## AC-15: Reporting and Monitoring

**สถานะ**: ✅ รองรับ
**เมนู**: Reports & Analytics

### วิธีใช้งาน Reports

1. คลิก **Reports** ในแถบเมนูซ้าย
2. เลือก **Period** (เดือน) และ **Program** (ใช้กรองตาม program ที่ต้องการ หรือ "All Programs")

### KPI Cards (แถวบนสุด)

| Card | ข้อมูล |
|------|--------|
| Total Budget | งบประมาณรวมทุก charge code |
| Actual Spent | ค่าใช้จ่ายจริงสะสม (% consumed) |
| Utilization | อัตราการใช้ชั่วโมงจริงต่อชั่วโมงที่มี |
| Overrun Count | จำนวน charge code ที่เกิน budget / ที่เสี่ยง |

### สูตรคำนวณ Reports KPI

| Card | สูตร |
|------|------|
| Total Budget | `SUM(charge_codes.budget_amount)` ของทุก charge code ที่กรอง |
| Actual Spent | `SUM(hours × hourly_rate)` ของ timesheet entries ทั้งหมด |
| Consumed % | `(Actual Spent / Total Budget) × 100` |
| Utilization | `(Total Logged Hours / Total Available Hours) × 100` โดย Available Hours = Working Days × 8h × จำนวน Employee |
| Overrun Count | จำนวน charge code ที่ Actual > Budget |
| At Risk Count | จำนวน charge code ที่ Actual > 80% ของ Budget |

### Charts

| Chart | ข้อมูล |
|-------|--------|
| Budget vs Actual | Bar chart เปรียบ budget กับ actual ของแต่ละ charge code |
| Chargeability by Team | Gauge chart แสดง billable hours ต่อ total hours เทียบกับ target 80% |
| Activity Distribution | Pie chart แสดงสัดส่วน hours ตาม activity category |

### Financial P/L และ Alerts

ด้านล่างของหน้า Reports มีส่วน **Financial Impact**:
- แสดง budget vs actual vs variance ต่อ charge code
- **Budget Alerts**: รายการ charge code ที่ budget เกิน 80% (yellow), 90% (orange), หรือ >100% (red)
- **Chargeability Alerts**: รายการ employee ที่ chargeability ต่ำกว่า 80% target

### Export

- คลิกปุ่ม **Export CSV** (มุมขวาบน) เพื่อดาวน์โหลด budget alerts เป็น CSV
- ปุ่ม **Export PDF** มีใน UI แต่ยังอยู่ระหว่างพัฒนา (ไม่มี backend)

---

## AC-16: Report Outputs

**สถานะ**: ✅ รองรับ
**เมนู**: Reports, Budget

### 1. Project Cost Reports

**เมนู**: Reports → กรอง Program → Chart "Budget vs Actual"

1. เลือก Program ที่ต้องการจาก dropdown ด้านบน
2. Chart "Budget vs Actual" จะแสดงข้อมูลระดับ child charge codes ของ program นั้น
3. ดูตาราง Financial P/L ด้านล่างสำหรับ breakdown รายละเอียด

### 2. Program Financial Tracking

**เมนู**: Budget Tracking

1. คลิก **Budget** ในเมนูซ้าย
2. ดู KPI cards: Total Budget, Actual Spent, Forecast, Status (on track/over/at risk)
3. ตาราง "Budget by Charge Code" แสดงทุก program พร้อม:
   - Budget, Actual, Usage bar, Forecast, Variance, Status badge
4. คลิกแถว program เพื่อ expand ดู child breakdown

### 3. Resource Utilization Dashboards

**เมนู**: Reports → Card "Utilization"

- แสดง overall utilization rate (%)
- รายชื่อ employee พร้อม available hours, logged hours, utilization rate

### 4. Activity Distribution Analytics

**เมนู**: Reports → Chart "Activity Distribution"

- Pie chart แสดงสัดส่วน hours ตาม activity category (เช่น Development, Testing, Meeting)
- กรอง period ได้

### 5. Budget Overrun Alerts

**เมนู**: Reports → ส่วน "Alerts" / Notification Bell

| Severity | เงื่อนไข |
|----------|---------|
| Yellow | Actual > 80% ของ budget หรือ Forecast > Budget |
| Orange | Actual > 90% ของ budget |
| Red | Actual > 100% ของ budget (เกินแล้ว) |

- Notification Bell (ไอคอนกระดิ่งบน topbar) แสดง alerts แบบ real-time
- คลิก bell เพื่อดู top 5 alerts พร้อมรายละเอียด

### 6. Low Chargeability Alerts

**เมนู**: Reports → Financial P/L → แท็บ "Chargeability Alerts"

| Severity | เงื่อนไข |
|----------|---------|
| Yellow | Chargeability 70–79% |
| Orange | Chargeability 60–69% |
| Red | Chargeability < 60% |

- แสดง employee name, billable hours, total hours, chargeability %, และ cost impact

---

## AC-17: Advanced Features

**สถานะ**: ⚠️ รองรับบางส่วน
**เมนู**: หลากหลาย (ดูตาราง)

### Feature Matrix

| Feature | สถานะ | เมนู / หมายเหตุ |
|---------|-------|----------------|
| Auto Calendar (weekends/holidays) | ✅ รองรับ | Admin → Calendar |
| Vacation Requests | ✅ รองรับ | Admin → Calendar (pending vacations) |
| Personal Notifications (in-app) | ✅ รองรับ | Notification Bell → /notifications |
| Budget/Chargeability Alert Notifications | ✅ รองรับ | Notification Bell (real-time) |
| Teams-based logging via chatbot | ❌ ยังไม่รองรับ | ไม่มีใน roadmap ปัจจุบัน |
| Reminder via Teams | ❌ ยังไม่รองรับ | ไม่มี Teams integration |
| Incomplete logging summary for Charge Manager | ⚠️ บางส่วน | ดูจาก Approvals → pending list |
| Weekly insight summary to Program Owner | ❌ ยังไม่รองรับ | ไม่มีการส่งอีเมล/รายงานอัตโนมัติ |
| Upload/link project tracking sheet | ❌ ยังไม่รองรับ | ไม่มีใน scope ปัจจุบัน |

### การใช้งาน Auto Calendar

1. ไปที่ **Admin → Calendar** (เฉพาะ admin)
2. เลือกปีและประเทศ (Thailand, US, UK, Japan, Singapore)
3. คลิก **Populate Weekends** เพื่อ mark วันเสาร์–อาทิตย์ทั้งปีอัตโนมัติ
4. คลิก **Add Holiday** เพื่อเพิ่มวันหยุดนักขัตฤกษ์ด้วยตนเอง
5. Calendar grid แสดง 12 เดือนในหน้าเดียว — วันหยุดสีแดง, weekend สีเทา, วันนี้มีกรอบเขียว

### การจัดการ Vacation Requests

1. ในหน้า Admin → Calendar ด้านล่าง จะมีส่วน **Pending Vacation Requests** (แสดงเฉพาะเมื่อมี request)
2. Manager คลิก **Approve** หรือ **Reject** ต่อแต่ละ request

### การแจ้งเตือน In-App

- คลิก **Notification Bell** (ไอคอนกระดิ่ง) บน topbar
- แสดงรายการแบ่งเป็น 2 ส่วน:
  - **Personal**: การแจ้งเตือนส่วนตัว เช่น timesheet ถูก approve/reject (ยังไม่อ่าน)
  - **Alerts**: Budget/Chargeability alerts
- คลิก **View all notifications →** เพื่อไปหน้า `/notifications` ดูประวัติทั้งหมด

---

## สูตรคำนวณ KPI ทุกหน้า

### Dashboard KPI Cards

| Card | สูตร | สีสถานะ |
|------|------|---------|
| **Hours this period** | `SUM(hours)` ของ entries ในสัปดาห์ปัจจุบัน / 40h (target) | เขียว: ≥40h, เหลือง: >0h, เทา: 0h |
| **Chargeability** | `(Billable Hours / Total Hours) × 100` โดย Billable Hours = hours ของ charge code ที่ `isBillable = true` | เขียว: ≥80%, เหลือง: >0%, เทา: 0% |
| **Pending approvals** | `COUNT(timesheets)` ที่ status = `submitted` ที่รอ user ปัจจุบัน approve | เหลือง: >0, เทา: 0 |
| **Active charge codes** | `COUNT(charge_codes)` ที่ assigned ให้ user ปัจจุบัน | แสดงจำนวน billable ใน subtext |

**Trend (vs prior):**
- Hours: `current_week_hours - previous_week_hours` → แสดงเป็น `+Xh` หรือ `-Xh`
- Chargeability: `current_chargeability% - previous_chargeability%` → แสดงเป็น `+X%` หรือ `-X%`

### Reports KPI Cards

| Card | สูตร |
|------|------|
| **Total Budget** | `SUM(charge_codes.budget_amount)` ของทุก charge code ที่กรอง |
| **Actual Spent** | `SUM(hours × hourly_rate)` ของ timesheet entries, consumed% = `(Actual / Budget) × 100` |
| **Utilization** | `(Total Logged Hours / Total Available Hours) × 100` โดย Available = Working Days × 8h × จำนวน Employee |
| **Overrun Count** | จำนวน charge code ที่ Actual > Budget, at risk = Actual > 80% Budget |

### Budget KPI Cards

| Card | สูตร |
|------|------|
| **Total Budget** | `SUM(budget_amount)` ของ charge codes ที่แสดงในตาราง |
| **Actual Spent** | `SUM(actual)` ของ charge codes ที่แสดงในตาราง, consumed% = `(Actual / Budget) × 100` |
| **Forecast** | `SUM(forecast)` ของ charge codes, เทียบกับ Budget ว่า over หรือ within |
| **Status** | `on_track_count / total_count`, โดย on track = severity `green`, at risk = `yellow`/`orange`, over = `red` |

### Budget Severity

| Severity | เงื่อนไข | สี |
|----------|---------|-----|
| Green (On Track) | Actual ≤ 80% ของ Budget | เขียว |
| Yellow (Warning) | Actual > 80% ของ Budget หรือ Forecast > Budget | เหลือง |
| Orange (At Risk) | Actual > 90% ของ Budget | ส้ม |
| Red (Over Budget) | Actual > 100% ของ Budget | แดง |

### Actual Cost Calculation

```
Actual Cost per entry = hours × hourly_rate(job_grade, date)
Total Actual per CC  = SUM(Actual Cost) of all entries for that charge code
Variance             = Budget - Actual (บวก = เหลือ, ลบ = เกิน)
Forecast             = คำนวณโดย backend based on current burn rate
```

### Chargeability Alerts (Reports)

| Severity | เงื่อนไข |
|----------|---------|
| Yellow | Chargeability 70–79% |
| Orange | Chargeability 60–69% |
| Red | Chargeability < 60% |

---

## Alerts & Notifications — Conditions & Triggers

### Notification Types

| Type | ผู้รับ | Trigger |
|------|--------|---------|
| `timesheet_reminder` | Employee ที่ยังไม่ submit | Daily 09:00 (จันทร์-ศุกร์) ถ้า timesheet สัปดาห์นี้ยังไม่ครบ |
| `timesheet_reminder` | Employee ที่มี draft | Cutoff day (15th / สิ้นเดือน) เตือนว่าจะถูก auto-lock |
| `approval_reminder` | Charge Manager | เมื่อมี timesheet รอ approve (ส่งผ่าน manual trigger) |
| `manager_summary` | Manager | Weekly summary ของ team: completed, pending, draft |
| `weekly_insights` | PMO, Finance, Admin | ทุกวันจันทร์ 07:00 — สรุป hours/costs per program |

### Scheduled Jobs (Cron)

| Job | Schedule | สิ่งที่ทำ |
|-----|----------|----------|
| `daily-timesheet-reminder` | `0 9 * * 1-5` (จันทร์-ศุกร์ 09:00) | เช็ค employee ที่ timesheet ไม่ครบ → ส่ง notification |
| `daily-budget-alert` | `0 8 * * *` (ทุกวัน 08:00) | เช็ค charge codes ที่เกิน budget threshold → ส่ง alert ไป Teams |
| `weekly-insight-summary` | `0 7 * * 1` (จันทร์ 07:00) | สรุป hours/costs สัปดาห์ก่อน → ส่งให้ PMO/Finance/Admin |
| `mid-month-cutoff` | `5 0 15 * *` (วันที่ 15 เที่ยงคืน) | Auto-lock timesheets ที่ status = `submitted`/`approved` ก่อน cutoff |
| `end-of-month-cutoff` | `5 0 28-31 * *` (วันสุดท้ายของเดือน) | เหมือน mid-month-cutoff |

### Budget Alert Severity Conditions

| Severity | เงื่อนไข | สี |
|----------|---------|-----|
| **Red** (Over Budget) | `actual / budget > 1.0` (เกิน 100%) | แดง 🔴 |
| **Orange** (At Risk) | `actual / budget > 0.9` (เกิน 90%) | ส้ม 🟠 |
| **Yellow** (Warning) | `actual / budget > 0.8` (เกิน 80%) หรือ `forecast > budget` | เหลือง 🟡 |
| **Green** (On Track) | `actual / budget ≤ 0.8` และ `forecast ≤ budget` | เขียว ✅ |

### Chargeability Alert Conditions

เงื่อนไข: `Chargeability = (Billable Hours / Total Hours) × 100`, Target = **80%**

| Severity | เงื่อนไข |
|----------|---------|
| **Red** | Chargeability < 60% |
| **Orange** | Chargeability 60–69% |
| **Yellow** | Chargeability 70–79% |
| (ไม่แสดง) | Chargeability ≥ 80% (ถึง target) |

### Dashboard Alert Conditions (Employee View)

| Alert | เงื่อนไข |
|-------|---------|
| Missing hours warning | `weeklyHours < 40h` และ `timesheet.status = 'draft'` และ `weeklyHours > 0` |
| Low chargeability | `chargeability > 0` และ `chargeability < 80%` |
| Period closing soon | `daysUntilEnd ≤ 2` และ `timesheet.status = 'draft'` |

### Dashboard Alert Conditions (Manager View)

| Alert | เงื่อนไข |
|-------|---------|
| Pending approvals | `pendingCount > 0` → badge สีเหลือง |
| Team chargeability low | `chargeability < 80%` และ `chargeability > 0` |
| Budget overrun | จาก API `/reports/budget-alerts` แสดง charge codes ที่ severity = red/orange/yellow |

### Notification Bell (Topbar)

| ส่วน | ข้อมูล |
|------|--------|
| **Badge count** | `COUNT(notifications)` ที่ `is_read = false` สำหรับ user ปัจจุบัน (เฉพาะ dismissable) |
| **Popover — Personal** | DB notifications: timesheet_reminder, approval_reminder, manager_summary |
| **Popover — Alerts** | Real-time: budget alerts + chargeability alerts (ไม่นับใน badge) |
| **Click action** | ทุก item → navigate ไป `/notifications` |

### Auto-Lock Conditions (Cutoff)

| เงื่อนไข | ผลลัพธ์ |
|---------|--------|
| Cutoff day + status = `submitted` | Auto-lock → `locked` |
| Cutoff day + status = `approved` | Auto-lock → `locked` |
| Cutoff day + status = `draft` | ส่ง warning notification (ไม่ lock draft) |
| Charge Manager approve + period จบแล้ว | Lock ทันที |
| Charge Manager approve + period ยังไม่จบ | เปลี่ยนเป็น `approved` (รอ auto-lock) |

---

## ข้อมูลอ้างอิง

### Test Accounts (Password: `password1234`)

| Email | Role | ใช้ทดสอบ |
|-------|------|---------|
| tachongrak@central.co.th | Admin | จัดการทุกอย่าง |
| admin-th@central.co.th | Admin | จัดการทุกอย่าง (สำหรับ CEO demo) |
| nattaya.k@central.co.th | Charge Manager | อนุมัติ timesheet |
| wichai.s@central.co.th | Employee | log เวลา, submit timesheet |
| ploy.r@central.co.th | Employee | log เวลา, submit timesheet |
| somchai.p@central.co.th | PMO | ดู reports และ budget (monitor only) |
| kannika.t@central.co.th | Finance | Cost allocation, ดู reports |

## Manager Hierarchy
Tachongrak (admin, ไม่มี manager)
├── Nattaya (charge_manager)
│   ├── Wichai (employee)
│   └── Ploy (employee)
├── Somchai (pmo)
└── Kannika (finance)


### สิทธิ์การเข้าถึงแต่ละเมนู

| เมนู | Employee | Charge Manager | PMO | Finance | Admin |
|------|---------|----------------|-----|---------|-------|
| Time Entry | ✅ | ✅ | ✅ | ✅ | ✅ |
| Charge Codes | ❌ | ✅ | ✅ | ✅ | ✅ |
| Approvals | ❌ | ✅ | ❌ | ❌ | ✅ |
| Reports | ❌ | ❌ | ✅ | ✅ | ✅ |
| Budget | ❌ | ❌ | ✅ | ✅ | ✅ |
| Admin → Users | ❌ | ❌ | ❌ | ❌ | ✅ |
| Admin → Calendar | ❌ | ❌ | ❌ | ❌ | ✅ |
| Admin → Rates | ❌ | ❌ | ❌ | ❌ | ✅ |

---

*อัปเดตล่าสุด: 2026-03-18*


