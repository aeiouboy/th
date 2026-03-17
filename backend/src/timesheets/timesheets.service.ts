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
} from '../database/schema';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { EntryDto } from './dto/upsert-entries.dto';
import { CalendarService } from '../calendar/calendar.service';

@Injectable()
export class TimesheetsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly calendarService: CalendarService,
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

    if (sheet.status !== 'draft' && sheet.status !== 'rejected') {
      throw new ForbiddenException(
        'Can only edit timesheets in draft or rejected status',
      );
    }

    // Validate charge codes are assigned to user
    const chargeCodeIds = [...new Set(entries.map((e) => e.charge_code_id))];
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

    // Delete existing entries for this timesheet, then insert fresh
    await this.db
      .delete(timesheetEntries)
      .where(eq(timesheetEntries.timesheetId, timesheetId));

    if (entries.length === 0) {
      return [];
    }

    const toInsert = entries
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

    if (sheet.status !== 'draft' && sheet.status !== 'rejected') {
      throw new BadRequestException(
        `Cannot submit timesheet with status '${sheet.status}'`,
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

    // Check each weekday in the period
    const shortDays: { date: string; logged: number; required: number }[] = [];
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];

      // Skip weekends (fallback check) and holidays from calendar
      const dayOfWeek = d.getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6 || nonWorkingSet.has(dateStr)) {
        continue;
      }

      const logged = hoursByDate.get(dateStr) ?? 0;
      if (logged < 8) {
        shortDays.push({ date: dateStr, logged, required: 8 });
      }
    }

    if (shortDays.length > 0) {
      throw new BadRequestException({
        message: 'Minimum 8 hours required on weekdays',
        details: shortDays,
      });
    }
  }

  async getUserChargeCodes(userId: string) {
    return this.db
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
  }
}
