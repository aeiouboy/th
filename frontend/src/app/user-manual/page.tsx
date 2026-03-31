'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Clock,
  CalendarDays,
  Tag,
  CheckCircle,
  BarChart3,
  DollarSign,
  Users,
  Settings,
  Bot,
  MessageSquare,
} from 'lucide-react';

/* ── Table of Contents data ──────────────────── */
const tocSections = [
  { id: 'overview', num: '1', title: 'ภาพรวมระบบ', icon: BookOpen },
  { id: 'login', num: '2', title: 'การเข้าใช้งาน', icon: Users },
  { id: 'dashboard', num: '3', title: 'หน้าหลัก (Dashboard)', icon: LayoutDashboard },
  { id: 'time-entry', num: '4', title: 'การกรอกเวลา (Time Entry)', icon: Clock },
  { id: 'ai', num: '5', title: 'ฟีเจอร์ AI', icon: Bot },
  { id: 'approval', num: '6', title: 'การอนุมัติ (Approval)', icon: CheckCircle },
  { id: 'charge-codes', num: '7', title: 'รหัสงาน (Charge Codes)', icon: Tag },
  { id: 'calendar', num: '8', title: 'ปฏิทินและวันลา', icon: CalendarDays },
  { id: 'reports', num: '9', title: 'รายงาน (Reports)', icon: BarChart3 },
  { id: 'budget', num: '10', title: 'งบประมาณ (Budget)', icon: DollarSign },
  { id: 'settings', num: '11', title: 'การตั้งค่า (Settings)', icon: Settings },
  { id: 'admin', num: '12', title: 'จัดการระบบ (Admin)', icon: Settings },
  { id: 'permissions', num: '13', title: 'สิทธิ์การใช้งานตามบทบาท', icon: Users },
  { id: 'weekly', num: '14', title: 'สรุปขั้นตอนประจำสัปดาห์', icon: CalendarDays },
];

/* ── Collapsible Section ─────────────────────── */
function Section({ id, title, num, icon: Icon, children, defaultOpen = false }: {
  id: string;
  title: string;
  num: string;
  icon: React.FC<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <CardTitle className="flex-1 text-lg">
            บทที่ {num}. {title}
          </CardTitle>
          {open ? <ChevronDown className="w-5 h-5 text-stone-400" /> : <ChevronRight className="w-5 h-5 text-stone-400" />}
        </div>
      </CardHeader>
      {open && (
        <CardContent className="pt-0 space-y-4 text-[14px] leading-relaxed text-[var(--text-primary)]">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

/* ── Lightbox ────────────────────────────────── */
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center text-xl hover:bg-black/70 transition-colors cursor-pointer"
        aria-label="Close"
      >
        ×
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

/* ── Styled img with caption + lightbox ──────── */
function Screenshot({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <figure className="my-4 cursor-pointer group" onClick={() => setOpen(true)}>
        <img
          src={src}
          alt={alt}
          className="w-full rounded-lg border border-[var(--border-default)] shadow-sm group-hover:shadow-md group-hover:border-teal-300 transition-all"
          loading="lazy"
        />
        <figcaption className="mt-1.5 text-xs text-[var(--text-muted)] text-center group-hover:text-teal-600 transition-colors">
          {alt} — กดเพื่อขยาย
        </figcaption>
      </figure>
      {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ── Note / Tip blockquote ───────────────────── */
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-3 border-teal-500 bg-teal-50/50 dark:bg-teal-900/20 rounded-r-lg px-4 py-3 text-sm">
      {children}
    </div>
  );
}

/* ── Main Page ───────────────────────────────── */
export default function UserManualPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 px-6 py-10 sm:px-10 lg:px-16">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          คู่มือการใช้งานระบบ Timesheet
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          RIS Timesheet & Cost Allocation System — เวอร์ชัน 4.1 ภาษาไทย
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge variant="secondary">อัปเดต: 31 มีนาคม 2026</Badge>
        </div>
      </div>

      {/* Who should read what */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ใครควรอ่านส่วนไหน</CardTitle>
          <CardDescription>คู่มือนี้ครอบคลุมทุกบทบาท — ใช้ตารางเพื่อข้ามไปยังส่วนที่เกี่ยวข้องกับคุณ</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>บทบาท</TableHead>
                <TableHead>สัญลักษณ์</TableHead>
                <TableHead>ส่วนที่ควรอ่าน</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">พนักงานทั่วไป (Employee)</TableCell>
                <TableCell>👤</TableCell>
                <TableCell>บทที่ 1–5 ภาพรวม, เข้าสู่ระบบ, Dashboard, กรอกเวลา, AI · 8 ปฏิทิน · 11 ตั้งค่า · 14 สรุปขั้นตอน</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">หัวหน้างาน (Charge Manager)</TableCell>
                <TableCell>👔</TableCell>
                <TableCell>ทุกส่วนของพนักงาน + บทที่ 6 อนุมัติ · 7 รหัสงาน</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">ผู้ดูแลระบบ (Admin)</TableCell>
                <TableCell>⚙️</TableCell>
                <TableCell>ทุกส่วน รวมถึง บทที่ 9 รายงาน · 10 งบประมาณ · 12 จัดการระบบ · 13 สิทธิ์</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">PMO / Finance</TableCell>
                <TableCell>📊</TableCell>
                <TableCell>ทุกส่วนของพนักงาน + บทที่ 7 รหัสงาน · 9 รายงาน · 10 งบประมาณ</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Table of Contents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">สารบัญ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {tocSections.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-sm"
                >
                  <Icon className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span className="text-[var(--text-muted)] w-5">{s.num}.</span>
                  <span>{s.title}</span>
                </a>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* ─── 1. ภาพรวมระบบ ──────────────────────── */}
      <Section id="overview" num="1" title="ภาพรวมระบบ" icon={BookOpen} defaultOpen>
        <p>ระบบ Timesheet เป็นเครื่องมือบันทึกเวลาทำงานและจัดสรรต้นทุนขององค์กร ใช้งานผ่านเว็บเบราว์เซอร์ได้ทุกอุปกรณ์</p>

        <h4 className="font-semibold mt-4">ระบบนี้ทำอะไรได้:</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ความสามารถ</TableHead>
              <TableHead>รายละเอียด</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">บันทึกเวลา</TableCell><TableCell>กรอกชั่วโมงทำงานรายสัปดาห์ แยกตามรหัสงาน (Charge Code)</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">ส่ง-อนุมัติ</TableCell><TableCell>ส่งใบบันทึกเวลาให้หัวหน้าตรวจสอบและอนุมัติ</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">ปฏิทินและวันลา</TableCell><TableCell>ดูวันหยุด วันลา และขอลาพักร้อน</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">ติดตามงบประมาณ</TableCell><TableCell>เปรียบเทียบงบที่ตั้งไว้กับค่าใช้จ่ายจริง</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">รายงาน</TableCell><TableCell>วิเคราะห์ต้นทุน อัตรา chargeability แยกตามโปรแกรม/หน่วยงาน/บุคคล</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">การแจ้งเตือน</TableCell><TableCell>แจ้งเตือนกำหนดส่ง สถานะอนุมัติ และงบประมาณ</TableCell></TableRow>
          </TableBody>
        </Table>

        <h4 className="font-semibold mt-4">เมนูหลักทางซ้ายมือ (Sidebar):</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ไอคอน</TableHead>
              <TableHead>หน้า</TableHead>
              <TableHead>ผู้ที่เห็น</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow><TableCell>🏠 Dashboard</TableCell><TableCell>หน้าหลัก</TableCell><TableCell>ทุกคน</TableCell></TableRow>
            <TableRow><TableCell>🕐 Time Entry</TableCell><TableCell>บันทึกเวลา</TableCell><TableCell>ทุกคน</TableCell></TableRow>
            <TableRow><TableCell>📅 Calendar</TableCell><TableCell>ปฏิทินและวันลา</TableCell><TableCell>ทุกคน</TableCell></TableRow>
            <TableRow><TableCell>🏷️ Charge Codes</TableCell><TableCell>รหัสงาน</TableCell><TableCell>หัวหน้า, ผู้ดูแล</TableCell></TableRow>
            <TableRow><TableCell>✅ Approvals</TableCell><TableCell>อนุมัติ</TableCell><TableCell>หัวหน้า, ผู้ดูแล</TableCell></TableRow>
            <TableRow><TableCell>📊 Reports</TableCell><TableCell>รายงาน</TableCell><TableCell>ผู้บริหาร, การเงิน</TableCell></TableRow>
            <TableRow><TableCell>💰 Budget</TableCell><TableCell>งบประมาณ</TableCell><TableCell>ผู้บริหาร, การเงิน</TableCell></TableRow>
            <TableRow><TableCell>👥 Admin</TableCell><TableCell>จัดการผู้ใช้/ปฏิทิน/อัตรา</TableCell><TableCell>ผู้ดูแลระบบ</TableCell></TableRow>
            <TableRow><TableCell>⚙️ Settings</TableCell><TableCell>ตั้งค่า</TableCell><TableCell>ทุกคน</TableCell></TableRow>
          </TableBody>
        </Table>
      </Section>

      {/* ─── 2. การเข้าใช้งาน ─────────────────────── */}
      <Section id="login" num="2" title="การเข้าใช้งาน" icon={Users}>
        <h4 className="font-semibold">2.1 เข้าสู่ระบบ (Login)</h4>
        <Screenshot src="/manual/01-login-page.png" alt="หน้าเข้าสู่ระบบ (Login)" />
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>เปิดเว็บไซต์ระบบ Timesheet ขององค์กร</li>
          <li>กรอก <strong>อีเมล</strong> ในช่องแรก (ตัวอย่าง: you@central.co.th)</li>
          <li>กรอก <strong>รหัสผ่าน</strong> ในช่องที่สอง
            <ul className="list-disc list-inside ml-4 text-[var(--text-muted)]">
              <li>กดปุ่ม <strong>&quot;Show&quot;</strong> ด้านขวาของช่องรหัสผ่าน เพื่อแสดงรหัสผ่านที่พิมพ์</li>
            </ul>
          </li>
          <li>กดปุ่มสีเขียว <strong>&quot;Sign In&quot;</strong></li>
        </ol>

        <Screenshot src="/manual/02-login-filled.png" alt="กรอกอีเมลและรหัสผ่าน" />

        <p className="mt-3"><strong>วิธีเข้าสู่ระบบอื่น:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>กดปุ่ม <strong>&quot;Sign in with Microsoft&quot;</strong> เพื่อเข้าด้วยบัญชี Microsoft ขององค์กร</li>
          <li>ถ้าลืมรหัสผ่าน กดลิงก์ <strong>&quot;Forgot password?&quot;</strong> → ระบบจะส่งอีเมลให้ตั้งรหัสผ่านใหม่</li>
        </ul>

        <h4 className="font-semibold mt-4">2.2 ส่วนต่าง ๆ ของหน้าจอ</h4>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>แถบเมนูด้านซ้าย (Sidebar)</strong> — ไอคอนสำหรับเปิดหน้าต่าง ๆ</li>
          <li><strong>แถบด้านบน</strong> — ปุ่มแฮมเบอร์เกอร์ (☰) + ชื่อหน้าที่เปิดอยู่</li>
          <li><strong>ปุ่มกระดิ่ง</strong> — แจ้งเตือน (มุมขวาบน)</li>
          <li><strong>รูปโปรไฟล์</strong> — มุมขวาบน กดเพื่อดูเมนูโปรไฟล์/ออกจากระบบ</li>
        </ul>

        <h4 className="font-semibold mt-4">2.3 ออกจากระบบ</h4>
        <p>กดที่ <strong>รูปโปรไฟล์</strong> ที่มุมขวาบน → เลือก <strong>&quot;Log out&quot;</strong></p>
      </Section>

      {/* ─── 3. Dashboard ────────────────────────── */}
      <Section id="dashboard" num="3" title="หน้าหลัก (Dashboard)" icon={LayoutDashboard}>
        <Screenshot src="/manual/01-dashboard.png" alt="หน้าหลัก Dashboard" />

        <h4 className="font-semibold">3.1 ส่วนต้อนรับ</h4>
        <Table>
          <TableHeader><TableRow><TableHead>สิ่งที่แสดง</TableHead><TableHead>ตัวอย่าง</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell>คำทักทาย + ชื่อ</TableCell><TableCell>&quot;Good evening, Tachongrak&quot;</TableCell></TableRow>
            <TableRow><TableCell>ช่วงสัปดาห์</TableCell><TableCell>&quot;Week of Mar 30 - Apr 5, 2026&quot;</TableCell></TableRow>
            <TableRow><TableCell>สถานะใบบันทึกเวลา</TableCell><TableCell>ป้ายสี เช่น Draft, Submitted, Approved</TableCell></TableRow>
          </TableBody>
        </Table>

        <h4 className="font-semibold mt-4">3.2 แถบความคืบหน้า</h4>
        <p>แสดง <strong>ชั่วโมงที่บันทึกแล้ว / เป้าหมาย</strong> เช่น &quot;0.0h / 40h logged&quot; พร้อมแถบแยกรายวัน จ.–ศ.</p>

        <h4 className="font-semibold mt-4">3.3 กล่องตัวเลข KPI (4 กล่อง)</h4>
        <Table>
          <TableHeader><TableRow><TableHead>กล่อง</TableHead><TableHead>ความหมาย</TableHead><TableHead>ตัวอย่าง</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">Hours this period</TableCell><TableCell>ชั่วโมงที่บันทึกในสัปดาห์นี้ / เป้าหมาย</TableCell><TableCell>0 / 40</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Chargeability</TableCell><TableCell>อัตราการ charge งาน</TableCell><TableCell>0%</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Pending approvals</TableCell><TableCell>จำนวนใบที่รอคุณอนุมัติ</TableCell><TableCell>1</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Active charge codes</TableCell><TableCell>จำนวนรหัสงานที่ใช้งานอยู่</TableCell><TableCell>25</TableCell></TableRow>
          </TableBody>
        </Table>

        <h4 className="font-semibold mt-4">3.4 การแจ้งเตือน</h4>
        <Screenshot src="/manual/12-notifications-panel.png" alt="แผงการแจ้งเตือน" />
        <p>กดที่ <strong>ไอคอนกระดิ่ง</strong> มุมขวาบน → แผงแจ้งเตือนจะเลื่อนออกมาจากด้านขวา</p>
      </Section>

      {/* ─── 4. Time Entry ────────────────────────── */}
      <Section id="time-entry" num="4" title="การกรอกเวลา (Time Entry)" icon={Clock}>
        <Screenshot src="/manual/02-time-entry-grid.png" alt="บันทึกเวลาทำงาน — ตารางรายสัปดาห์" />

        <h4 className="font-semibold">4.1 เลือกสัปดาห์</h4>
        <Table>
          <TableHeader><TableRow><TableHead>กดตรงไหน</TableHead><TableHead>ทำอะไร</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell>ปุ่ม &lt; (ลูกศรซ้าย)</TableCell><TableCell>ย้อนไปสัปดาห์ก่อนหน้า</TableCell></TableRow>
            <TableRow><TableCell>ปุ่ม &gt; (ลูกศรขวา)</TableCell><TableCell>ไปสัปดาห์ถัดไป</TableCell></TableRow>
            <TableRow><TableCell>ช่องวันที่ dropdown</TableCell><TableCell>เลือกสัปดาห์ที่ต้องการโดยตรง</TableCell></TableRow>
          </TableBody>
        </Table>

        <h4 className="font-semibold mt-4">4.2 โครงสร้างตาราง</h4>
        <Table>
          <TableHeader><TableRow><TableHead>ส่วน</TableHead><TableHead>รายละเอียด</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">หัวคอลัมน์</TableCell><TableCell>Charge Code, Mon–Sat (พร้อมวันที่)</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">แถวรหัสงาน</TableCell><TableCell>แต่ละแถวคือรหัสงาน 1 ตัว มีช่องกรอกชั่วโมงรายวัน</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Daily Total</TableCell><TableCell>แถวสรุปยอดรวมรายวัน (ตัวหนา)</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Required</TableCell><TableCell>ชั่วโมงที่ต้องทำ (วันทำงาน = 8.00, วันหยุด = –)</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Variance</TableCell><TableCell>ส่วนต่าง — ถ้าติดลบจะแสดงเป็นตัวแดง</TableCell></TableRow>
          </TableBody>
        </Table>

        <h4 className="font-semibold mt-4">4.3 เพิ่มรหัสงาน</h4>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>กดปุ่ม <strong>&quot;+ Add Charge Code&quot;</strong> ด้านล่างซ้ายของตาราง</li>
          <li>เลือกรหัสงานจาก dropdown</li>
          <li>รหัสงานจะปรากฏเป็นแถวใหม่ในตาราง</li>
        </ol>

        <h4 className="font-semibold mt-4">4.4 กรอกชั่วโมง</h4>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>กดที่ช่องว่างในตาราง (จุดตัดระหว่างรหัสงาน กับ วัน)</li>
          <li>พิมพ์จำนวนชั่วโมง (เช่น 8.00, 4.50)</li>
          <li>กด Tab หรือ Enter เพื่อย้ายไปช่องถัดไป</li>
          <li>ระบบจะคำนวณ Daily Total และ Variance ให้อัตโนมัติ</li>
        </ol>
        <Tip>ทุกวันทำงาน (จ.–ศ.) ควรมียอดรวม <strong>8.00 ชั่วโมง</strong> — เมื่อครบ Variance จะเป็น 0.00</Tip>

        <h4 className="font-semibold mt-4">4.5 คัดลอกจากสัปดาห์ก่อน</h4>
        <p>กดปุ่ม <strong>&quot;Copy from Last Period&quot;</strong> เพื่อคัดลอกรหัสงานจากสัปดาห์ก่อนมาใช้ได้เลย</p>

        <h4 className="font-semibold mt-4">4.6 การบันทึก</h4>
        <Table>
          <TableHeader><TableRow><TableHead>วิธี</TableHead><TableHead>รายละเอียด</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">Auto-save</TableCell><TableCell>ระบบบันทึกให้อัตโนมัติทุก 30 วินาที</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Save Draft</TableCell><TableCell>กดปุ่ม &quot;Save Draft&quot; เพื่อบันทึกร่างทันที</TableCell></TableRow>
          </TableBody>
        </Table>

        <h4 className="font-semibold mt-4">4.7 OT และชั่วโมงพิเศษ</h4>
        <p>เมื่อกรอกรวมเกิน 8 ชม. ในวันเดียว ระบบจะแสดง Variance สีแดง แต่ <strong>ไม่บล็อก</strong> — สามารถบันทึกได้ตามปกติ</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>OT วันหยุด: กรอกชั่วโมงในคอลัมน์ <strong>Sat</strong> หรือ <strong>Sun</strong></li>
          <li>ใช้รหัสงานเดียวกับงานปกติ หรือเพิ่มรหัสงาน OT แยกต่างหาก</li>
        </ul>

        <h4 className="font-semibold mt-4">4.8 การส่งอนุมัติ (Submit)</h4>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>ตรวจสอบว่าทุกวัน Daily Total = 8.00 ชม., Variance = 0.00</li>
          <li>กดปุ่ม <strong>&quot;Submit →&quot;</strong> สีเขียว มุมขวาล่าง</li>
          <li>ถ้ายังมีวันที่ไม่ครบ → ระบบจะแสดงหน้าต่างเตือน</li>
          <li>เมื่อส่งสำเร็จ สถานะจะเปลี่ยนเป็น <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Submitted</Badge></li>
        </ol>

        <h4 className="font-semibold mt-4">4.9 สถานะของใบบันทึกเวลา</h4>
        <Table>
          <TableHeader><TableRow><TableHead>สถานะ</TableHead><TableHead>ป้ายสี</TableHead><TableHead>ความหมาย</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">Draft</TableCell><TableCell><Badge variant="secondary">เทา</Badge></TableCell><TableCell>ร่าง — ยังแก้ไขได้</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Submitted</TableCell><TableCell><Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">ฟ้า</Badge></TableCell><TableCell>ส่งแล้ว — รอหัวหน้าตรวจ</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Manager Approved</TableCell><TableCell><Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">Teal</Badge></TableCell><TableCell>รอ CC Owner อนุมัติ</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Approved</TableCell><TableCell><Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">เขียว</Badge></TableCell><TableCell>อนุมัติแล้ว</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Rejected</TableCell><TableCell><Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">แดง</Badge></TableCell><TableCell>ตีกลับ — ต้องแก้ไขแล้วส่งใหม่</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Locked</TableCell><TableCell><Badge variant="secondary">เทาเข้ม</Badge></TableCell><TableCell>ล็อกแล้ว — ไม่สามารถแก้ไขได้</TableCell></TableRow>
          </TableBody>
        </Table>
      </Section>

      {/* ─── 5. AI Features ──────────────────────── */}
      <Section id="ai" num="5" title="ฟีเจอร์ AI (AI-Powered Features)" icon={Bot}>
        <Screenshot src="/manual/ai-01-chat-button.png" alt="ปุ่ม Chat อยู่ที่มุมขวาล่างของทุกหน้า" />

        <h4 className="font-semibold">5.1 บันทึกเวลาด้วย AI</h4>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>วิเคราะห์จากปฏิทิน</strong> — AI แนะนำชั่วโมงจาก event ในปฏิทิน</li>
          <li><strong>เรียนรู้จาก pattern</strong> — จดจำรูปแบบการทำงานของคุณ</li>
          <li><strong>ตรวจจับความผิดปกติ</strong> — แจ้งเตือนวันที่ยังไม่ได้กรอก</li>
        </ul>
        <Tip>AI เป็นผู้ช่วยแนะนำเท่านั้น — คุณยังคงตรวจสอบและยืนยันข้อมูลทุกครั้งก่อนส่ง</Tip>

        <h4 className="font-semibold mt-4">5.2 แนะนำ Charge Code อัตโนมัติ</h4>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>แนะนำจากคำอธิบายงาน</strong> — พิมพ์คำอธิบายสั้น ๆ → AI เสนอ Charge Code ที่ตรง</li>
          <li><strong>แนะนำจากประวัติ</strong> — Charge Code ที่ใช้บ่อยจะถูกเสนอก่อน</li>
          <li><strong>แนะนำจากทีม</strong> — Charge Code ที่เพื่อนร่วมทีมใช้</li>
        </ul>

        <h4 className="font-semibold mt-4">5.3 AI Chatbot</h4>
        <Screenshot src="/manual/ai-02-chat-panel-open.png" alt="เปิด Chat Panel — มี welcome message และปุ่มลัด" />

        <Table>
          <TableHeader><TableRow><TableHead>สิ่งที่ถามได้</TableHead><TableHead>ตัวอย่างคำถาม</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell>ดูสถานะ Timesheet</TableCell><TableCell>&quot;Timesheet สัปดาห์นี้ส่งหรือยัง?&quot;</TableCell></TableRow>
            <TableRow><TableCell>ตรวจสอบ Chargeability</TableCell><TableCell>&quot;อัตรา chargeability ของฉันเท่าไหร่?&quot;</TableCell></TableRow>
            <TableRow><TableCell>ดู Approval ค้าง</TableCell><TableCell>&quot;มีใบรออนุมัติกี่ใบ?&quot;</TableCell></TableRow>
            <TableRow><TableCell>สอบถามงบประมาณ</TableCell><TableCell>&quot;โปรเจกต์ PRJ-001 งบเหลือเท่าไหร่?&quot;</TableCell></TableRow>
            <TableRow><TableCell>ขอสรุป</TableCell><TableCell>&quot;สรุปชั่วโมงทำงานเดือนนี้ให้หน่อย&quot;</TableCell></TableRow>
          </TableBody>
        </Table>

        <Screenshot src="/manual/ai-03-chatbot-response.png" alt="Chatbot ตอบรายการ Charge Code พร้อม Suggested Actions" />
        <Tip>Chatbot แสดงข้อมูลเฉพาะที่คุณมีสิทธิ์เข้าถึงเท่านั้น</Tip>
      </Section>

      {/* ─── 6. Approval ─────────────────────────── */}
      <Section id="approval" num="6" title="การอนุมัติ (Approval Workflow)" icon={CheckCircle}>
        <p className="text-[var(--text-muted)]">สำหรับ <strong>หัวหน้างาน</strong> (Charge Manager) และ <strong>ผู้ดูแลระบบ</strong> (Admin)</p>
        <Screenshot src="/manual/05-approvals.png" alt="หน้าอนุมัติ" />

        <h4 className="font-semibold">6.1 แท็บต่าง ๆ</h4>
        <Table>
          <TableHeader><TableRow><TableHead>แท็บ</TableHead><TableHead>คำอธิบาย</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">Team Status</TableCell><TableCell>ดูว่าลูกทีมแต่ละคนบันทึกเวลาครบหรือไม่</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Pending Approvals</TableCell><TableCell>ใบบันทึกเวลาที่รอคุณอนุมัติ</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Vacations</TableCell><TableCell>คำขอลาที่รอคุณอนุมัติ</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">History</TableCell><TableCell>ประวัติที่คุณเคยอนุมัติ/ตีกลับ</TableCell></TableRow>
          </TableBody>
        </Table>

        <h4 className="font-semibold mt-4">6.2 อนุมัติทีละใบ</h4>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>กดแท็บ <strong>&quot;Pending Approvals&quot;</strong></li>
          <li>กดไอคอนตาด้านขวาของแต่ละแถว เพื่อดูรายละเอียด</li>
          <li>กดปุ่ม <strong>✓ (อนุมัติ)</strong> หรือ <strong>✗ (ตีกลับ)</strong></li>
        </ol>

        <h4 className="font-semibold mt-4">6.3 ลำดับขั้นตอนการอนุมัติ</h4>
        <div className="bg-stone-50 dark:bg-stone-900/50 rounded-lg p-4 font-mono text-xs space-y-1">
          <p>พนักงานกรอกเวลา → กด Submit</p>
          <p className="ml-8">↓</p>
          <p>หัวหน้า (Charge Manager) ตรวจสอบ</p>
          <p className="ml-8">↓ Approve → สถานะ = Manager Approved → ส่งต่อ CC Owner</p>
          <p className="ml-8">↓ Reject → สถานะ = Rejected → พนักงานแก้ไขแล้วส่งใหม่</p>
          <p className="ml-8">↓</p>
          <p>CC Owner ตรวจสอบ</p>
          <p className="ml-8">↓ Approve → สถานะ = CC Approved → ล็อกใบ</p>
          <p className="ml-8">↓ Reject → สถานะ = Rejected → พนักงานแก้ไขแล้วส่งใหม่</p>
        </div>
      </Section>

      {/* ─── 7. Charge Codes ─────────────────────── */}
      <Section id="charge-codes" num="7" title="รหัสงาน (Charge Codes)" icon={Tag}>
        <p className="text-[var(--text-muted)]">สำหรับ หัวหน้างาน, ผู้ดูแล, PMO, Finance</p>
        <Screenshot src="/manual/04-charge-codes.png" alt="รหัสงาน" />

        <h4 className="font-semibold">7.1 โครงสร้างรหัสงาน</h4>
        <Table>
          <TableHeader><TableRow><TableHead>ระดับ</TableHead><TableHead>ป้าย</TableHead><TableHead>ตัวอย่าง</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">โปรแกรม (Program)</TableCell><TableCell><Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">PRG</Badge></TableCell><TableCell>งานใหญ่สุด</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">แผนก (Department)</TableCell><TableCell><Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">DEPT</Badge></TableCell><TableCell>Product Management</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">โปรเจกต์ (Project)</TableCell><TableCell><Badge variant="secondary">PRJ</Badge></TableCell><TableCell>โปรเจกต์ย่อย</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">กิจกรรม (Activity)</TableCell><TableCell><Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">ACT</Badge></TableCell><TableCell>Development, Testing</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">งานย่อย (Task)</TableCell><TableCell><Badge variant="secondary">TSK</Badge></TableCell><TableCell>รายการงานเฉพาะ</TableCell></TableRow>
          </TableBody>
        </Table>

        <h4 className="font-semibold mt-4">7.2 ค้นหาและกรอง</h4>
        <Table>
          <TableHeader><TableRow><TableHead>กดตรงไหน</TableHead><TableHead>ทำอะไร</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell>ช่อง &quot;Search codes...&quot;</TableCell><TableCell>พิมพ์ชื่อหรือรหัสเพื่อค้นหา</TableCell></TableRow>
            <TableRow><TableCell>dropdown 3 ช่อง</TableCell><TableCell>กรองตามระดับ, สถานะ, ประเภท</TableCell></TableRow>
            <TableRow><TableCell>ช่องติ๊ก &quot;My Codes&quot;</TableCell><TableCell>แสดงเฉพาะรหัสงานที่มอบหมายให้คุณ</TableCell></TableRow>
            <TableRow><TableCell>ปุ่ม &quot;+ Create New&quot;</TableCell><TableCell>สร้างรหัสงานใหม่ (เฉพาะผู้ดูแล)</TableCell></TableRow>
          </TableBody>
        </Table>
      </Section>

      {/* ─── 8. Calendar ─────────────────────────── */}
      <Section id="calendar" num="8" title="ปฏิทินและวันลา" icon={CalendarDays}>
        <Screenshot src="/manual/03-calendar.png" alt="ปฏิทิน" />

        <h4 className="font-semibold">8.1 สัญลักษณ์สี</h4>
        <Table>
          <TableHeader><TableRow><TableHead>สี/เครื่องหมาย</TableHead><TableHead>ความหมาย</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell>วงกลมสีชมพู/แดง</TableCell><TableCell>วันหยุดราชการ</TableCell></TableRow>
            <TableRow><TableCell>พื้นหลังสีเทา</TableCell><TableCell>วันเสาร์-อาทิตย์</TableCell></TableRow>
            <TableRow><TableCell>วงกลมสีฟ้าอ่อน</TableCell><TableCell>วันลาของคุณ</TableCell></TableRow>
            <TableRow><TableCell>วงกลมสีเขียว</TableCell><TableCell>วันนี้</TableCell></TableRow>
          </TableBody>
        </Table>

        <h4 className="font-semibold mt-4">8.2 ขอลาพักร้อน</h4>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>กดปุ่ม <strong>&quot;+ Request Vacation&quot;</strong></li>
          <li>เลือกวันเริ่มและวันสิ้นสุด</li>
          <li>เลือกประเภท: ลาเต็มวัน / ลาครึ่งวันเช้า / ลาครึ่งวันบ่าย</li>
          <li>กดส่ง → คำขอจะถูกส่งไปให้หัวหน้าอนุมัติ</li>
        </ol>
      </Section>

      {/* ─── 9. Reports ──────────────────────────── */}
      <Section id="reports" num="9" title="รายงาน (Reports & Analytics)" icon={BarChart3}>
        <p className="text-[var(--text-muted)]">สำหรับ ผู้บริหาร, PMO, Finance</p>
        <Screenshot src="/manual/06-reports.png" alt="รายงาน" />

        <h4 className="font-semibold">9.1 กล่องสรุป KPI</h4>
        <Table>
          <TableHeader><TableRow><TableHead>กล่อง</TableHead><TableHead>ตัวอย่าง</TableHead><TableHead>ความหมาย</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">Total budget</TableCell><TableCell>฿21.9M</TableCell><TableCell>งบประมาณรวมทุกโปรแกรม</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Actual spent</TableCell><TableCell>฿7.2M (32.81%)</TableCell><TableCell>ค่าใช้จ่ายจริง</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Utilization</TableCell><TableCell>48.86%</TableCell><TableCell>อัตราใช้กำลังคน</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Over budget</TableCell><TableCell>3 (10 at risk)</TableCell><TableCell>จำนวนรหัสงานที่เกินงบ</TableCell></TableRow>
          </TableBody>
        </Table>

        <h4 className="font-semibold mt-4">9.2 แท็บต่าง ๆ</h4>
        <Table>
          <TableHeader><TableRow><TableHead>แท็บ</TableHead><TableHead>ทำอะไร</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">Overview</TableCell><TableCell>ภาพรวม — กราฟ Budget vs Actual, Chargeability, Activity Distribution</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">By Program</TableCell><TableCell>รายละเอียดแยกตามโปรแกรม</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">By Cost Center</TableCell><TableCell>แยกตามหน่วยงาน (สำหรับฝ่ายการเงิน)</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">By Person</TableCell><TableCell>ค้นหาชื่อ → ดูชั่วโมง อัตรา charge งาน</TableCell></TableRow>
          </TableBody>
        </Table>

        <p className="mt-3">กดปุ่ม <strong>&quot;Export...&quot;</strong> มุมขวาบน → เลือก Export CSV หรือ Export PDF</p>
      </Section>

      {/* ─── 10. Budget ──────────────────────────── */}
      <Section id="budget" num="10" title="งบประมาณ (Budget)" icon={DollarSign}>
        <p className="text-[var(--text-muted)]">สำหรับ ผู้บริหาร, PMO, Finance</p>
        <Screenshot src="/manual/07-budget.png" alt="งบประมาณ" />

        <h4 className="font-semibold">10.1 กล่องสรุป KPI</h4>
        <Table>
          <TableHeader><TableRow><TableHead>กล่อง</TableHead><TableHead>ตัวอย่าง</TableHead><TableHead>ความหมาย</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">Total budget</TableCell><TableCell>฿8.2M</TableCell><TableCell>งบรวม</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Actual spent</TableCell><TableCell>฿3.1M (37%)</TableCell><TableCell>ค่าใช้จ่ายจริง</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Forecast</TableCell><TableCell>฿11.1M</TableCell><TableCell>คาดการณ์ค่าใช้จ่าย</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Status</TableCell><TableCell>3 over</TableCell><TableCell>สถานะงบแยกตามสี</TableCell></TableRow>
          </TableBody>
        </Table>

        <h4 className="font-semibold mt-4">10.2 ความหมายสี Status</h4>
        <Table>
          <TableHeader><TableRow><TableHead>สี</TableHead><TableHead>ป้าย</TableHead><TableHead>ความหมาย</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2" />เขียว</TableCell><TableCell>On Track</TableCell><TableCell>ปกติ ยังอยู่ในงบ</TableCell></TableRow>
            <TableRow><TableCell><span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2" />เหลือง</TableCell><TableCell>Warning</TableCell><TableCell>ใช้เกิน 80% — ควรระวัง</TableCell></TableRow>
            <TableRow><TableCell><span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-2" />ส้ม</TableCell><TableCell>Forecast Over</TableCell><TableCell>คาดว่าจะเกินงบ</TableCell></TableRow>
            <TableRow><TableCell><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2" />แดง</TableCell><TableCell>Over Budget</TableCell><TableCell>เกินงบแล้ว</TableCell></TableRow>
          </TableBody>
        </Table>
      </Section>

      {/* ─── 11. Settings ────────────────────────── */}
      <Section id="settings" num="11" title="การตั้งค่า (Settings)" icon={Settings}>
        <Screenshot src="/manual/11-settings.png" alt="การตั้งค่า" />

        <h4 className="font-semibold">11.1 Appearance</h4>
        <Table>
          <TableHeader><TableRow><TableHead>การตั้งค่า</TableHead><TableHead>วิธีเปลี่ยน</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">Theme</TableCell><TableCell>กดปุ่มสลับ (toggle) เพื่อเปลี่ยนระหว่าง Light และ Dark</TableCell></TableRow>
          </TableBody>
        </Table>

        <h4 className="font-semibold mt-4">11.2 Currency</h4>
        <p>เลือกสกุลเงินเริ่มต้น เช่น <strong>THB</strong> — Preview: ฿1,234,567.00</p>
        <Tip>การเปลี่ยนสกุลเงินเป็นสิทธิ์ของ Admin เท่านั้น</Tip>
      </Section>

      {/* ─── 12. Admin ───────────────────────────── */}
      <Section id="admin" num="12" title="จัดการระบบ (Admin)" icon={Settings}>
        <p className="text-[var(--text-muted)]">สำหรับ ผู้ดูแลระบบ (Admin) เท่านั้น</p>

        <h4 className="font-semibold">12.1 จัดการผู้ใช้</h4>
        <Screenshot src="/manual/08-admin-users.png" alt="จัดการผู้ใช้" />
        <Table>
          <TableHeader><TableRow><TableHead>คอลัมน์</TableHead><TableHead>ความหมาย</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">Name</TableCell><TableCell>ชื่อ-นามสกุล</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Email</TableCell><TableCell>อีเมลองค์กร</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Role</TableCell><TableCell>บทบาทในระบบ เช่น Charge Manager, Employee</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Job Grade</TableCell><TableCell>ระดับงาน เช่น L2, L3</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Department</TableCell><TableCell>แผนก</TableCell></TableRow>
          </TableBody>
        </Table>

        <h4 className="font-semibold mt-4">12.2 จัดการปฏิทิน</h4>
        <Screenshot src="/manual/09-admin-calendar.png" alt="จัดการปฏิทิน" />
        <p>ผู้ดูแลสามารถเพิ่ม/ลบวันหยุดได้จากหน้านี้</p>

        <h4 className="font-semibold mt-4">12.3 จัดการอัตราค่าใช้จ่าย</h4>
        <Screenshot src="/manual/10-admin-rates.png" alt="จัดการอัตรา" />
        <Table>
          <TableHeader><TableRow><TableHead>คอลัมน์</TableHead><TableHead>ความหมาย</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">Job Grade</TableCell><TableCell>ระดับงาน</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Hourly Rate</TableCell><TableCell>อัตราต่อชั่วโมง เช่น ฿125.50</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Effective From/To</TableCell><TableCell>วันที่เริ่ม-สิ้นสุดใช้อัตรานี้</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">Status</TableCell><TableCell><Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge></TableCell></TableRow>
          </TableBody>
        </Table>
      </Section>

      {/* ─── 13. Permissions ─────────────────────── */}
      <Section id="permissions" num="13" title="สิทธิ์การใช้งานตามบทบาท" icon={Users}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>บทบาท</TableHead>
              <TableHead className="text-center">Dashboard</TableHead>
              <TableHead className="text-center">Time Entry</TableHead>
              <TableHead className="text-center">Calendar</TableHead>
              <TableHead className="text-center">Charge Codes</TableHead>
              <TableHead className="text-center">Approvals</TableHead>
              <TableHead className="text-center">Reports</TableHead>
              <TableHead className="text-center">Budget</TableHead>
              <TableHead className="text-center">Admin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">พนักงาน</TableCell>
              <TableCell className="text-center">✅</TableCell><TableCell className="text-center">✅</TableCell><TableCell className="text-center">✅</TableCell>
              <TableCell className="text-center">—</TableCell><TableCell className="text-center">—</TableCell><TableCell className="text-center">—</TableCell><TableCell className="text-center">—</TableCell><TableCell className="text-center">—</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">หัวหน้างาน</TableCell>
              <TableCell className="text-center">✅</TableCell><TableCell className="text-center">✅</TableCell><TableCell className="text-center">✅</TableCell>
              <TableCell className="text-center">✅</TableCell><TableCell className="text-center">✅</TableCell><TableCell className="text-center">—</TableCell><TableCell className="text-center">—</TableCell><TableCell className="text-center">—</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">PMO / Finance</TableCell>
              <TableCell className="text-center">✅</TableCell><TableCell className="text-center">✅</TableCell><TableCell className="text-center">✅</TableCell>
              <TableCell className="text-center">✅</TableCell><TableCell className="text-center">—</TableCell><TableCell className="text-center">✅</TableCell><TableCell className="text-center">✅</TableCell><TableCell className="text-center">—</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">ผู้ดูแลระบบ</TableCell>
              <TableCell className="text-center">✅</TableCell><TableCell className="text-center">✅</TableCell><TableCell className="text-center">✅</TableCell>
              <TableCell className="text-center">✅</TableCell><TableCell className="text-center">✅</TableCell><TableCell className="text-center">✅</TableCell><TableCell className="text-center">✅</TableCell><TableCell className="text-center">✅</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      {/* ─── 14. Weekly Summary ──────────────────── */}
      <Section id="weekly" num="14" title="สรุปขั้นตอนประจำสัปดาห์" icon={CalendarDays}>
        <h4 className="font-semibold">พนักงาน — ทำทุกสัปดาห์</h4>
        <Table>
          <TableHeader><TableRow><TableHead>วัน</TableHead><TableHead>ทำอะไร</TableHead><TableHead>กดตรงไหน</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">จ.</TableCell><TableCell>เพิ่มรหัสงาน</TableCell><TableCell>&quot;+ Add Charge Code&quot; หรือ &quot;Copy from Last Period&quot;</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">จ.–ศ.</TableCell><TableCell>กรอกชั่วโมงทุกวัน</TableCell><TableCell>กดช่องในตาราง → พิมพ์ชั่วโมง</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">ศ.</TableCell><TableCell>ตรวจยอดรวม</TableCell><TableCell>ดูแถว Daily Total — ทุกวันต้อง 8.00</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">ศ.</TableCell><TableCell>ส่งใบ</TableCell><TableCell>กดปุ่ม &quot;Submit →&quot; สีเขียว</TableCell></TableRow>
          </TableBody>
        </Table>

        <h4 className="font-semibold mt-4">หัวหน้างาน — ทำทุกสัปดาห์</h4>
        <Table>
          <TableHeader><TableRow><TableHead>ขั้นตอน</TableHead><TableHead>ทำอะไร</TableHead><TableHead>กดตรงไหน</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">1</TableCell><TableCell>ดูสถานะทีม</TableCell><TableCell>Approvals → &quot;Team Status&quot;</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">2</TableCell><TableCell>ตรวจใบที่ส่งมา</TableCell><TableCell>&quot;Pending Approvals&quot;</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">3</TableCell><TableCell>อนุมัติ/ตีกลับ</TableCell><TableCell>กดปุ่ม ✓ หรือ ✗</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">4</TableCell><TableCell>ตรวจวันลา</TableCell><TableCell>&quot;Vacations&quot; → Approve/Reject</TableCell></TableRow>
          </TableBody>
        </Table>

        <h4 className="font-semibold mt-4">ผู้บริหาร / การเงิน — ทำทุกเดือน</h4>
        <Table>
          <TableHeader><TableRow><TableHead>ขั้นตอน</TableHead><TableHead>ทำอะไร</TableHead><TableHead>กดตรงไหน</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-medium">1</TableCell><TableCell>ดูภาพรวมตัวเลข</TableCell><TableCell>Reports → &quot;Overview&quot;</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">2</TableCell><TableCell>ดูแยกตามโปรแกรม</TableCell><TableCell>&quot;By Program&quot;</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">3</TableCell><TableCell>ดูงบประมาณ</TableCell><TableCell>Budget → ดูตาราง + สถานะสี</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">4</TableCell><TableCell>ส่งออกข้อมูล</TableCell><TableCell>&quot;Export...&quot; มุมขวาบน</TableCell></TableRow>
          </TableBody>
        </Table>
      </Section>

      {/* Footer */}
      <div className="text-center text-sm text-[var(--text-muted)] py-8">
        <p>ต้องการความช่วยเหลือเพิ่มเติม? ติดต่อฝ่าย IT หรือใช้ <MessageSquare className="w-4 h-4 inline" /> AI Chatbot ในระบบ</p>
      </div>
    </div>
  );
}
