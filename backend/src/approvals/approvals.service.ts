import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import {
  timesheets,
  timesheetEntries,
  profiles,
  approvalLogs,
  chargeCodes,
  calendar,
  vacationRequests,
} from '../database/schema';
import { TeamsWebhookService } from '../integrations/teams-webhook.service';

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly teamsWebhook: TeamsWebhookService,
  ) {}

  async getTeamStatus(userId: string, userRole: string) {
    // Determine current week boundaries (Monday to Sunday) using UTC
    const now = new Date();
    const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = utcDay === 0 ? -6 : 1 - utcDay;
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + mondayOffset));
    const weekEnd = new Date(Date.UTC(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), weekStart.getUTCDate() + 6));

    const periodStart = weekStart.toISOString().split('T')[0];
    const periodEnd = weekEnd.toISOString().split('T')[0];

    // Get non-working days from calendar table (weekends & holidays that have rows)
    const nonWorkingResult = await this.db
      .select({ date: calendar.date })
      .from(calendar)
      .where(
        and(
          sql`${calendar.date} >= ${periodStart}`,
          sql`${calendar.date} <= ${periodEnd}`,
          sql`(${calendar.isWeekend} = true OR ${calendar.isHoliday} = true)`,
        ),
      );

    const nonWorkingSet = new Set(nonWorkingResult.map((r) => r.date));

    // Calculate working days by iterating Mon-Fri and excluding non-working days
    const workingDays: string[] = [];
    for (let d = new Date(weekStart); d <= weekEnd; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6) continue; // skip weekends
      if (nonWorkingSet.has(dateStr)) continue; // skip holidays
      workingDays.push(dateStr);
    }

    const workingDayCount = workingDays.length;
    const targetHours = workingDayCount * 8;

    // Get team members: for admin, all users; for others, direct reports
    let teamMembers: {
      id: string;
      fullName: string | null;
      email: string;
      department: string | null;
    }[];

    if (userRole === 'admin') {
      teamMembers = await this.db
        .select({
          id: profiles.id,
          fullName: profiles.fullName,
          email: profiles.email,
          department: profiles.department,
        })
        .from(profiles);
    } else {
      teamMembers = await this.db
        .select({
          id: profiles.id,
          fullName: profiles.fullName,
          email: profiles.email,
          department: profiles.department,
        })
        .from(profiles)
        .where(eq(profiles.managerId, userId));
    }

    if (teamMembers.length === 0) {
      return { periodStart, periodEnd, workingDayCount, targetHours, members: [] };
    }

    const memberIds = teamMembers.map((m) => m.id);

    // Get timesheets for this period
    const weekTimesheets = await this.db
      .select({
        id: timesheets.id,
        userId: timesheets.userId,
        status: timesheets.status,
      })
      .from(timesheets)
      .where(
        and(
          inArray(timesheets.userId, memberIds),
          eq(timesheets.periodStart, periodStart),
        ),
      );

    const timesheetByUser = new Map<string, { id: string; status: string }>();
    for (const ts of weekTimesheets) {
      timesheetByUser.set(ts.userId, { id: ts.id, status: ts.status });
    }

    // Get hours per day for each user's timesheet entries this week
    const tsIds = weekTimesheets.map((ts) => ts.id);
    let hoursPerUserDay: { userId: string; date: string; totalHours: string }[] = [];

    if (tsIds.length > 0) {
      hoursPerUserDay = await this.db
        .select({
          userId: timesheets.userId,
          date: timesheetEntries.date,
          totalHours: sql<string>`COALESCE(SUM(${timesheetEntries.hours}::numeric), 0)`,
        })
        .from(timesheetEntries)
        .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
        .where(
          and(
            inArray(timesheetEntries.timesheetId, tsIds),
            sql`${timesheetEntries.date} >= ${periodStart}`,
            sql`${timesheetEntries.date} <= ${periodEnd}`,
          ),
        )
        .groupBy(timesheets.userId, timesheetEntries.date);
    }

    // Build per-user hours map: userId -> { date -> hours }
    const userHoursMap = new Map<string, Map<string, number>>();
    for (const row of hoursPerUserDay) {
      if (!userHoursMap.has(row.userId)) {
        userHoursMap.set(row.userId, new Map());
      }
      userHoursMap.get(row.userId)!.set(row.date, parseFloat(row.totalHours));
    }

    // Build result for each member
    const members = teamMembers.map((member) => {
      const ts = timesheetByUser.get(member.id);
      const dayHours = userHoursMap.get(member.id) || new Map<string, number>();

      let totalHours = 0;
      let incompleteDays = 0;

      for (const wd of workingDays) {
        const hours = dayHours.get(wd) || 0;
        totalHours += hours;
        if (hours < 8) {
          incompleteDays++;
        }
      }

      return {
        id: member.id,
        fullName: member.fullName,
        email: member.email,
        department: member.department,
        status: ts ? ts.status : 'not_started',
        totalHours: Math.round(totalHours * 100) / 100,
        targetHours,
        incompleteDays,
        workingDayCount,
      };
    });

    return { periodStart, periodEnd, workingDayCount, targetHours, members };
  }

  async getPending(userId: string, search?: string) {
    // As manager: timesheets where submitter's manager_id = current user AND status = 'submitted'
    const managerPending = await this.db
      .select({
        timesheet: timesheets,
        employee: {
          id: profiles.id,
          fullName: profiles.fullName,
          email: profiles.email,
          department: profiles.department,
        },
      })
      .from(timesheets)
      .innerJoin(profiles, eq(timesheets.userId, profiles.id))
      .where(
        and(
          eq(profiles.managerId, userId),
          eq(timesheets.status, 'submitted'),
        ),
      );

    // As CC owner/approver: timesheets with entries on charge codes they own/approve AND status = 'submitted'
    const ccPending = await this.db
      .select({
        timesheet: timesheets,
        employee: {
          id: profiles.id,
          fullName: profiles.fullName,
          email: profiles.email,
          department: profiles.department,
        },
      })
      .from(timesheets)
      .innerJoin(profiles, eq(timesheets.userId, profiles.id))
      .innerJoin(
        timesheetEntries,
        eq(timesheetEntries.timesheetId, timesheets.id),
      )
      .innerJoin(
        chargeCodes,
        eq(timesheetEntries.chargeCodeId, chargeCodes.id),
      )
      .where(
        and(
          eq(timesheets.status, 'submitted'),
          sql`(${chargeCodes.ownerId} = ${userId} OR ${chargeCodes.approverId} = ${userId})`,
        ),
      )
      .groupBy(timesheets.id, profiles.id);

    // Deduplicate: merge manager and CC pending by timesheet ID
    const pendingMap = new Map<string, (typeof managerPending)[0]>();
    for (const r of managerPending) {
      pendingMap.set(r.timesheet.id, r);
    }
    for (const r of ccPending) {
      if (!pendingMap.has(r.timesheet.id)) {
        pendingMap.set(r.timesheet.id, r);
      }
    }
    let allPending = Array.from(pendingMap.values());

    // Apply search filter on employee name, email, or department
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      allPending = allPending.filter((r) => {
        const name = r.employee.fullName?.toLowerCase() ?? '';
        const email = r.employee.email.toLowerCase();
        const dept = r.employee.department?.toLowerCase() ?? '';
        return name.includes(term) || email.includes(term) || dept.includes(term);
      });
    }

    // Get total hours for each timesheet
    const allTimesheetIds = allPending.map((r) => r.timesheet.id);

    let hoursMap: Record<string, string> = {};
    let programsMap: Record<string, string[]> = {};
    if (allTimesheetIds.length > 0) {
      const hourRows = await this.db
        .select({
          timesheetId: timesheetEntries.timesheetId,
          totalHours: sql<string>`COALESCE(SUM(${timesheetEntries.hours}::numeric), 0)`,
        })
        .from(timesheetEntries)
        .where(inArray(timesheetEntries.timesheetId, allTimesheetIds))
        .groupBy(timesheetEntries.timesheetId);

      hoursMap = Object.fromEntries(
        hourRows.map((r) => [r.timesheetId, r.totalHours]),
      );

      // Get distinct program names for each timesheet from charge code entries
      const programRows = await this.db
        .selectDistinct({
          timesheetId: timesheetEntries.timesheetId,
          programName: chargeCodes.programName,
        })
        .from(timesheetEntries)
        .innerJoin(chargeCodes, eq(timesheetEntries.chargeCodeId, chargeCodes.id))
        .where(inArray(timesheetEntries.timesheetId, allTimesheetIds));

      for (const row of programRows) {
        const tsId = row.timesheetId;
        if (!programsMap[tsId]) programsMap[tsId] = [];
        if (row.programName && !programsMap[tsId].includes(row.programName)) {
          programsMap[tsId].push(row.programName);
        }
      }
    }

    const enrichRow = (r: (typeof allPending)[0]) => ({
      ...r.timesheet,
      employee: r.employee,
      totalHours: parseFloat(hoursMap[r.timesheet.id] || '0'),
      programs: programsMap[r.timesheet.id] || [],
    });

    return {
      pending: allPending.map(enrichRow),
    };
  }

  async approve(timesheetId: string, approverId: string, comment?: string) {
    const [ts] = await this.db
      .select()
      .from(timesheets)
      .where(eq(timesheets.id, timesheetId))
      .limit(1);

    if (!ts) throw new NotFoundException('Timesheet not found');

    if (ts.status !== 'submitted') {
      throw new BadRequestException(
        `Timesheet cannot be approved in status: ${ts.status}`,
      );
    }

    // Verify the approver is either the employee's manager or a CC owner/approver
    const [employee] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, ts.userId))
      .limit(1);

    const isManager = employee && employee.managerId === approverId;

    let isCCApprover = false;
    if (!isManager) {
      const ccMatch = await this.db
        .select({ id: chargeCodes.id })
        .from(timesheetEntries)
        .innerJoin(
          chargeCodes,
          eq(timesheetEntries.chargeCodeId, chargeCodes.id),
        )
        .where(
          and(
            eq(timesheetEntries.timesheetId, timesheetId),
            sql`(${chargeCodes.ownerId} = ${approverId} OR ${chargeCodes.approverId} = ${approverId})`,
          ),
        )
        .limit(1);

      isCCApprover = ccMatch.length > 0;
    }

    if (!isManager && !isCCApprover) {
      throw new ForbiddenException(
        'You are not authorized to approve this timesheet',
      );
    }

    // If period has ended, lock immediately; otherwise set to approved
    const today = new Date().toISOString().split('T')[0];
    const periodEnded = ts.periodEnd < today;

    const newStatus = periodEnded ? 'locked' : 'approved';

    await this.db
      .update(timesheets)
      .set({
        status: newStatus,
        ...(newStatus === 'locked' ? { lockedAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(timesheets.id, timesheetId));

    await this.db.insert(approvalLogs).values({
      timesheetId,
      approverId,
      action: 'approve',
      comment: comment || null,
      approvalType: 'manager',
    });

    // Teams notification (fire-and-forget)
    const statusLabel = newStatus === 'locked' ? 'Approved & Locked' : 'Approved (pending lock after period ends)';
    this.teamsWebhook
      .sendCard(
        `Timesheet ${statusLabel}`,
        `Timesheet approved for **${employee?.fullName ?? employee?.email ?? ts.userId}**`,
        [
          { name: 'Employee', value: employee?.fullName ?? employee?.email ?? ts.userId },
          { name: 'Period', value: `${ts.periodStart} - ${ts.periodEnd}` },
          { name: 'Status', value: statusLabel },
        ],
        '00c853',
      )
      .catch(() => {});

    return { status: newStatus };
  }

  async reject(timesheetId: string, approverId: string, comment: string) {
    const [ts] = await this.db
      .select()
      .from(timesheets)
      .where(eq(timesheets.id, timesheetId))
      .limit(1);

    if (!ts) throw new NotFoundException('Timesheet not found');

    if (ts.status !== 'submitted') {
      throw new BadRequestException(
        `Timesheet cannot be rejected in status: ${ts.status}`,
      );
    }

    // Verify the approver is either the employee's manager or a CC owner/approver
    const [employee] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, ts.userId))
      .limit(1);

    const isManager = employee && employee.managerId === approverId;

    let isCCApprover = false;
    if (!isManager) {
      const ccMatch = await this.db
        .select({ id: chargeCodes.id })
        .from(timesheetEntries)
        .innerJoin(
          chargeCodes,
          eq(timesheetEntries.chargeCodeId, chargeCodes.id),
        )
        .where(
          and(
            eq(timesheetEntries.timesheetId, timesheetId),
            sql`(${chargeCodes.ownerId} = ${approverId} OR ${chargeCodes.approverId} = ${approverId})`,
          ),
        )
        .limit(1);

      isCCApprover = ccMatch.length > 0;
    }

    if (!isManager && !isCCApprover) {
      throw new ForbiddenException(
        'You are not authorized to reject this timesheet',
      );
    }

    await this.db
      .update(timesheets)
      .set({
        status: 'rejected',
        rejectionComment: comment,
        updatedAt: new Date(),
      })
      .where(eq(timesheets.id, timesheetId));

    await this.db.insert(approvalLogs).values({
      timesheetId,
      approverId,
      action: 'reject',
      comment,
      approvalType: 'manager',
    });

    // Get employee info for Teams notification
    const [rejectedEmployee] = await this.db
      .select({ fullName: profiles.fullName, email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, ts.userId))
      .limit(1);

    this.teamsWebhook
      .sendCard(
        'Timesheet Rejected',
        `Timesheet for **${rejectedEmployee?.fullName ?? rejectedEmployee?.email ?? ts.userId}** was rejected.`,
        [
          { name: 'Employee', value: rejectedEmployee?.fullName ?? rejectedEmployee?.email ?? ts.userId },
          { name: 'Period', value: `${ts.periodStart} - ${ts.periodEnd}` },
          { name: 'Reason', value: comment },
        ],
        'ff0000', // red
      )
      .catch(() => {});

    return { status: 'rejected' };
  }

  async bulkApprove(timesheetIds: string[], approverId: string) {
    const results: { timesheetId: string; status: string; error?: string }[] =
      [];

    for (const id of timesheetIds) {
      try {
        const result = await this.approve(id, approverId);
        results.push({ timesheetId: id, status: result.status });
      } catch (error: any) {
        results.push({
          timesheetId: id,
          status: 'error',
          error: error.message,
        });
      }
    }

    return { results };
  }

  async getHistory(userId: string, pagination?: { limit?: number; offset?: number }) {
    const limit = Math.min(pagination?.limit ?? 100, 500);
    const offset = pagination?.offset ?? 0;

    // Fetch timesheet approval logs
    const logs = await this.db
      .select({
        log: approvalLogs,
        timesheet: {
          id: timesheets.id,
          periodStart: timesheets.periodStart,
          periodEnd: timesheets.periodEnd,
          status: timesheets.status,
        },
        employee: {
          id: profiles.id,
          fullName: profiles.fullName,
          email: profiles.email,
          department: profiles.department,
        },
      })
      .from(approvalLogs)
      .innerJoin(timesheets, eq(approvalLogs.timesheetId, timesheets.id))
      .innerJoin(profiles, eq(timesheets.userId, profiles.id))
      .where(eq(approvalLogs.approverId, userId))
      .orderBy(sql`${approvalLogs.approvedAt} DESC`);

    const timesheetHistory = logs.map((row) => ({
      id: row.log.id,
      timesheetId: row.log.timesheetId,
      action: row.log.action,
      comment: row.log.comment,
      approvalType: row.log.approvalType,
      approvedAt: row.log.approvedAt,
      timesheet: row.timesheet,
      employee: row.employee,
    }));

    // Fetch vacation approval/rejection history
    const employeeProfile = this.db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        email: profiles.email,
        department: profiles.department,
      })
      .from(profiles)
      .as('employee_profile');

    const vacationLogs = await this.db
      .select({
        vacation: vacationRequests,
        employee: {
          id: employeeProfile.id,
          fullName: employeeProfile.fullName,
          email: employeeProfile.email,
          department: employeeProfile.department,
        },
      })
      .from(vacationRequests)
      .innerJoin(employeeProfile, eq(vacationRequests.userId, employeeProfile.id))
      .where(
        and(
          eq(vacationRequests.approvedBy, userId),
          inArray(vacationRequests.status, ['approved', 'rejected']),
        ),
      );

    const vacationHistory = vacationLogs.map((row) => ({
      id: `vacation-${row.vacation.id}`,
      timesheetId: null,
      action: row.vacation.status === 'approved' ? 'approve' : 'reject',
      comment: null,
      approvalType: 'vacation',
      approvedAt: row.vacation.createdAt,
      timesheet: {
        id: null,
        periodStart: row.vacation.startDate,
        periodEnd: row.vacation.endDate,
        status: row.vacation.status,
      },
      employee: row.employee,
    }));

    // Merge and sort by date descending, then apply pagination
    const combined = [...timesheetHistory, ...vacationHistory].sort((a, b) => {
      const dateA = new Date(a.approvedAt).getTime();
      const dateB = new Date(b.approvedAt).getTime();
      return dateB - dateA;
    });

    return combined.slice(offset, offset + limit);
  }

  async getTimesheetDetail(timesheetId: string) {
    const [ts] = await this.db
      .select({
        timesheet: timesheets,
        employee: {
          id: profiles.id,
          fullName: profiles.fullName,
          email: profiles.email,
          department: profiles.department,
        },
      })
      .from(timesheets)
      .innerJoin(profiles, eq(timesheets.userId, profiles.id))
      .where(eq(timesheets.id, timesheetId))
      .limit(1);

    if (!ts) throw new NotFoundException('Timesheet not found');

    const entries = await this.db
      .select({
        entry: timesheetEntries,
        chargeCode: {
          id: chargeCodes.id,
          name: chargeCodes.name,
        },
      })
      .from(timesheetEntries)
      .innerJoin(
        chargeCodes,
        eq(timesheetEntries.chargeCodeId, chargeCodes.id),
      )
      .where(eq(timesheetEntries.timesheetId, timesheetId))
      .orderBy(chargeCodes.id, timesheetEntries.date);

    return {
      ...ts.timesheet,
      employee: ts.employee,
      entries: entries.map((e) => ({
        ...e.entry,
        chargeCode: e.chargeCode,
      })),
    };
  }
}
