import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, inArray, sql, gte, lte } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import {
  timesheets,
  timesheetEntries,
  chargeCodeUsers,
  chargeCodes,
  calendar,
  vacationRequests,
} from '../database/schema';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { EntryDto } from './dto/upsert-entries.dto';
import { CalendarService } from '../calendar/calendar.service';
import { TeamsWebhookService } from '../integrations/teams-webhook.service';

@Injectable()
export class TimesheetsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly calendarService: CalendarService,
    private readonly teamsWebhook: TeamsWebhookService,
  ) {}

  private getWeekBounds(dateStr: string): { start: string; end: string } {
    const d = new Date(dateStr);
    const day = d.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
    };
  }

  async getAvailablePeriods(userId: string): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ periodStart: timesheets.periodStart })
      .from(timesheets)
      .where(eq(timesheets.userId, userId))
      .orderBy(sql`${timesheets.periodStart} DESC`);

    return rows.map((r) => r.periodStart);
  }

  async create(userId: string, dto: CreateTimesheetDto) {
    const week = this.getWeekBounds(dto.period_start);

    const existing = await this.db
      .select()
      .from(timesheets)
      .where(
        and(
          eq(timesheets.userId, userId),
          eq(timesheets.periodStart, week.start),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const [created] = await this.db
      .insert(timesheets)
      .values({
        userId,
        periodStart: week.start,
        periodEnd: week.end,
        status: 'draft',
      })
      .returning();

    // Auto-fill leave entries for approved vacation days
    await this.autoFillLeaveEntries(created.id, userId, week.start, week.end);

    return created;
  }

  async findByPeriod(userId: string, period: string) {
    const week = this.getWeekBounds(period);

    const [sheet] = await this.db
      .select()
      .from(timesheets)
      .where(
        and(
          eq(timesheets.userId, userId),
          eq(timesheets.periodStart, week.start),
        ),
      )
      .limit(1);

    return sheet || null;
  }

  async findById(userId: string, id: string) {
    const [sheet] = await this.db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.id, id), eq(timesheets.userId, userId)))
      .limit(1);

    if (!sheet) throw new NotFoundException('Timesheet not found');

    const entries = await this.fetchEntriesWithChargeCodes(id);

    return { ...sheet, entries };
  }

  async getEntries(userId: string, id: string) {
    const [sheet] = await this.db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.id, id), eq(timesheets.userId, userId)))
      .limit(1);

    if (!sheet) throw new NotFoundException('Timesheet not found');

    return this.fetchEntriesWithChargeCodes(id);
  }

  private fetchEntriesWithChargeCodes(timesheetId: string) {
    return this.db
      .select({
        id: timesheetEntries.id,
        timesheetId: timesheetEntries.timesheetId,
        chargeCodeId: timesheetEntries.chargeCodeId,
        date: timesheetEntries.date,
        hours: timesheetEntries.hours,
        description: timesheetEntries.description,
        createdAt: timesheetEntries.createdAt,
        chargeCodeName: chargeCodes.name,
        isBillable: chargeCodes.isBillable,
      })
      .from(timesheetEntries)
      .leftJoin(
        chargeCodes,
        eq(timesheetEntries.chargeCodeId, chargeCodes.id),
      )
      .where(eq(timesheetEntries.timesheetId, timesheetId));
  }

  async upsertEntries(userId: string, timesheetId: string, entries: EntryDto[]) {
    const [sheet] = await this.db
      .select()
      .from(timesheets)
      .where(
        and(eq(timesheets.id, timesheetId), eq(timesheets.userId, userId)),
      )
      .limit(1);

    if (!sheet) throw new NotFoundException('Timesheet not found');

    if (!['draft', 'rejected', 'submitted', 'approved'].includes(sheet.status)) {
      throw new ForbiddenException(
        'Cannot edit timesheets that are locked',
      );
    }

    // Filter out LEAVE-001 entries — they are system-managed and cannot be edited by users
    const userEntries = entries.filter((e) => e.charge_code_id !== 'LEAVE-001');

    // Validate charge codes are assigned to user (skip system codes like LEAVE-001)
    const chargeCodeIds = [...new Set(userEntries.map((e) => e.charge_code_id))];
    if (chargeCodeIds.length > 0) {
      const allowedCodes = await this.db
        .select({ chargeCodeId: chargeCodeUsers.chargeCodeId })
        .from(chargeCodeUsers)
        .where(
          and(
            eq(chargeCodeUsers.userId, userId),
            inArray(chargeCodeUsers.chargeCodeId, chargeCodeIds),
          ),
        );

      const allowedSet = new Set(allowedCodes.map((c) => c.chargeCodeId));
      const invalid = chargeCodeIds.filter((id) => !allowedSet.has(id));
      if (invalid.length > 0) {
        throw new BadRequestException(
          `Charge codes not assigned to you: ${invalid.join(', ')}`,
        );
      }
    }

    // Validate: reject entries with hours > 0 on full-day vacation days
    const approvedVacations = await this.db
      .select({
        startDate: vacationRequests.startDate,
        endDate: vacationRequests.endDate,
        leaveType: vacationRequests.leaveType,
      })
      .from(vacationRequests)
      .where(
        and(
          eq(vacationRequests.userId, userId),
          eq(vacationRequests.status, 'approved'),
          lte(vacationRequests.startDate, sheet.periodEnd),
          gte(vacationRequests.endDate, sheet.periodStart),
        ),
      );

    const fullDayVacationDates = new Set<string>();
    const halfDayVacationDates = new Map<string, number>();
    for (const v of approvedVacations) {
      const leaveType = v.leaveType || 'full_day';
      const vStart = new Date(Math.max(new Date(v.startDate).getTime(), new Date(sheet.periodStart).getTime()));
      const vEnd = new Date(Math.min(new Date(v.endDate).getTime(), new Date(sheet.periodEnd).getTime()));
      for (let d = new Date(vStart); d <= vEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (leaveType === 'full_day') {
          fullDayVacationDates.add(dateStr);
        } else {
          halfDayVacationDates.set(dateStr, 4); // max 4h allowed on half-day
        }
      }
    }

    // Filter out entries on full-day vacation days silently
    const validatedEntries = userEntries.filter((e) => {
      if (fullDayVacationDates.has(e.date) && e.hours > 0) return false;
      return true;
    });

    // Delete existing non-leave entries for this timesheet, then insert fresh
    // Preserve system leave entries (LEAVE-001)
    await this.db
      .delete(timesheetEntries)
      .where(
        and(
          eq(timesheetEntries.timesheetId, timesheetId),
          sql`${timesheetEntries.chargeCodeId} != 'LEAVE-001'`,
        ),
      );

    if (validatedEntries.length === 0) {
      // Still return existing leave entries
      return this.db
        .select()
        .from(timesheetEntries)
        .where(eq(timesheetEntries.timesheetId, timesheetId));
    }

    const toInsert = validatedEntries
      .filter((e) => e.hours > 0)
      .map((e) => ({
        timesheetId,
        chargeCodeId: e.charge_code_id,
        date: e.date,
        hours: String(e.hours),
        description: e.description || null,
      }));

    if (toInsert.length === 0) {
      return [];
    }

    const inserted = await this.db
      .insert(timesheetEntries)
      .values(toInsert)
      .returning();

    // Update timesheet updatedAt
    await this.db
      .update(timesheets)
      .set({ updatedAt: new Date(), status: 'draft' })
      .where(eq(timesheets.id, timesheetId));

    return inserted;
  }

  async submit(userId: string, id: string) {
    const [sheet] = await this.db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.id, id), eq(timesheets.userId, userId)))
      .limit(1);

    if (!sheet) throw new NotFoundException('Timesheet not found');

    if (!['draft', 'rejected', 'submitted'].includes(sheet.status)) {
      throw new BadRequestException(
        `Cannot submit timesheet with status '${sheet.status}'`,
      );
    }

    // Auto-fill leave entries before validation (handles vacation approved after timesheet creation)
    await this.autoFillLeaveEntries(id, userId, sheet.periodStart, sheet.periodEnd);

    // Cutoff enforcement: cutoff on 15th and end of month (per PRD)
    const now = new Date();
    const periodEndDate = new Date(sheet.periodEnd);
    const year = periodEndDate.getUTCFullYear();
    const month = periodEndDate.getUTCMonth();
    const day = periodEndDate.getUTCDate();

    // Determine cutoff date: 15th or last day of month
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const cutoffDate = day <= 15
      ? new Date(Date.UTC(year, month, 15, 23, 59, 59))
      : new Date(Date.UTC(year, month, lastDayOfMonth, 23, 59, 59));

    if (now > cutoffDate) {
      throw new ForbiddenException(
        `Submission period closed. Cutoff was ${cutoffDate.toISOString().split('T')[0]}. Contact your manager for late submission.`,
      );
    }

    // Min 8hr validation: check each weekday has >= 8 hours logged
    await this.validateMinimumHours(id, sheet.periodStart, sheet.periodEnd, userId);

    const [updated] = await this.db
      .update(timesheets)
      .set({
        status: 'submitted',
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(timesheets.id, id))
      .returning();

    // Teams notification (fire-and-forget)
    this.teamsWebhook
      .sendCard(
        'Timesheet Submitted',
        `A timesheet has been submitted for review.`,
        [
          { name: 'Period', value: `${sheet.periodStart} - ${sheet.periodEnd}` },
        ],
        '2196f3', // blue info
      )
      .catch(() => {});

    return updated;
  }

  async validateMinimumHours(
    timesheetId: string,
    periodStart: string,
    periodEnd: string,
    userId: string,
  ): Promise<void> {
    // Get all entries for this timesheet grouped by date
    const entries = await this.db
      .select({
        date: timesheetEntries.date,
        hours: timesheetEntries.hours,
      })
      .from(timesheetEntries)
      .where(eq(timesheetEntries.timesheetId, timesheetId));

    // Sum hours per date
    const hoursByDate = new Map<string, number>();
    for (const entry of entries) {
      const current = hoursByDate.get(entry.date) ?? 0;
      hoursByDate.set(entry.date, current + Number(entry.hours));
    }

    // Get non-working days (weekends + holidays) from calendar
    const nonWorkingDays = await this.db
      .select({ date: calendar.date })
      .from(calendar)
      .where(
        and(
          gte(calendar.date, periodStart),
          lte(calendar.date, periodEnd),
          sql`(${calendar.isWeekend} = true OR ${calendar.isHoliday} = true)`,
        ),
      );

    const nonWorkingSet = new Set(nonWorkingDays.map((d) => d.date));

    // Get approved vacation days for this user overlapping the period
    const approvedVacations = await this.db
      .select({
        startDate: vacationRequests.startDate,
        endDate: vacationRequests.endDate,
        leaveType: vacationRequests.leaveType,
      })
      .from(vacationRequests)
      .where(
        and(
          eq(vacationRequests.userId, userId),
          eq(vacationRequests.status, 'approved'),
          lte(vacationRequests.startDate, periodEnd),
          gte(vacationRequests.endDate, periodStart),
        ),
      );

    // Map date -> leave hours (full_day=8, half=4)
    const vacationHoursMap = new Map<string, number>();
    for (const v of approvedVacations) {
      const leaveType = v.leaveType || 'full_day';
      const leaveHours = leaveType === 'full_day' ? 8 : 4;
      const vStart = new Date(
        Math.max(new Date(v.startDate).getTime(), new Date(periodStart).getTime()),
      );
      const vEnd = new Date(
        Math.min(new Date(v.endDate).getTime(), new Date(periodEnd).getTime()),
      );
      for (let d = new Date(vStart); d <= vEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        // Take the max leave hours if multiple vacations overlap the same day
        vacationHoursMap.set(dateStr, Math.max(vacationHoursMap.get(dateStr) || 0, leaveHours));
      }
    }

    // Check each day that has entries — must have at least required hours
    // Days without any entries are allowed (employee can submit daily)
    const shortDays: { date: string; logged: number; required: number }[] = [];

    for (const [dateStr, logged] of hoursByDate) {
      // Skip weekends and holidays
      const d = new Date(dateStr + 'T00:00:00Z');
      const dayOfWeek = d.getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6 || nonWorkingSet.has(dateStr)) {
        continue;
      }

      // Full-day vacation: skip entirely
      const leaveHours = vacationHoursMap.get(dateStr) || 0;
      if (leaveHours >= 8) continue;

      // Half-day vacation: require 8 - leaveHours
      const required = 8 - leaveHours;
      if (logged < required) {
        shortDays.push({ date: dateStr, logged, required });
      }
    }

    if (shortDays.length > 0) {
      throw new BadRequestException({
        message: 'Minimum 8 hours required on weekdays',
        details: shortDays,
      });
    }
  }

  /**
   * Auto-fill 8h leave entries for approved vacation days and public holidays
   * within the timesheet period. Deletes and re-inserts to stay in sync.
   */
  private async autoFillLeaveEntries(
    timesheetId: string,
    userId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<void> {
    // Find approved vacations overlapping this period
    const approvedVacations = await this.db
      .select({
        startDate: vacationRequests.startDate,
        endDate: vacationRequests.endDate,
        leaveType: vacationRequests.leaveType,
      })
      .from(vacationRequests)
      .where(
        and(
          eq(vacationRequests.userId, userId),
          eq(vacationRequests.status, 'approved'),
          lte(vacationRequests.startDate, periodEnd),
          gte(vacationRequests.endDate, periodStart),
        ),
      );

    // Collect all vacation weekdays within the period
    const leaveEntriesToInsert: { date: string; hours: string; description: string }[] = [];
    const coveredDates = new Set<string>();

    for (const v of approvedVacations) {
      const leaveType = v.leaveType || 'full_day';
      const hours = leaveType === 'full_day' ? '8' : '4';
      const descSuffix = leaveType === 'half_am' ? ' (AM)' : leaveType === 'half_pm' ? ' (PM)' : '';

      const vStart = new Date(
        Math.max(new Date(v.startDate).getTime(), new Date(periodStart).getTime()),
      );
      const vEnd = new Date(
        Math.min(new Date(v.endDate).getTime(), new Date(periodEnd).getTime()),
      );
      for (let d = new Date(vStart); d <= vEnd; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getUTCDay();
        // Skip weekends
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const dateStr = d.toISOString().split('T')[0];
          if (!coveredDates.has(dateStr)) {
            coveredDates.add(dateStr);
            leaveEntriesToInsert.push({
              date: dateStr,
              hours,
              description: `Annual Leave${descSuffix}`,
            });
          }
        }
      }
    }

    // Find public holidays within the period
    const holidays = await this.db
      .select({
        date: calendar.date,
        holidayName: calendar.holidayName,
      })
      .from(calendar)
      .where(
        and(
          gte(calendar.date, periodStart),
          lte(calendar.date, periodEnd),
          eq(calendar.isHoliday, true),
        ),
      );

    for (const h of holidays) {
      // Skip weekends and dates already covered by vacation
      const hDate = new Date(h.date + 'T00:00:00Z');
      const dayOfWeek = hDate.getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      if (!coveredDates.has(h.date)) {
        coveredDates.add(h.date);
        leaveEntriesToInsert.push({
          date: h.date,
          hours: '8',
          description: h.holidayName || 'Public Holiday',
        });
      }
    }

    // Delete any existing LEAVE-001 entries for this timesheet first, then re-insert
    await this.db
      .delete(timesheetEntries)
      .where(
        and(
          eq(timesheetEntries.timesheetId, timesheetId),
          eq(timesheetEntries.chargeCodeId, 'LEAVE-001'),
        ),
      );

    if (leaveEntriesToInsert.length === 0) return;

    const values = leaveEntriesToInsert.map((entry) => ({
      timesheetId,
      chargeCodeId: 'LEAVE-001',
      date: entry.date,
      hours: entry.hours,
      description: entry.description,
    }));

    await this.db.insert(timesheetEntries).values(values);
  }

  async copyFromPrevious(userId: string, timesheetId: string) {
    const [sheet] = await this.db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.id, timesheetId), eq(timesheets.userId, userId)))
      .limit(1);

    if (!sheet) throw new NotFoundException('Timesheet not found');
    if (sheet.status !== 'draft') {
      throw new BadRequestException('Can only copy to draft timesheets');
    }

    // Check if current timesheet already has non-leave entries
    const existingEntries = await this.db
      .select({ id: timesheetEntries.id })
      .from(timesheetEntries)
      .where(
        and(
          eq(timesheetEntries.timesheetId, timesheetId),
          sql`${timesheetEntries.chargeCodeId} != 'LEAVE-001'`,
        ),
      )
      .limit(1);

    if (existingEntries.length > 0) {
      throw new BadRequestException('Timesheet already has entries');
    }

    // Find previous week's timesheet
    const prevWeekStart = new Date(sheet.periodStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevPeriodStart = prevWeekStart.toISOString().split('T')[0];

    const [prevSheet] = await this.db
      .select()
      .from(timesheets)
      .where(
        and(
          eq(timesheets.userId, userId),
          eq(timesheets.periodStart, prevPeriodStart),
        ),
      )
      .limit(1);

    if (!prevSheet) {
      throw new NotFoundException('No previous timesheet found');
    }

    // Get distinct charge codes from previous period (excluding LEAVE-001)
    const prevEntries = await this.db
      .select({
        chargeCodeId: timesheetEntries.chargeCodeId,
        chargeCodeName: chargeCodes.name,
        isBillable: chargeCodes.isBillable,
      })
      .from(timesheetEntries)
      .leftJoin(chargeCodes, eq(timesheetEntries.chargeCodeId, chargeCodes.id))
      .where(
        and(
          eq(timesheetEntries.timesheetId, prevSheet.id),
          sql`${timesheetEntries.chargeCodeId} != 'LEAVE-001'`,
        ),
      )
      .groupBy(
        timesheetEntries.chargeCodeId,
        chargeCodes.name,
        chargeCodes.isBillable,
      );

    if (prevEntries.length === 0) {
      return { message: 'No entries to copy', entries: [] };
    }

    // Create empty entries (0 hours) for each weekday of the current period
    const toInsert: {
      timesheetId: string;
      chargeCodeId: string;
      date: string;
      hours: string;
    }[] = [];

    const periodStart = new Date(sheet.periodStart);
    for (let i = 0; i < 5; i++) {
      const d = new Date(periodStart);
      d.setDate(periodStart.getDate() + i);
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      const dateStr = d.toISOString().split('T')[0];

      for (const prev of prevEntries) {
        toInsert.push({
          timesheetId,
          chargeCodeId: prev.chargeCodeId,
          date: dateStr,
          hours: '0',
        });
      }
    }

    if (toInsert.length > 0) {
      await this.db.insert(timesheetEntries).values(toInsert);
    }

    return {
      message: `Copied ${prevEntries.length} charge code(s) from previous period`,
      entries: prevEntries.map((e) => ({
        chargeCodeId: e.chargeCodeId,
        chargeCodeName: e.chargeCodeName,
        isBillable: e.isBillable,
      })),
    };
  }

  async getUserChargeCodes(userId: string) {
    // Get user's assigned charge codes
    const userCodes = await this.db
      .select({
        chargeCodeId: chargeCodeUsers.chargeCodeId,
        name: chargeCodes.name,
        isBillable: chargeCodes.isBillable,
        programName: chargeCodes.programName,
        activityCategory: chargeCodes.activityCategory,
      })
      .from(chargeCodeUsers)
      .innerJoin(
        chargeCodes,
        eq(chargeCodeUsers.chargeCodeId, chargeCodes.id),
      )
      .where(eq(chargeCodeUsers.userId, userId));

    // Also include charge codes from user's current timesheet entries
    const existingIds = new Set(userCodes.map((c) => c.chargeCodeId));
    const timesheetCodes = await this.db
      .selectDistinct({
        chargeCodeId: timesheetEntries.chargeCodeId,
        name: chargeCodes.name,
        isBillable: chargeCodes.isBillable,
        programName: chargeCodes.programName,
        activityCategory: chargeCodes.activityCategory,
      })
      .from(timesheetEntries)
      .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
      .innerJoin(chargeCodes, eq(timesheetEntries.chargeCodeId, chargeCodes.id))
      .where(eq(timesheets.userId, userId));

    for (const tc of timesheetCodes) {
      if (!existingIds.has(tc.chargeCodeId)) {
        userCodes.push(tc);
        existingIds.add(tc.chargeCodeId);
      }
    }

    // Always include the system LEAVE-001 charge code
    if (!existingIds.has('LEAVE-001')) {
      const [leaveCode] = await this.db
        .select({
          chargeCodeId: chargeCodes.id,
          name: chargeCodes.name,
          isBillable: chargeCodes.isBillable,
          programName: chargeCodes.programName,
          activityCategory: chargeCodes.activityCategory,
        })
        .from(chargeCodes)
        .where(eq(chargeCodes.id, 'LEAVE-001'))
        .limit(1);

      if (leaveCode) {
        userCodes.push(leaveCode);
      }
    }

    return userCodes;
  }
}
