import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { calendar, vacationRequests, profiles } from '../database/schema';

@Injectable()
export class CalendarService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getCalendarByYear(year: number, countryCode?: string) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const conditions = [
      gte(calendar.date, startDate),
      lte(calendar.date, endDate),
    ];

    if (countryCode) {
      conditions.push(eq(calendar.countryCode, countryCode));
    }

    return this.db
      .select()
      .from(calendar)
      .where(and(...conditions))
      .orderBy(calendar.date);
  }

  async getWorkingDays(
    startDate: string,
    endDate: string,
    userId?: string,
  ) {
    // Get non-working calendar days (weekends + holidays)
    const nonWorkingDays = await this.db
      .select()
      .from(calendar)
      .where(
        and(
          gte(calendar.date, startDate),
          lte(calendar.date, endDate),
          sql`(${calendar.isWeekend} = true OR ${calendar.isHoliday} = true)`,
        ),
      );

    // Get approved vacation days for the user if provided
    let vacationDays: string[] = [];
    if (userId) {
      const vacations = await this.db
        .select()
        .from(vacationRequests)
        .where(
          and(
            eq(vacationRequests.userId, userId),
            eq(vacationRequests.status, 'approved'),
            lte(vacationRequests.startDate, endDate),
            gte(vacationRequests.endDate, startDate),
          ),
        );

      for (const v of vacations) {
        const vStart = new Date(
          Math.max(new Date(v.startDate).getTime(), new Date(startDate).getTime()),
        );
        const vEnd = new Date(
          Math.min(new Date(v.endDate).getTime(), new Date(endDate).getTime()),
        );
        for (let d = new Date(vStart); d <= vEnd; d.setDate(d.getDate() + 1)) {
          vacationDays.push(d.toISOString().split('T')[0]);
        }
      }
    }

    const nonWorkingSet = new Set([
      ...nonWorkingDays.map((d) => d.date),
      ...vacationDays,
    ]);

    // Count total days in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalDays = 0;
    let workingDays = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      totalDays++;
      const dateStr = d.toISOString().split('T')[0];
      if (!nonWorkingSet.has(dateStr)) {
        workingDays++;
      }
    }

    return {
      startDate,
      endDate,
      totalDays,
      workingDays,
      nonWorkingDays: totalDays - workingDays,
      holidays: nonWorkingDays.filter((d) => d.isHoliday).length,
      weekends: nonWorkingDays.filter((d) => d.isWeekend).length,
    };
  }

  async createHoliday(date: string, holidayName: string, countryCode = 'TH') {
    // Check if entry already exists for this date
    const [existing] = await this.db
      .select()
      .from(calendar)
      .where(eq(calendar.date, date))
      .limit(1);

    if (existing) {
      // Update existing entry to mark as holiday
      const [updated] = await this.db
        .update(calendar)
        .set({ isHoliday: true, holidayName, countryCode })
        .where(eq(calendar.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(calendar)
      .values({ date, isHoliday: true, holidayName, countryCode })
      .returning();
    return created;
  }

  async updateHoliday(
    id: number,
    data: { date?: string; holidayName?: string; countryCode?: string },
  ) {
    const [existing] = await this.db
      .select()
      .from(calendar)
      .where(eq(calendar.id, id))
      .limit(1);

    if (!existing || !existing.isHoliday) {
      throw new NotFoundException('Holiday not found');
    }

    const [updated] = await this.db
      .update(calendar)
      .set(data)
      .where(eq(calendar.id, id))
      .returning();
    return updated;
  }

  async deleteHoliday(id: number) {
    const [existing] = await this.db
      .select()
      .from(calendar)
      .where(eq(calendar.id, id))
      .limit(1);

    if (!existing || !existing.isHoliday) {
      throw new NotFoundException('Holiday not found');
    }

    // If it's also a weekend, just clear the holiday fields
    if (existing.isWeekend) {
      const [updated] = await this.db
        .update(calendar)
        .set({ isHoliday: false, holidayName: null })
        .where(eq(calendar.id, id))
        .returning();
      return updated;
    }

    // Otherwise delete the entry entirely
    await this.db.delete(calendar).where(eq(calendar.id, id));
    return { deleted: true };
  }

  async populateWeekends(year: number) {
    const weekends: { date: string; isWeekend: boolean }[] = [];
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day === 0 || day === 6) {
        weekends.push({
          date: d.toISOString().split('T')[0],
          isWeekend: true,
        });
      }
    }

    // Upsert weekends - insert or skip if already exists
    let created = 0;
    for (const weekend of weekends) {
      try {
        await this.db
          .insert(calendar)
          .values(weekend)
          .onConflictDoUpdate({
            target: calendar.date,
            set: { isWeekend: true },
          });
        created++;
      } catch {
        // skip duplicates
      }
    }

    return { year, weekendsPopulated: created };
  }

  // Vacation requests
  async getMyVacations(userId: string) {
    return this.db
      .select()
      .from(vacationRequests)
      .where(eq(vacationRequests.userId, userId))
      .orderBy(vacationRequests.createdAt);
  }

  async createVacation(userId: string, startDate: string, endDate: string) {
    if (new Date(endDate) < new Date(startDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    const [created] = await this.db
      .insert(vacationRequests)
      .values({ userId, startDate, endDate })
      .returning();
    return created;
  }

  async getPendingVacationsForManager(managerId: string) {
    // Get users managed by this manager
    const managedUsers = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.managerId, managerId));

    if (managedUsers.length === 0) return [];

    const userIds = managedUsers.map((u) => u.id);

    const results = await this.db
      .select({
        vacation: vacationRequests,
        user: {
          id: profiles.id,
          fullName: profiles.fullName,
          email: profiles.email,
        },
      })
      .from(vacationRequests)
      .innerJoin(profiles, eq(vacationRequests.userId, profiles.id))
      .where(
        and(
          eq(vacationRequests.status, 'pending'),
          inArray(vacationRequests.userId, userIds),
        ),
      );

    return results;
  }

  async approveVacation(id: number, approverId: string) {
    const [vacation] = await this.db
      .select()
      .from(vacationRequests)
      .where(eq(vacationRequests.id, id))
      .limit(1);

    if (!vacation) throw new NotFoundException('Vacation request not found');
    if (vacation.status !== 'pending') {
      throw new BadRequestException('Vacation request is not pending');
    }

    // Verify approver is the manager of the requester
    const [requester] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, vacation.userId))
      .limit(1);

    if (!requester || requester.managerId !== approverId) {
      throw new ForbiddenException('You are not the manager of this employee');
    }

    const [updated] = await this.db
      .update(vacationRequests)
      .set({ status: 'approved', approvedBy: approverId })
      .where(eq(vacationRequests.id, id))
      .returning();
    return updated;
  }

  async rejectVacation(id: number, approverId: string) {
    const [vacation] = await this.db
      .select()
      .from(vacationRequests)
      .where(eq(vacationRequests.id, id))
      .limit(1);

    if (!vacation) throw new NotFoundException('Vacation request not found');
    if (vacation.status !== 'pending') {
      throw new BadRequestException('Vacation request is not pending');
    }

    const [requester] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, vacation.userId))
      .limit(1);

    if (!requester || requester.managerId !== approverId) {
      throw new ForbiddenException('You are not the manager of this employee');
    }

    const [updated] = await this.db
      .update(vacationRequests)
      .set({ status: 'rejected', approvedBy: approverId })
      .where(eq(vacationRequests.id, id))
      .returning();
    return updated;
  }
}
