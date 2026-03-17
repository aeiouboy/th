import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, gte, lte, sum } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import {
  timesheets,
  timesheetEntries,
  chargeCodes,
  chargeCodeUsers,
  profiles,
  budgets,
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

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly timesheetsService: TimesheetsService,
    private readonly budgetsService: BudgetsService,
  ) {}

  async handleIncomingMessage(
    userId: string,
    text: string,
  ): Promise<BotResponse> {
    const trimmed = text.trim().toLowerCase();

    try {
      // Time logging commands
      if (
        trimmed.startsWith('log ') ||
        trimmed.startsWith('logged ') ||
        trimmed.startsWith('add ')
      ) {
        return this.handleTimeLog(userId, text);
      }

      // Budget inquiry
      if (
        trimmed.includes('budget') &&
        (trimmed.includes('status') || trimmed.includes('how'))
      ) {
        return this.handleBudgetInquiry(userId, text);
      }

      // Timesheet inquiry
      if (
        trimmed.includes('timesheet') &&
        (trimmed.includes('show') ||
          trimmed.includes('my') ||
          trimmed.includes('this week'))
      ) {
        return this.handleTimesheetInquiry(userId);
      }

      // Hours today
      if (
        trimmed.includes('hours') &&
        (trimmed.includes('today') || trimmed.includes('did i'))
      ) {
        return this.handleHoursToday(userId);
      }

      // Charge codes inquiry
      if (
        trimmed.includes('charge code') &&
        (trimmed.includes('assigned') ||
          trimmed.includes('my') ||
          trimmed.includes('what'))
      ) {
        return this.handleChargeCodesInquiry(userId);
      }

      // Help / suggested prompts
      return this.getHelp();
    } catch (error: any) {
      this.logger.error(`Error handling message: ${error.message}`, error.stack);
      return {
        type: 'message',
        text: `Sorry, I encountered an error: ${error.message}`,
        suggestedActions: this.getSuggestedPrompts(),
      };
    }
  }

  private async handleTimeLog(
    userId: string,
    text: string,
  ): Promise<BotResponse> {
    const parsed = this.parseTimeEntry(text);
    if (!parsed) {
      return {
        type: 'message',
        text: 'I couldn\'t parse your time entry. Try: "Log 4h on PRJ-042 today" or "Log 2h code review ACT-010 yesterday"',
        suggestedActions: this.getSuggestedPrompts(),
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
        text: `Charge code "${parsed.chargeCodeId}" not found. Use "What charge codes am I assigned to?" to see your codes.`,
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
      text: `Logged ${parsed.hours}h on ${cc.name} (${cc.id}) for ${parsed.date}${parsed.description ? ` — "${parsed.description}"` : ''}.`,
      suggestedActions: [
        'Show my timesheet for this week',
        'How many hours did I log today?',
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
        text: 'Please specify a charge code. Example: "What\'s my budget status for PRJ-042?"',
      };
    }

    try {
      const budget = await this.budgetsService.getBudgetForChargeCode(ccId);
      return {
        type: 'card',
        text:
          `Budget Status for ${budget.chargeCodeName} (${ccId}):\n` +
          `- Budget: $${budget.budgetAmount.toLocaleString()}\n` +
          `- Spent: $${budget.actualSpent.toLocaleString()} (${budget.percentage}%)\n` +
          `- Status: ${budget.status.replace('_', ' ')}` +
          (budget.forecastAtCompletion
            ? `\n- Forecast: $${budget.forecastAtCompletion.toLocaleString()}`
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

  private async handleTimesheetInquiry(userId: string): Promise<BotResponse> {
    const now = new Date();
    const period = now.toISOString().split('T')[0];
    const sheet = await this.timesheetsService.findByPeriod(userId, period);

    if (!sheet) {
      return {
        type: 'message',
        text: 'No timesheet found for the current week. Say "Log 4h on PRJ-042 today" to start one.',
        suggestedActions: this.getSuggestedPrompts(),
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
      suggestedActions: ['How many hours did I log today?', 'What charge codes am I assigned to?'],
    };
  }

  private async handleHoursToday(userId: string): Promise<BotResponse> {
    const today = new Date().toISOString().split('T')[0];
    const period = today;
    const sheet = await this.timesheetsService.findByPeriod(userId, period);

    if (!sheet) {
      return {
        type: 'message',
        text: `You haven't logged any hours today (${today}).`,
        suggestedActions: ['Log 4h on PRJ-042 today'],
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
        text: `You haven't logged any hours today (${today}).`,
        suggestedActions: ['Log 4h on PRJ-042 today'],
      };
    }

    const total = entries.reduce((s, e) => s + Number(e.hours), 0);
    const lines = entries.map(
      (e) =>
        `- ${e.chargeCodeName || e.chargeCodeId}: ${e.hours}h${e.description ? ` (${e.description})` : ''}`,
    );

    return {
      type: 'message',
      text: `You've logged ${total}h today (${today}):\n${lines.join('\n')}`,
      suggestedActions: ['Show my timesheet for this week'],
    };
  }

  private async handleChargeCodesInquiry(
    userId: string,
  ): Promise<BotResponse> {
    const codes = await this.timesheetsService.getUserChargeCodes(userId);

    if (codes.length === 0) {
      return {
        type: 'message',
        text: 'You have no charge codes assigned. Contact your manager to get assigned to charge codes.',
      };
    }

    const lines = codes.map(
      (c) =>
        `- ${c.name} (${c.chargeCodeId}) — ${c.isBillable ? 'Billable' : 'Non-billable'}${c.programName ? ` | ${c.programName}` : ''}`,
    );

    return {
      type: 'card',
      text: `Your assigned charge codes:\n${lines.join('\n')}`,
      suggestedActions: ['Log 4h on PRJ-042 today', 'Show my timesheet for this week'],
    };
  }

  private getHelp(): BotResponse {
    return {
      type: 'message',
      text:
        'Hi! I can help you with time tracking. Here are some things you can say:\n\n' +
        '**Log time:**\n' +
        '- "Log 4h on PRJ-042 today"\n' +
        '- "Logged 2h code review ACT-010 yesterday"\n\n' +
        '**Check status:**\n' +
        '- "Show my timesheet for this week"\n' +
        '- "How many hours did I log today?"\n' +
        '- "What charge codes am I assigned to?"\n' +
        '- "What\'s my budget status for PRJ-042?"',
      suggestedActions: this.getSuggestedPrompts(),
    };
  }

  getSuggestedPrompts(): string[] {
    return [
      'Log 4h on PRJ-042 today',
      'Show my timesheet for this week',
      'How many hours did I log today?',
      'What charge codes am I assigned to?',
      "What's my budget status for PRJ-042?",
    ];
  }

  parseTimeEntry(text: string): ParsedTimeEntry | null {
    // Patterns:
    // "Log 4h on PRJ-042 today"
    // "Logged 2h code review ACT-010 yesterday"
    // "Add 3.5h PRJ-042 2026-03-15 design work"
    const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?/i);
    if (!hoursMatch) return null;

    const hours = parseFloat(hoursMatch[1]);
    if (hours <= 0 || hours > 24) return null;

    // Extract charge code ID (uppercase letters + dash + digits pattern, or just uppercase+digits)
    const ccMatch = text.match(/\b([A-Z]{2,}[-_]?\d{2,})\b/);
    if (!ccMatch) return null;

    const chargeCodeId = ccMatch[1];

    // Extract date
    let date: string;
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      date = dateMatch[1];
    } else if (/\byesterday\b/i.test(text)) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      date = d.toISOString().split('T')[0];
    } else {
      // Default to today
      date = new Date().toISOString().split('T')[0];
    }

    // Extract description: text after the charge code that isn't a date keyword
    let description: string | undefined;
    const afterCC = text.substring(text.indexOf(chargeCodeId) + chargeCodeId.length).trim();
    const descCleaned = afterCC
      .replace(/\b(today|yesterday|\d{4}-\d{2}-\d{2})\b/gi, '')
      .replace(/\bon\b/gi, '')
      .trim();

    // Also check for description before the charge code (e.g. "Logged 2h code review ACT-010")
    const beforeCC = text
      .substring(0, text.indexOf(chargeCodeId))
      .replace(/^(log|logged|add)\s+/i, '')
      .replace(/\d+(?:\.\d+)?\s*h(?:ours?)?\s*/i, '')
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
    const match = text.match(/\b([A-Z]{2,}[-_]?\d{2,})\b/);
    return match ? match[1] : null;
  }
}
