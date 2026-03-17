import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import {
  timesheets,
  timesheetEntries,
  profiles,
  approvalLogs,
  chargeCodes,
} from '../database/schema';

@Injectable()
export class ApprovalsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getPending(userId: string) {
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

    // As CC owner: timesheets with entries on charge codes they own/approve AND status = 'manager_approved'
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
          eq(timesheets.status, 'manager_approved'),
          sql`(${chargeCodes.ownerId} = ${userId} OR ${chargeCodes.approverId} = ${userId})`,
        ),
      )
      .groupBy(timesheets.id, profiles.id);

    // Get total hours for each timesheet
    const allTimesheetIds = [
      ...managerPending.map((r) => r.timesheet.id),
      ...ccPending.map((r) => r.timesheet.id),
    ];

    let hoursMap: Record<string, string> = {};
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
    }

    const enrichRow = (r: (typeof managerPending)[0]) => ({
      ...r.timesheet,
      employee: r.employee,
      totalHours: parseFloat(hoursMap[r.timesheet.id] || '0'),
    });

    return {
      asManager: managerPending.map(enrichRow),
      asCCOwner: ccPending.map(enrichRow),
    };
  }

  async approve(timesheetId: string, approverId: string, comment?: string) {
    const [ts] = await this.db
      .select()
      .from(timesheets)
      .where(eq(timesheets.id, timesheetId))
      .limit(1);

    if (!ts) throw new NotFoundException('Timesheet not found');

    // Determine approval type based on current status
    if (ts.status === 'submitted') {
      // Manager approval — verify approver is the employee's manager
      const [employee] = await this.db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ts.userId))
        .limit(1);

      if (!employee || employee.managerId !== approverId) {
        throw new ForbiddenException(
          'You are not the manager of this employee',
        );
      }

      await this.db
        .update(timesheets)
        .set({ status: 'manager_approved', updatedAt: new Date() })
        .where(eq(timesheets.id, timesheetId));

      await this.db.insert(approvalLogs).values({
        timesheetId,
        approverId,
        action: 'approve',
        comment: comment || null,
        approvalType: 'manager',
      });

      // Check if there are charge code approvers needed — if no CC entries need approval, auto-lock
      const ccApproversNeeded = await this.db
        .select({ id: chargeCodes.id })
        .from(timesheetEntries)
        .innerJoin(
          chargeCodes,
          eq(timesheetEntries.chargeCodeId, chargeCodes.id),
        )
        .where(
          and(
            eq(timesheetEntries.timesheetId, timesheetId),
            sql`(${chargeCodes.ownerId} IS NOT NULL OR ${chargeCodes.approverId} IS NOT NULL)`,
          ),
        )
        .limit(1);

      if (ccApproversNeeded.length === 0) {
        // No CC approvers needed, auto-lock
        await this.db
          .update(timesheets)
          .set({
            status: 'locked',
            lockedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(timesheets.id, timesheetId));
      }

      return { status: 'manager_approved' };
    } else if (ts.status === 'manager_approved') {
      // CC approver — verify approver owns/approves a charge code on this timesheet
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

      if (ccMatch.length === 0) {
        throw new ForbiddenException(
          'You are not a charge code approver for this timesheet',
        );
      }

      await this.db.insert(approvalLogs).values({
        timesheetId,
        approverId,
        action: 'approve',
        comment: comment || null,
        approvalType: 'charge_code',
      });

      // Check if all CC approvers have approved
      // Get distinct CC owners/approvers for entries in this timesheet
      const requiredApprovers = await this.db
        .selectDistinct({
          approverId: sql<string>`COALESCE(${chargeCodes.approverId}, ${chargeCodes.ownerId})`,
        })
        .from(timesheetEntries)
        .innerJoin(
          chargeCodes,
          eq(timesheetEntries.chargeCodeId, chargeCodes.id),
        )
        .where(
          and(
            eq(timesheetEntries.timesheetId, timesheetId),
            sql`(${chargeCodes.ownerId} IS NOT NULL OR ${chargeCodes.approverId} IS NOT NULL)`,
          ),
        );

      const requiredIds = requiredApprovers
        .map((r) => r.approverId)
        .filter(Boolean);

      const existingApprovals = await this.db
        .selectDistinct({ approverId: approvalLogs.approverId })
        .from(approvalLogs)
        .where(
          and(
            eq(approvalLogs.timesheetId, timesheetId),
            eq(approvalLogs.approvalType, 'charge_code'),
            eq(approvalLogs.action, 'approve'),
          ),
        );

      const approvedIds = existingApprovals.map((r) => r.approverId);
      const allApproved = requiredIds.every((id) => approvedIds.includes(id));

      if (allApproved) {
        await this.db
          .update(timesheets)
          .set({
            status: 'locked',
            lockedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(timesheets.id, timesheetId));

        return { status: 'locked' };
      }

      await this.db
        .update(timesheets)
        .set({ status: 'cc_approved', updatedAt: new Date() })
        .where(eq(timesheets.id, timesheetId));

      return { status: 'cc_approved' };
    } else {
      throw new BadRequestException(
        `Timesheet cannot be approved in status: ${ts.status}`,
      );
    }
  }

  async reject(timesheetId: string, approverId: string, comment: string) {
    const [ts] = await this.db
      .select()
      .from(timesheets)
      .where(eq(timesheets.id, timesheetId))
      .limit(1);

    if (!ts) throw new NotFoundException('Timesheet not found');

    if (ts.status !== 'submitted' && ts.status !== 'manager_approved') {
      throw new BadRequestException(
        `Timesheet cannot be rejected in status: ${ts.status}`,
      );
    }

    const approvalType =
      ts.status === 'submitted' ? 'manager' : 'charge_code';

    // Verify the approver has authority
    if (approvalType === 'manager') {
      const [employee] = await this.db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ts.userId))
        .limit(1);

      if (!employee || employee.managerId !== approverId) {
        throw new ForbiddenException(
          'You are not the manager of this employee',
        );
      }
    } else {
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

      if (ccMatch.length === 0) {
        throw new ForbiddenException(
          'You are not a charge code approver for this timesheet',
        );
      }
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
      approvalType,
    });

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

  async getHistory(userId: string) {
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

    return logs.map((row) => ({
      id: row.log.id,
      timesheetId: row.log.timesheetId,
      action: row.log.action,
      comment: row.log.comment,
      approvalType: row.log.approvalType,
      approvedAt: row.log.approvedAt,
      timesheet: row.timesheet,
      employee: row.employee,
    }));
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
