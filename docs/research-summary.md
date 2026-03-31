# Research Summary — Timesheet User Manual

> **Generated**: 2026-03-31
> **Purpose**: Reference for builder agent to make informed edits to the user manual

---

## 1. Current Manual Section Outline

Source: `docs/timesheet-user-manual.md` (v4.0, updated 2026-03-31)

| Heading Text | Level | Line |
|---|---|---|
| คู่มือการใช้งานระบบ Timesheet | H1 | 1 |
| สารบัญ | H2 | 9 |
| ใครควรอ่านส่วนไหน (Who Should Read What) | H2 | 30 |
| 1. ภาพรวมระบบ | H2 | 45 |
| 2. การเข้าใช้งาน | H2 | 77 |
| 2.1 เข้าสู่ระบบ (Login) | H3 | 79 |
| 2.2 ส่วนต่าง ๆ ของหน้าจอ | H3 | 94 |
| 2.3 ออกจากระบบ | H3 | 103 |
| 3. หน้าหลัก (Dashboard) | H2 | 109 |
| 3.1 ส่วนต้อนรับ (ด้านบน) | H3 | 117 |
| 3.2 แถบความคืบหน้า (Progress Bar) | H3 | 125 |
| 3.3 ปุ่มลัด (Quick Buttons) | H3 | 130 |
| 3.4 กล่องตัวเลข KPI (4 กล่อง) | H3 | 137 |
| 3.5 การแจ้งเตือน (Notifications Panel) | H3 | 148 |
| 4. การกรอกเวลา (Time Entry) 👤 | H2 | 162 |
| 4.1 เลือกสัปดาห์ | H3 | 170 |
| 4.2 โครงสร้างตาราง | H3 | 180 |
| 4.3 เพิ่มรหัสงาน (Add Charge Code) | H3 | 192 |
| 4.4 กรอกชั่วโมง | H3 | 200 |
| 4.5 ลบรหัสงานออกจากตาราง | H3 | 209 |
| 4.6 คัดลอกจากสัปดาห์ก่อน | H3 | 213 |
| 4.7 ขอใช้รหัสงานใหม่ | H3 | 217 |
| 4.8 การบันทึก | H3 | 221 |
| 5. การส่งอนุมัติ 👤 | H2 | 230 |
| 5.1 ตรวจสอบก่อนส่ง | H3 | 232 |
| 5.2 ขั้นตอนการส่ง | H3 | 240 |
| 5.3 สถานะของใบบันทึกเวลา | H3 | 249 |
| 5.4 กำหนดส่ง (Deadline) | H3 | 259 |
| 6. การอนุมัติ (Approval Workflow) 👔 | H2 | 266 |
| 6.1 ภาพรวมหน้า Approvals | H3 | 272 |
| 6.2 แท็บต่าง ๆ | H3 | 282 |
| 6.3 แท็บ Team Status | H3 | 291 |
| 6.4 อนุมัติทีละใบ | H3 | 311 |
| 6.5 อนุมัติทีเดียวหลายใบ (Bulk Approve) | H3 | 318 |
| 6.6 อนุมัติวันลา | H3 | 324 |
| 6.7 ลำดับขั้นตอนการอนุมัติ (Workflow) | H3 | 330 |
| 7. ปฏิทินและวันลา 👤 | H2 | 347 |
| 7.1 อ่านปฏิทิน | H3 | 353 |
| 7.2 ขอลาพักร้อน | H3 | 368 |
| 7.3 ประวัติวันลา | H3 | 375 |
| 8. รหัสงาน (Charge Codes) 👔 ⚙️ | H2 | 381 |
| 8.1 โครงสร้างรหัสงาน | H3 | 387 |
| 8.2 ค้นหาและกรอง | H3 | 397 |
| 8.3 ดูรายละเอียดรหัสงาน | H3 | 406 |
| 8.4 สร้างรหัสงานใหม่ (เฉพาะผู้ดูแล) | H3 | 413 |
| 9. รายงาน (Reports & Analytics) 📊 | H2 | 421 |
| 9.1 ภาพรวม (แท็บ Overview) | H3 | 427 |
| 9.2 แท็บต่าง ๆ | H3 | 445 |
| 9.3 ส่งออกข้อมูล (Export) | H3 | 454 |
| 10. งบประมาณ (Budget) 📊 | H2 | 462 |
| 10.1 ภาพรวมหน้า Budget | H3 | 468 |
| 10.2 ตาราง Budget by Charge Code | H3 | 485 |
| 10.3 ความหมายสี Status | H3 | 499 |
| 11. OT และชั่วโมงพิเศษ 👤 | H2 | 510 |
| 11.1 การบันทึก OT (Overtime) | H3 | 512 |
| 11.2 รหัสงานสำหรับ OT | H3 | 521 |
| 11.3 วันลาและวันหยุด | H3 | 526 |
| 12. การตั้งค่า (Settings) | H2 | 534 |
| 12.1 Appearance (ลักษณะหน้าจอ) | H3 | 540 |
| 12.2 Currency (สกุลเงิน) | H3 | 546 |
| 13. หน้าจัดการระบบ (Admin) ⚙️ | H2 | 554 |
| 13.1 จัดการผู้ใช้ (Admin > Users) | H3 | 558 |
| 13.2 จัดการปฏิทิน (Admin > Calendar) | H3 | 578 |
| 13.3 จัดการอัตราค่าใช้จ่าย (Admin > Rates) | H3 | 587 |
| 14. สิทธิ์การใช้งานตามตำแหน่ง | H2 | 613 |
| 15. สรุปขั้นตอนการใช้งาน | H2 | 627 |
| พนักงาน — ทำทุกสัปดาห์ | H3 | 629 |
| หัวหน้างาน — ทำทุกสัปดาห์ | H3 | 639 |
| ผู้บริหาร / การเงิน — ทำทุกเดือน | H3 | 649 |
| 16. ฟีเจอร์ AI (AI-Powered Features) 👤 | H2 | 660 |
| 16.1 บันทึกเวลาด้วย AI (Record Time by AI) | H3 | 664 |
| 16.2 แนะนำ Charge Code อัตโนมัติ (Auto-Suggest Charge Codes) | H3 | 679 |
| 16.3 AI Chatbot ช่วยเหลือ (AI Chatbot Assistance) | H3 | 692 |

**Total**: 1 H1, 19 H2, 47 H3, 0 H4 — **67 headings**

---

## 2. FAQ Section Location

**There is no FAQ section in `timesheet-user-manual.md`.**

- No heading contains "FAQ" or "คำถามที่พบบ่อย"
- The manual ends at line 717 with a generic "ต้องการความช่วยเหลือเพิ่มเติม?" footer (line 716)
- The older `user-manual.md` (v3.0) also has no FAQ section

**Recommendation**: If a FAQ section is to be added, it would logically go as §17 after the AI features section (after line 714), before the closing footer.

---

## 3. Role Coverage Map

Based on the "ใครควรอ่านส่วนไหน" table (line 30–39) and §14 permission matrix (line 613–623):

### Employee (พนักงาน) 👤

| Section | Heading |
|---|---|
| §1 | ภาพรวมระบบ |
| §2 | การเข้าใช้งาน |
| §3 | หน้าหลัก (Dashboard) |
| §4 | การกรอกเวลา (Time Entry) |
| §5 | การส่งอนุมัติ |
| §7 | ปฏิทินและวันลา |
| §11 | OT และชั่วโมงพิเศษ |
| §12 | การตั้งค่า (Settings) |
| §15 | สรุปขั้นตอนการใช้งาน |
| §16 | ฟีเจอร์ AI |

### Manager (หัวหน้างาน / Charge Manager) 👔

All Employee sections plus:

| Section | Heading |
|---|---|
| §6 | การอนุมัติ (Approval Workflow) |
| §8 | รหัสงาน (Charge Codes) |

### Admin (ผู้ดูแลระบบ) ⚙️

**All sections** — everything from Employee + Manager plus:

| Section | Heading |
|---|---|
| §9 | รายงาน (Reports & Analytics) |
| §10 | งบประมาณ (Budget) |
| §13 | หน้าจัดการระบบ (Admin) |
| §14 | สิทธิ์การใช้งานตามตำแหน่ง |

**Note**: PMO/Finance shares §8, §9, §10 with Admin but does NOT have §6 (Approvals) or §13 (Admin panels).

---

## 4. AI Features (from chatbot-roadmap.md)

| Feature Name | Phase | Status | Description | UX Flow |
|---|---|---|---|---|
| **In-App Chat Widget** | Phase 1 | **Implemented** (2026-03-20) | Floating chat panel in authenticated layout, sends messages to Teams bot endpoint (`POST /api/v1/integrations/teams/message`), receives structured responses with suggested actions | User clicks chat icon → types natural language query → bot responds with text + suggested action buttons |
| **View Timesheets** (intent) | Phase 1 | Implemented | "show my timesheets", "what's my timesheet status" | Part of chat widget — text query → text response |
| **Check Chargeability** (intent) | Phase 1 | Implemented | "what's my chargeability", "am I billable enough" | Part of chat widget — text query → text response |
| **Check Pending Approvals** (intent) | Phase 1 | Implemented | "how many approvals are pending", "who hasn't submitted" | Part of chat widget — text query → text response |
| **Check Budget** (intent) | Phase 1 | Implemented | "is my project over budget", "show budget for PRJ-001" | Part of chat widget — text query → text response |
| **Microsoft Teams Bot** | Phase 2 | **Planned — not yet implemented** | Azure Bot Service + Bot Framework SDK; same NLP backend as in-app widget; employees can query via Teams DM; proactive notifications (reminders, alerts) can be delivered to Teams channel | Register Azure Bot → configure webhook URL → publish Teams app manifest → employees DM the bot in Teams |
| **Auto-complete Charge Codes** | Phase 3 | **Exploratory — not scoped** | LLM suggests most likely charge code when employee types a partial description, based on history | Employee types partial description → LLM returns ranked charge code suggestions |
| **Anomaly Detection** | Phase 3 | Exploratory — not scoped | Flags unusual patterns (e.g., "You logged 0 hours on Wednesday — is that correct?") | System proactively alerts user in chat about anomalies |
| **Natural Language Reports** | Phase 3 | Exploratory — not scoped | "Generate a P/L summary for PRG-001 in Q1 2026" returns a formatted table in chat | User types report query → LLM generates formatted table response |
| **Smart Reminders** | Phase 3 | Exploratory — not scoped | Personalized reminders based on employee's typical logging pattern | System sends contextual reminders (e.g., "You usually submit by Thursday noon — it's currently Thursday 3pm") |

**Dependencies for Phase 2**: Azure Bot resource, MicrosoftAppId/Password, webhook URL configuration, Teams manifest update.
**Dependencies for Phase 3**: Azure OpenAI or equivalent LLM API, conversation history storage, role-based prompt restrictions.

---

## 5. Screenshot Files Available

### docs/manual-screenshots/ (12 files)

1. `01-dashboard.png`
2. `02-time-entry-grid.png`
3. `03-calendar.png`
4. `04-charge-codes.png`
5. `05-approvals.png`
6. `06-reports.png`
7. `07-budget.png`
8. `08-admin-users.png`
9. `09-admin-calendar.png`
10. `10-admin-rates.png`
11. `11-settings.png`
12. `12-notifications-panel.png`

**Note**: No login flow screenshots. No HTML file. These are referenced by `timesheet-user-manual.md` (v4.0) using relative path `manual-screenshots/`.

### manual-screenshots/ (root — 15 files)

1. `01-login-page.png`
2. `02-login-filled.png`
3. `03-dashboard.png`
4. `04-time-entry.png`
5. `05-calendar.png`
6. `06-charge-codes.png`
7. `07-approvals.png`
8. `08-reports.png`
9. `09-budget.png`
10. `10-notifications.png`
11. `11-settings.png`
12. `12-admin-users.png`
13. `13-admin-calendar.png`
14. `14-admin-rates.png`
15. `user-manual.html`

**Note**: This directory has **login flow screenshots** (`01-login-page.png`, `02-login-filled.png`) and a **rendered HTML file** (`user-manual.html`). Referenced by the older `user-manual.md` (v3.0) using `images/` path prefix (broken — actual folder is `manual-screenshots/`).

### Key Differences

| Aspect | docs/manual-screenshots/ | manual-screenshots/ (root) |
|---|---|---|
| Login screenshots | **No** | **Yes** (01-login-page, 02-login-filled) |
| Rendered HTML | **No** | **Yes** (user-manual.html) |
| File count | 12 | 15 |
| Numbering | Starts at 01 (dashboard) | Starts at 01 (login) |
| Referenced by | timesheet-user-manual.md (v4.0) | user-manual.md (v3.0) |

---

## 6. manual-style.css Key Rules

Source: `docs/manual-style.css` (64 lines)

| Aspect | Value / Rule |
|---|---|
| **Fonts** | `-apple-system`, `'Noto Sans Thai'`, `'Sarabun'`, `sans-serif` |
| **Base font size** | `14px`, line-height `1.8` |
| **Color scheme** | Body text `#1a1a2e` (dark navy); H1 `#1a1a2e`; H2 `#16213e`; H3 `#0f3460`; H1 border `#00a5e0` (cyan); H2 border `#e0e0e0` (light gray); Table header bg `#f0f4f8`; Blockquote border `#00a5e0` |
| **Image rules** | `max-width: 100%`; `border: 1px solid #ddd`; `border-radius: 6px`; `margin: 12px 0`; `box-shadow: 0 2px 8px rgba(0,0,0,0.1)` |
| **Table rules** | `border-collapse: collapse`; `width: 100%`; `margin: 10px 0`; Cell border `1px solid #ddd`; Cell padding `6px 10px`; Cell font-size `13px`; Header bg `#f0f4f8`, font-weight `600` |
| **Heading styles** | H1: cyan bottom border (`2px solid #00a5e0`), padding-bottom `8px`; H2: light gray bottom border (`1px solid #e0e0e0`), margin-top `32px`, padding-bottom `4px`; H3: color `#0f3460`, no border |
| **Blockquote style** | Left border `3px solid #00a5e0`; padding `8px 14px`; background `#f8f9fa`; border-radius `0 4px 4px 0` |
| **Code style** | Background `#f0f0f0`; padding `1px 5px`; border-radius `3px`; font-size `12px` |
| **Print/PDF rules** | **None** — no `@media print` rules exist in the stylesheet |
