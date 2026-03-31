# Product Requirements Document (PRD): AI Project Risk Analysis & Summarization

## 1. บทสรุปผู้บริหาร (Executive Summary)
ปัจจุบันระบบ Timesheet & Budgeting มีข้อมูลโปรเจค, งบประมาณ, จำนวนชั่วโมงที่ใช้ไป (Actual), และตัวชี้วัดความสามารถในการทำกำไร (Chargeability) อยู่แล้ว อย่างไรก็ตาม ผู้จัดการโครงการหรือผู้บริหารอาจต้องใช้เวลาอ้างอิงข้อมูลหลายส่วนเพื่อตัดสินใจว่า "โปรเจคไหนกำลังมีความเสี่ยง และเพราะสาเหตุใด?" ฟีเจอร์ **AI Project Risk Analysis** จะเข้ามาทำหน้าที่รวบรวมข้อมูลดิบเหล่านี้ ส่งให้ AI (ผ่าน OpenRouter LLMs) ทำการวิเคราะห์หาสาเหตุของความเสี่ยง สรุปแนวโน้ม และเสนอแนะแนวทางแก้ไขแบบเรียลไทม์

## 2. ขอบเขตของระบบ (Scope)
ฟีเจอร์นี้จะมุ่งเน้นไปที่การวิเคราะห์ระดับ **Program / Project** เป็นหลัก โดยดึงข้อมูลตัวบ่งชี้เหล่านี้มาวิเคราะห์:
* **Budget Burn Rate:** จำนวนงบประมาณที่ถูกใช้ไปเทียบกับที่วางแผนไว้
* **Timesheet Tracking & Activity Distribution:** สัดส่วนของงานที่พนักงานใช้เวลาไป (เช่น เสียเวลาทำ Admin หรือ Bug Fix มากเกินไปหรือไม่)
* **Team Chargeability & Utilization:** ทรัพยากรที่มีอยู่ถูกใช้อย่างคุ้มค่าและกระจายงานได้ดีหรือไม่

### 2.1 In-Scope (สิ่งที่ครอบคลุมในเฟสนี้)
1. **AI Risk Summary Widget:** นำเสนอสรุปประเด็นเสี่ยงที่หน้า Dashboard (เช่น "3 โครงการที่ต้องจับตาเป็นพิเศษ")
2. **Deep-Dive Analysis:** ปุ่ม "Ask AI to analyze" ในหน้ารายละเอียดของ Budget หรือ Project เพื่อให้ AI สรุปสาเหตุของงบบานปลาย
3. **Actionable Insights:** AI เสนอแนวทางแก้ไข (เช่น "ควรย้ายชั่วโมงของนาย A ไปที่โครงการ B เนื่องจากความเชี่ยวชาญ...")
4. การเชื่อมต่อผ่าน OpenRouter API ที่มีอยู่ในระบบอยู่แล้ว (`OPENROUTER_API_KEY` ใน `.env`)

### 2.2 Out-of-Scope (สิ่งที่ยังไม่ครอบคลุมในเฟสนี้)
1. การให้ AI แก้ไขข้อมูล Timesheet หรืออนุมัติการเบิกจ่ายโดยอัตโนมัติ (AI อ่านข้อมูลเท่านั้น แนะนำเพื่อการตัดสินใจ)
2. การคุยกับ AI แบบ Chatbot อิสระที่ถามตอบเรื่องอื่นที่ไม่เกี่ยวกับโครงการ (ล็อกให้วิเคราะห์เฉพาะ Context ของ Cost & Schedule)

## 3. รายละเอียดฟีเจอร์ (Feature Details)

### 3.1 AI Risk Notification Card (หน้า Dashboard)
* **Description:** ระบบตรวจสอบ (Batch Job/Cron) ประจำวันเพื่อค้นหา Project ที่ "Overrun" หรือ "At Risk" (ใช้งบเร็วกว่ากำหนด) และให้ AI ร่างข้อความสั้นๆ ความยาวไม่เกิน 2-3 บรรทัด
* **User Flow:** 
  1. ข้อมูล Project 11 อันดับที่มีสถานะ "At Risk" จะถูกส่งไปให้ AI ประเมินเบื้องต้น
  2. แสดงผลบน Dashboard โดยมี Alert ⚠️ ว่า "Project X is burning budget 15% faster than expected primarily due to high non-billable hours from Team A."

### 3.2 AI Deep-dive Project Insight (หน้า Project / Budget Details)
* **Description:** มุมมองเจาะลึกเมื่อผู้จัดการคลิกดูโปรเจค จะมีแท็บหรือปุ่ม **"🤖 Generate Risk Insight"** 
* **Data Context Provided to AI:** 
  - Project Title & Total Budget
  - Actual Spent vs Forecast
  - Time entries ย้อนหลัง 2-4 สัปดาห์ แบ่งตาม User และ Category (Dev, QA, Leave, etc.)
* **AI Output Requirements:**
  - **The "Why":** ทำไมโปรเจคนี้เสี่ยง (เช่น "งบหมดไปกับการแก้บั๊กใน 2 สัปดาห์หลังสุดถึง 40%")
  - **The "When":** คาดการณ์ว่าถ้ายังเรตนี้ งบจะหมดภายในช่วงไหน
  - **The "Action":** ข้อเสนอแนะ 3 ข้อ

## 4. สถาปัตยกรรมและการไหลของข้อมูล (Architecture & Data Flow)
1. **Backend (NestJS):** 
   - สร้าง Endpoint `/api/v1/ai/project-risk/:projectId`
   - รวบรวมข้อมูล Data Aggregation จากตาราง `budgets`, `timesheets`, `charge_codes`
   - ใช้ `@nestjs/axios` เพื่อยิงข้อมูลพร้อม System Prompt ไปที่ OpenRouter API (เช่น โมเดล Claude 3.5 Sonnet สำหรับการวิเคราะห์ตรรกะซับซ้อน)
2. **Frontend (Next.js):**
   - ส่ง Request เรียกร้องการวิเคราะห์
   - เน้นใช้ Skeleton Loader ขณะรอผลวิเคราะห์จาก AI (เนื่องจาก API อาจใช้เวลา 5-15 วินาที)
   - แสดลผลสรุปในรูปแบบ Markdown/Alert Component (ใช้โลโก้/สีที่มีสไตล์เพื่อให้ดูแตกต่างจากข้อมูลตารางทั่วไป)

## 5. UI/UX Concept (ข้อเสนอแนะ)
- **Visuals:** ใช้กล่องข้อความที่มีขอบ Gradient สไตล์ AI หรือกล่อง Alert แบบ Glassmorphism เพื่อดึงดูดสายตาบน Dashboard
- **Tone of Voice:** ให้ AI ใช้คำพูดแบบ Professional แต่ตรงไปตรงมา เข้าใจง่าย ขีดเส้นใต้/ทำตัวหนา ในตัวเลขที่สำคัญ
- **On-demand execution:** การวิเคราะห์ข้อมูลเจาะลึกสงวนสิทธิ์ให้กดโหลดตามร้องขอ (On-demand) เพื่อลดภาระค่าใช้จ่าย (Cost) ของ AI API tokens แทนที่จะคำนวณใหม่ทุกครั้งที่มีคนเปิดหน้า

## 6. ข้อควรระวัง (Risks & Mitigations)
1. **Context Window Limitations:** การส่ง Data ของ Timesheet ทั้งหมดอาจทำให้ Token เกินกำหนด 
   * *Mitigation:* ควรสรุปยอด (Aggregate) ข้อมูลจาก Database ให้อยู่ในรูปแบบ JSON สรุปรายสัปดาห์ก่อนส่งให้ AI
2. **AI Hallucinations:** AI อาจคาดการณ์ตัวเลขผิด 
   * *Mitigation:* ใส่ Prompt กำชับว่า "ห้ามคำนวณตัวเลขเอง ให้ใช้ตัวเลขที่อยู่ในข้อมูล Data context หรือวิเคราะห์แนวโน้มเท่านั้น"
3. **Privacy / PII:** เลี่ยงการส่งข้อมูลส่วนตัวที่ไม่จำเป็นไปยัง AI ส่งแค่ Role (เช่น "Senior Dev") แทนชื่อถ้าหากกังวลเรื่องการเปิดเผยข้อมูลระดับบุคคล (ถึงแม้จะอยู่ในบริษัทเดียวกัน)
