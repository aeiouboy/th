import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and, gte, lte, sum } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import {
  timesheets,
  timesheetEntries,
  chargeCodes,
  chargeCodeUsers,
  profiles,
  budgets,
  vacationRequests,
  calendar,
} from '../database/schema';
import { TimesheetsService } from '../timesheets/timesheets.service';
import { BudgetsService } from '../budgets/budgets.service';

export interface ParsedTimeEntry {
  hours: number;
  chargeCodeId: string;
  date: string;
  description?: string;
}

export interface BotResponse {
  type: 'message' | 'card';
  text: string;
  data?: Record<string, unknown>;
  suggestedActions?: string[];
}

@Injectable()
export class TeamsBotService {
  private readonly logger = new Logger(TeamsBotService.name);
  private readonly openRouterApiKey: string;
  private readonly aiEnabled: boolean;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly timesheetsService: TimesheetsService,
    private readonly budgetsService: BudgetsService,
    private readonly configService: ConfigService,
  ) {
    this.openRouterApiKey = this.configService.get<string>('OPENROUTER_API_KEY', '');
    this.aiEnabled = !!this.openRouterApiKey;
    if (this.aiEnabled) {
      this.logger.log('OpenRouter AI enabled for chat assistant');
    } else {
      this.logger.log('OpenRouter AI not configured — using rule-based fallback');
    }
  }

  async handleIncomingMessage(
    userId: string,
    text: string,
  ): Promise<BotResponse> {
    let firstCC: string | undefined;
    try {
      // Get user's first charge code for dynamic suggested prompts
      const userCodes = await this.timesheetsService.getUserChargeCodes(userId);
      firstCC = userCodes.length > 0 ? userCodes[0].chargeCodeId : undefined;

      // If OpenRouter is configured, use AI
      if (this.aiEnabled) {
        return this.handleWithAI(userId, text, firstCC);
      }
      // Fallback to rule-based parsing
      return this.handleWithRules(userId, text, firstCC);
    } catch (error: any) {
      this.logger.error(`Error handling message: ${error.message}`, error.stack);
      return {
        type: 'message',
        text: `ขออภัยค่ะ เกิดข้อผิดพลาด: ${error.message}`,
        suggestedActions: this.getSuggestedPrompts(firstCC),
      };
    }
  }

  /**
   * AI-powered message handler using OpenRouter.
   * System prompt restricts AI to timesheet-related questions only.
   */
  private async handleWithAI(userId: string, text: string, firstCC?: string): Promise<BotResponse> {
    // Gather user context
    const [userProfile] = await this.db
      .select({ fullName: profiles.fullName, department: profiles.department })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    const userCodes = await this.timesheetsService.getUserChargeCodes(userId);
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = await this.getHoursTodayData(userId);

    const chargeCodeList = userCodes.map(c => `${c.chargeCodeId}: ${c.name} (${c.isBillable ? 'billable' : 'non-billable'})`).join('\n');

    const systemPrompt = `You are a Timesheet Assistant for ${userProfile?.fullName || 'the user'} (department: ${userProfile?.department || 'N/A'}).
Today's date: ${today}

## STRICT RULES
1. You ONLY answer questions about: timesheet, time entry, charge codes, budget, leave/vacation, work hours
2. If the user asks about ANYTHING else (weather, jokes, coding, general knowledge, personal advice, etc.), respond ONLY with: "ฉันเป็น Timesheet Assistant ช่วยได้เฉพาะเรื่องการกรอกเวลา, charge codes, งบประมาณ, และการลา เท่านั้นค่ะ"
3. ALWAYS respond in Thai by default. Only switch to English if the user writes in English.
4. Keep responses concise (under 200 words)
5. NEVER make up data — only use the context provided below
6. Use polite Thai particles (ค่ะ/ครับ) consistently

## USER'S ASSIGNED CHARGE CODES
${chargeCodeList || 'No charge codes assigned'}

## TODAY'S LOGGED HOURS
${todayEntries.length > 0 ? todayEntries.map(e => `- ${e.chargeCodeName}: ${e.hours}h`).join('\n') : 'No hours logged today'}

## THAI COMMAND RECOGNITION (CRITICAL)
The following Thai phrases are ALL timesheet-related commands. NEVER reject them:
- "กรอก", "ลง", "บันทึก", "กรอกเวลา", "ลงเวลา" = log time
- "แสดง", "ดู", "เปิด" + "timesheet/ไทม์ชีท" = show timesheet
- "ชั่วโมง", "ชม.", "กี่ชั่วโมง" = hours inquiry
- "charge code", "ชาร์จโค้ด" = charge code inquiry
- "งบ", "งบประมาณ", "budget", "สถานะงบ" = budget inquiry

## AVAILABLE ACTIONS
When the user wants to log time (Thai: "กรอก 4 ชม. PRJ-042 วันนี้", "ลง 2 ชม. ACT-010 เมื่อวาน", English: "Log 4h on PRJ-042 today"), extract: hours, charge_code_id, date, description
Respond with a JSON action block like this:
\`\`\`action
{"action":"log_time","hours":4,"chargeCodeId":"DEPT-SCM","date":"${today}","description":"optional note"}
\`\`\`

When the user wants to see their timesheet (Thai: "แสดง Timesheet สัปดาห์นี้", "ดู timesheet"), respond with:
\`\`\`action
{"action":"show_timesheet"}
\`\`\`

When the user wants to see their charge codes (Thai: "ฉันมี Charge Code อะไรบ้าง?"), respond with:
\`\`\`action
{"action":"show_charge_codes"}
\`\`\`

When the user asks about budget (Thai: "สถานะงบประมาณ PRJ-042"), respond with:
\`\`\`action
{"action":"check_budget","chargeCodeId":"PRJ-042"}
\`\`\`

For informational questions (Thai: "วันนี้กรอกไปกี่ชั่วโมงแล้ว?"), answer directly using the context above.
For actions, include the action block AND a friendly Thai confirmation message.`;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.configService.get('FRONTEND_URL', 'http://localhost:3000'),
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`OpenRouter API error: ${response.status}`);
        return this.handleWithRules(userId, text);
      }

      const data = await response.json() as any;
      const aiText = data.choices?.[0]?.message?.content || '';

      // Check for action blocks in AI response
      const actionMatch = aiText.match(/```action\s*\n?([\s\S]*?)\n?```/);
      if (actionMatch) {
        try {
          const action = JSON.parse(actionMatch[1]);
          const cleanText = aiText.replace(/```action[\s\S]*?```/, '').trim();

          if (action.action === 'log_time') {
            // Check if target date is a weekend
            const targetDate = new Date(action.date || today);
            const dayOfWeek = targetDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
              return {
                type: 'message',
                text: `ไม่สามารถกรอกเวลาวัน${dayOfWeek === 0 ? 'อาทิตย์' : 'เสาร์'}ได้ค่ะ กรุณาเลือกวันจันทร์-ศุกร์`,
                suggestedActions: this.getSuggestedPrompts(firstCC),
              };
            }
            const logResult = await this.handleTimeLog(userId, `Log ${action.hours}h on ${action.chargeCodeId} ${action.date || today}${action.description ? ' ' + action.description : ''}`, firstCC);
            return {
              ...logResult,
              text: cleanText ? `${cleanText}\n\n${logResult.text}` : logResult.text,
            };
          }
          if (action.action === 'show_timesheet') {
            const result = await this.handleTimesheetInquiry(userId, firstCC);
            return { ...result, text: cleanText ? `${cleanText}\n\n${result.text}` : result.text };
          }
          if (action.action === 'show_charge_codes') {
            const result = await this.handleChargeCodesInquiry(userId, firstCC);
            return { ...result, text: cleanText ? `${cleanText}\n\n${result.text}` : result.text };
          }
          if (action.action === 'check_budget' && action.chargeCodeId) {
            const result = await this.handleBudgetInquiry(userId, `budget status ${action.chargeCodeId}`);
            return { ...result, text: cleanText ? `${cleanText}\n\n${result.text}` : result.text };
          }
        } catch (actionError: any) {
          // Action parse/execution failed — return clean text without action block
          this.logger.warn(`Action execution failed: ${actionError.message}`);
          const cleanText = aiText.replace(/```action[\s\S]*?```/g, '').trim();
          return {
            type: 'message',
            text: cleanText || 'ขออภัยค่ะ ไม่สามารถดำเนินการได้ กรุณาลองใหม่อีกครั้ง',
            suggestedActions: this.getSuggestedPrompts(firstCC),
          };
        }
      }

      // No action block or action failed — strip any leftover action blocks from response
      const cleanedText = aiText.replace(/```action[\s\S]*?```/g, '').trim();
      return {
        type: 'message',
        text: cleanedText || aiText,
        suggestedActions: this.getSuggestedPrompts(firstCC),
      };
    } catch (error: any) {
      this.logger.warn(`OpenRouter call failed, falling back to rules: ${error.message}`);
      return this.handleWithRules(userId, text, firstCC);
    }
  }

  private async getHoursTodayData(userId: string): Promise<{ chargeCodeName: string; hours: number }[]> {
    const today = new Date().toISOString().split('T')[0];
    const sheet = await this.timesheetsService.findByPeriod(userId, today);
    if (!sheet) return [];

    const entries = await this.db
      .select({
        hours: timesheetEntries.hours,
        chargeCodeName: chargeCodes.name,
      })
      .from(timesheetEntries)
      .leftJoin(chargeCodes, eq(timesheetEntries.chargeCodeId, chargeCodes.id))
      .where(
        and(
          eq(timesheetEntries.timesheetId, sheet.id),
          eq(timesheetEntries.date, today),
        ),
      );

    return entries.map(e => ({
      chargeCodeName: e.chargeCodeName || 'Unknown',
      hours: Number(e.hours),
    }));
  }

  /**
   * Rule-based fallback (original logic — used when OpenRouter is not configured)
   */
  private async handleWithRules(userId: string, text: string, firstCC?: string): Promise<BotResponse> {
    const trimmed = text.trim().toLowerCase();

    // Time logging commands (English + Thai)
    if (
      trimmed.startsWith('log ') ||
      trimmed.startsWith('logged ') ||
      trimmed.startsWith('add ') ||
      trimmed.startsWith('ลง ') ||
      trimmed.startsWith('กรอก') ||
      trimmed.startsWith('บันทึก')
    ) {
      return this.handleTimeLog(userId, text, firstCC);
    }

    // Budget inquiry
    if (
      trimmed.includes('budget') &&
      (trimmed.includes('status') || trimmed.includes('how'))
    ) {
      return this.handleBudgetInquiry(userId, text);
    }

    // Timesheet inquiry (English + Thai)
    if (
      (trimmed.includes('timesheet') &&
        (trimmed.includes('show') ||
          trimmed.includes('my') ||
          trimmed.includes('this week'))) ||
      trimmed.includes('ไทม์ชีท') ||
      trimmed.includes('ตารางเวลา')
    ) {
      return this.handleTimesheetInquiry(userId, firstCC);
    }

    // Hours today (English + Thai)
    if (
      (trimmed.includes('hours') &&
        (trimmed.includes('today') || trimmed.includes('did i'))) ||
      (trimmed.includes('เวลา') && trimmed.includes('วันนี้')) ||
      (trimmed.includes('ชั่วโมง') && trimmed.includes('วันนี้'))
    ) {
      return this.handleHoursToday(userId, firstCC);
    }

    // Charge codes inquiry
    if (
      trimmed.includes('charge code') &&
      (trimmed.includes('assigned') ||
        trimmed.includes('my') ||
        trimmed.includes('what'))
    ) {
      return this.handleChargeCodesInquiry(userId, firstCC);
    }

    // Help / suggested prompts
    return this.getHelp(firstCC);
  }

  private async handleTimeLog(
    userId: string,
    text: string,
    firstCC?: string,
  ): Promise<BotResponse> {
    const parsed = this.parseTimeEntry(text);
    if (!parsed) {
      return {
        type: 'message',
        text: 'ไม่สามารถแปลงข้อมูลการกรอกเวลาได้ค่ะ ลองพิมพ์: "กรอก 4 ชม. PRJ-042 วันนี้" หรือ "ลง 2 ชม. code review ACT-010 เมื่อวาน"',
        suggestedActions: this.getSuggestedPrompts(firstCC),
      };
    }

    // Verify charge code exists
    const [cc] = await this.db
      .select({ id: chargeCodes.id, name: chargeCodes.name })
      .from(chargeCodes)
      .where(eq(chargeCodes.id, parsed.chargeCodeId))
      .limit(1);

    if (!cc) {
      return {
        type: 'message',
        text: `ไม่พบ Charge Code "${parsed.chargeCodeId}" ค่ะ ลองพิมพ์ "ฉันมี Charge Code อะไรบ้าง?" เพื่อดูรายการของคุณ`,
      };
    }

    // Check user has access to charge code (assigned OR already in timesheet)
    const userCodes = await this.timesheetsService.getUserChargeCodes(userId);
    const hasAccess = userCodes.some((c) => c.chargeCodeId === parsed.chargeCodeId);

    if (!hasAccess) {
      return {
        type: 'message',
        text: `คุณไม่มีสิทธิ์เข้าถึง Charge Code "${parsed.chargeCodeId}" ค่ะ กรุณาติดต่อหัวหน้าเพื่อขอสิทธิ์`,
        suggestedActions: ['ฉันมี Charge Code อะไรบ้าง?'],
      };
    }

    // Check vacation days — don't allow logging on approved vacation day
    const [vacation] = await this.db
      .select({ id: vacationRequests.id })
      .from(vacationRequests)
      .where(
        and(
          eq(vacationRequests.userId, userId),
          eq(vacationRequests.status, 'approved'),
          lte(vacationRequests.startDate, parsed.date),
          gte(vacationRequests.endDate, parsed.date),
        ),
      )
      .limit(1);

    if (vacation) {
      return {
        type: 'message',
        text: `ไม่สามารถกรอกเวลาวันที่ ${parsed.date} ได้ค่ะ — คุณมีวันลาที่อนุมัติแล้ว`,
      };
    }

    // Check if date is a holiday
    const [holiday] = await this.db
      .select({ holidayName: calendar.holidayName })
      .from(calendar)
      .where(
        and(
          eq(calendar.date, parsed.date),
          eq(calendar.isHoliday, true),
        ),
      )
      .limit(1);

    if (holiday) {
      return {
        type: 'message',
        text: `ไม่สามารถกรอกเวลาวันที่ ${parsed.date} ได้ค่ะ — เป็นวันหยุด (${holiday.holidayName || 'วันหยุดราชการ'})`,
      };
    }

    // Check timesheet status — don't log if submitted/locked
    const existingSheet = await this.timesheetsService.findByPeriod(userId, parsed.date);
    if (existingSheet && !['draft', 'rejected'].includes(existingSheet.status)) {
      return {
        type: 'message',
        text: `ไม่สามารถกรอกเวลาได้ค่ะ — Timesheet ช่วงนี้มีสถานะ "${existingSheet.status}" แก้ไขได้เฉพาะสถานะ Draft หรือ Rejected เท่านั้น`,
      };
    }

    // Create or get timesheet for the week
    const timesheet = await this.timesheetsService.create(userId, {
      period_start: parsed.date,
      period_end: parsed.date,
    });

    // Get existing entries
    const existingEntries = await this.db
      .select()
      .from(timesheetEntries)
      .where(eq(timesheetEntries.timesheetId, timesheet.id));

    // Build new entries list: keep existing + add new
    const entries = existingEntries.map((e) => ({
      charge_code_id: e.chargeCodeId,
      date: e.date,
      hours: Number(e.hours),
      description: e.description || undefined,
    }));

    entries.push({
      charge_code_id: parsed.chargeCodeId,
      date: parsed.date,
      hours: parsed.hours,
      description: parsed.description,
    });

    await this.timesheetsService.upsertEntries(userId, timesheet.id, entries);

    return {
      type: 'message',
      text: `กรอกเวลา ${parsed.hours} ชม. ใน ${cc.name} (${cc.id}) วันที่ ${parsed.date}${parsed.description ? ` — "${parsed.description}"` : ''} เรียบร้อยค่ะ`,
      suggestedActions: [
        'แสดง Timesheet สัปดาห์นี้',
        'วันนี้กรอกไปกี่ชั่วโมงแล้ว?',
      ],
    };
  }

  private async handleBudgetInquiry(
    userId: string,
    text: string,
  ): Promise<BotResponse> {
    // Extract charge code from text
    const ccId = this.extractChargeCodeId(text);
    if (!ccId) {
      return {
        type: 'message',
        text: 'กรุณาระบุ Charge Code ค่ะ เช่น "สถานะงบประมาณ PRJ-042"',
      };
    }

    try {
      const budget = await this.budgetsService.getBudgetForChargeCode(ccId);
      return {
        type: 'card',
        text:
          `Budget Status for ${budget.chargeCodeName} (${ccId}):\n` +
          `- Budget: ฿${budget.budgetAmount.toLocaleString()}\n` +
          `- Spent: ฿${budget.actualSpent.toLocaleString()} (${budget.percentage}%)\n` +
          `- Status: ${budget.status.replace('_', ' ')}` +
          (budget.forecastAtCompletion
            ? `\n- Forecast: ฿${budget.forecastAtCompletion.toLocaleString()}`
            : ''),
        data: budget as unknown as Record<string, unknown>,
      };
    } catch {
      return {
        type: 'message',
        text: `Could not find budget information for charge code "${ccId}".`,
      };
    }
  }

  private async handleTimesheetInquiry(userId: string, firstCC?: string): Promise<BotResponse> {
    const now = new Date();
    const period = now.toISOString().split('T')[0];
    const sheet = await this.timesheetsService.findByPeriod(userId, period);

    if (!sheet) {
      return {
        type: 'message',
        text: 'ไม่พบ Timesheet สำหรับสัปดาห์นี้ค่ะ ลองพิมพ์ "กรอก 4 ชม. PRJ-042 วันนี้" เพื่อเริ่มต้น',
        suggestedActions: this.getSuggestedPrompts(firstCC),
      };
    }

    const detail = await this.timesheetsService.findById(userId, sheet.id);
    const entries = detail.entries || [];
    const totalHours = entries.reduce(
      (s: number, e: any) => s + Number(e.hours),
      0,
    );

    const byDate: Record<string, { hours: number; codes: string[] }> = {};
    for (const e of entries) {
      if (!byDate[e.date]) byDate[e.date] = { hours: 0, codes: [] };
      byDate[e.date].hours += Number(e.hours);
      byDate[e.date].codes.push(
        `${e.chargeCodeName || e.chargeCodeId} (${e.hours}h)`,
      );
    }

    let summary = `Timesheet for ${sheet.periodStart} to ${sheet.periodEnd} — Status: ${sheet.status}\nTotal: ${totalHours}h\n\n`;
    for (const [date, info] of Object.entries(byDate).sort()) {
      summary += `${date}: ${info.hours}h — ${info.codes.join(', ')}\n`;
    }

    return {
      type: 'card',
      text: summary.trim(),
      suggestedActions: ['วันนี้กรอกไปกี่ชั่วโมงแล้ว?', 'ฉันมี Charge Code อะไรบ้าง?'],
    };
  }

  private async handleHoursToday(userId: string, firstCC?: string): Promise<BotResponse> {
    const today = new Date().toISOString().split('T')[0];
    const period = today;
    const sheet = await this.timesheetsService.findByPeriod(userId, period);

    if (!sheet) {
      return {
        type: 'message',
        text: `วันนี้ยังไม่ได้กรอกชั่วโมงเลยค่ะ (${today})`,
        suggestedActions: [`กรอก 4 ชม. ${firstCC || 'PRJ-001'} วันนี้`],
      };
    }

    const entries = await this.db
      .select({
        hours: timesheetEntries.hours,
        chargeCodeId: timesheetEntries.chargeCodeId,
        chargeCodeName: chargeCodes.name,
        description: timesheetEntries.description,
      })
      .from(timesheetEntries)
      .leftJoin(chargeCodes, eq(timesheetEntries.chargeCodeId, chargeCodes.id))
      .where(
        and(
          eq(timesheetEntries.timesheetId, sheet.id),
          eq(timesheetEntries.date, today),
        ),
      );

    if (entries.length === 0) {
      return {
        type: 'message',
        text: `วันนี้ยังไม่ได้กรอกชั่วโมงเลยค่ะ (${today})`,
        suggestedActions: [`กรอก 4 ชม. ${firstCC || 'PRJ-001'} วันนี้`],
      };
    }

    const total = entries.reduce((s, e) => s + Number(e.hours), 0);
    const lines = entries.map(
      (e) =>
        `- ${e.chargeCodeName || e.chargeCodeId}: ${e.hours}h${e.description ? ` (${e.description})` : ''}`,
    );

    return {
      type: 'message',
      text: `วันนี้กรอกไปแล้ว ${total} ชม. (${today}):\n${lines.join('\n')}`,
      suggestedActions: ['แสดง Timesheet สัปดาห์นี้'],
    };
  }

  private async handleChargeCodesInquiry(
    userId: string,
    firstCC?: string,
  ): Promise<BotResponse> {
    const codes = await this.timesheetsService.getUserChargeCodes(userId);

    if (codes.length === 0) {
      return {
        type: 'message',
        text: 'คุณยังไม่มี Charge Code ค่ะ กรุณาติดต่อหัวหน้าเพื่อขอสิทธิ์เข้าถึง',
      };
    }

    const lines = codes.map(
      (c) =>
        `- ${c.name} (${c.chargeCodeId}) — ${c.isBillable ? 'คิดค่าบริการ' : 'ไม่คิดค่าบริการ'}${c.programName ? ` | ${c.programName}` : ''}`,
    );

    return {
      type: 'card',
      text: `Charge Code ที่คุณได้รับมอบหมาย:\n${lines.join('\n')}`,
      suggestedActions: [`กรอก 4 ชม. ${firstCC || 'PRJ-001'} วันนี้`, 'แสดง Timesheet สัปดาห์นี้'],
    };
  }

  private getHelp(firstCC?: string): BotResponse {
    return {
      type: 'message',
      text:
        'สวัสดีค่ะ! ฉันช่วยเรื่องการกรอกเวลาได้ค่ะ ลองพิมพ์ตามนี้:\n\n' +
        '**กรอกเวลา:**\n' +
        '- "กรอก 4 ชม. PRJ-042 วันนี้"\n' +
        '- "ลง 2 ชม. code review ACT-010 เมื่อวาน"\n' +
        '- "กรอกเวลา 8h OMS เมื่อวาน"\n\n' +
        '**ตรวจสอบสถานะ:**\n' +
        '- "แสดง Timesheet สัปดาห์นี้"\n' +
        '- "วันนี้กรอกไปกี่ชั่วโมงแล้ว?"\n' +
        '- "ฉันมี Charge Code อะไรบ้าง?"\n' +
        '- "สถานะงบประมาณ PRJ-042"',
      suggestedActions: this.getSuggestedPrompts(firstCC),
    };
  }

  getSuggestedPrompts(firstChargeCode?: string): string[] {
    const cc = firstChargeCode || 'PRJ-001';
    return [
      `กรอก 4 ชม. ${cc} วันนี้`,
      'แสดง Timesheet สัปดาห์นี้',
      'วันนี้กรอกไปกี่ชั่วโมงแล้ว?',
      'ฉันมี Charge Code อะไรบ้าง?',
      `สถานะงบประมาณ ${cc}`,
    ];
  }

  parseTimeEntry(text: string): ParsedTimeEntry | null {
    // Patterns (English):
    // "Log 4h on PRJ-042 today"
    // "Logged 2h code review ACT-010 yesterday"
    // "Add 3.5h PRJ-042 2026-03-15 design work"
    //
    // Patterns (Thai):
    // "ลง 4 ชม. PRJ-042 วันนี้"
    // "กรอกเวลา 8h OMS เมื่อวาน"
    // "บันทึก 3.5 ชั่วโมง PRJ-042"

    // Match hours: English (4h, 4 hours) or Thai (4 ชม., 4 ชั่วโมง)
    const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:h(?:ours?)?|ชม\.?|ชั่วโมง)/i);
    if (!hoursMatch) return null;

    const hours = parseFloat(hoursMatch[1]);
    if (hours <= 0 || hours > 24) return null;

    // Extract charge code ID: DEPT-SCM, PRJ-042, ACT-010, OMS, etc.
    const ccMatch = text.match(/\b([A-Z]{2,}[-_][A-Z0-9]{2,})\b/) || text.match(/\b([A-Z]{2,}\d{2,})\b/);
    if (!ccMatch) return null;

    const chargeCodeId = ccMatch[1];

    // Extract date (English + Thai)
    let date: string;
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      date = dateMatch[1];
    } else if (/\byesterday\b/i.test(text) || /เมื่อวาน/.test(text)) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      date = d.toISOString().split('T')[0];
    } else {
      // Default to today (matches "today" and "วันนี้")
      date = new Date().toISOString().split('T')[0];
    }

    // Extract description: text after the charge code that isn't a date keyword
    let description: string | undefined;
    const afterCC = text.substring(text.indexOf(chargeCodeId) + chargeCodeId.length).trim();
    const descCleaned = afterCC
      .replace(/\b(today|yesterday|\d{4}-\d{2}-\d{2})\b/gi, '')
      .replace(/(วันนี้|เมื่อวาน)/g, '')
      .replace(/\bon\b/gi, '')
      .trim();

    // Also check for description before the charge code (e.g. "Logged 2h code review ACT-010")
    const beforeCC = text
      .substring(0, text.indexOf(chargeCodeId))
      .replace(/^(log|logged|add|ลง|กรอก(?:เวลา)?|บันทึก)\s*/i, '')
      .replace(/\d+(?:\.\d+)?\s*(?:h(?:ours?)?|ชม\.?|ชั่วโมง)\s*/i, '')
      .replace(/\bon\b/gi, '')
      .trim();

    if (descCleaned) {
      description = descCleaned;
    } else if (beforeCC) {
      description = beforeCC;
    }

    return { hours, chargeCodeId, date, description };
  }

  private extractChargeCodeId(text: string): string | null {
    const match = text.match(/\b([A-Z]{2,}[-_][A-Z0-9]{2,})\b/) || text.match(/\b([A-Z]{2,}\d{2,})\b/);
    return match ? match[1] : null;
  }
}
