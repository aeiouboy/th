import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, ne, inArray, sql, sum, gte, lte, count } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import {
  timesheets,
  timesheetEntries,
  profiles,
  chargeCodes,
  budgets,
  calendar,
} from '../database/schema';

export interface Notification {
  id: string;
  type:
    | 'timesheet_reminder'
    | 'approval_reminder'
    | 'manager_summary'
    | 'weekly_insights';
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  createdAt: Date;
}

@Injectable()
export class IntegrationNotificationService {
  private readonly logger = new Logger(IntegrationNotificationService.name);
  private notifications: Notification[] = [];
  private notificationCounter = 0;

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  getNotifications(): Notification[] {
    return this.notifications;
  }

  clearNotifications(): void {
    this.notifications = [];
  }

  async sendTimesheetReminders(): Promise<Notification[]> {
    this.logger.log('Generating timesheet reminders');

    const now = new Date();
    const day = now.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diffToMonday);
    const weekStart = monday.toISOString().split('T')[0];
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const weekEnd = sunday.toISOString().split('T')[0];

    // Get working days this week from calendar
    const workingDaysResult = await this.db
      .select({ count: count() })
      .from(calendar)
      .where(
        and(
          gte(calendar.date, weekStart),
          lte(calendar.date, weekEnd),
          eq(calendar.isWeekend, false),
          eq(calendar.isHoliday, false),
        ),
      );
    const expectedWorkingDays = Number(workingDaysResult[0]?.count ?? 5);
    const expectedHours = expectedWorkingDays * 8;

    // How many working days have passed so far this week?
    const today = now.toISOString().split('T')[0];
    const passedWorkingDays = await this.db
      .select({ count: count() })
      .from(calendar)
      .where(
        and(
          gte(calendar.date, weekStart),
          lte(calendar.date, today),
          eq(calendar.isWeekend, false),
          eq(calendar.isHoliday, false),
        ),
      );
    const daysPassed = Number(passedWorkingDays[0]?.count ?? 0);
    const expectedHoursSoFar = daysPassed * 8;

    const allUsers = await this.db
      .select({
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.fullName,
      })
      .from(profiles);

    // Get timesheets for the current week
    const weekTimesheets = await this.db
      .select({
        userId: timesheets.userId,
        timesheetId: timesheets.id,
        status: timesheets.status,
      })
      .from(timesheets)
      .where(eq(timesheets.periodStart, weekStart));

    const tsMap = new Map(weekTimesheets.map((t) => [t.userId, t]));

    // Get hours per user for the week
    const hoursPerUser = await this.db
      .select({
        userId: timesheets.userId,
        totalHours: sum(timesheetEntries.hours).as('total_hours'),
      })
      .from(timesheetEntries)
      .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
      .where(eq(timesheets.periodStart, weekStart))
      .groupBy(timesheets.userId);

    const hoursMap = new Map(
      hoursPerUser.map((h) => [h.userId, Number(h.totalHours ?? 0)]),
    );

    const sent: Notification[] = [];

    for (const user of allUsers) {
      const ts = tsMap.get(user.id);
      const logged = hoursMap.get(user.id) ?? 0;

      // Skip users who have already submitted or are locked
      if (
        ts &&
        ts.status !== 'draft' &&
        ts.status !== 'rejected'
      ) {
        continue;
      }

      // Check if hours are less than expected so far
      if (logged < expectedHoursSoFar) {
        const missing = expectedHoursSoFar - logged;
        const notification = this.createNotification(
          'timesheet_reminder',
          user,
          'Timesheet Reminder',
          `You have logged ${logged}h out of ${expectedHoursSoFar}h expected so far this week (${weekStart} to ${weekEnd}). ` +
            `You are missing ${missing}h. Please complete your timesheet.`,
        );
        sent.push(notification);
      }
    }

    this.logger.log(`Sent ${sent.length} timesheet reminders`);
    return sent;
  }

  async sendApprovalReminders(): Promise<Notification[]> {
    this.logger.log('Generating approval reminders');

    // Find timesheets awaiting manager approval
    const pendingManager = await this.db
      .select({
        timesheetId: timesheets.id,
        employeeId: timesheets.userId,
        periodStart: timesheets.periodStart,
        employeeName: profiles.fullName,
        managerId: profiles.managerId,
      })
      .from(timesheets)
      .innerJoin(profiles, eq(timesheets.userId, profiles.id))
      .where(eq(timesheets.status, 'submitted'));

    // Group by manager
    const byManager = new Map<
      string,
      { employeeName: string; periodStart: string }[]
    >();
    for (const row of pendingManager) {
      if (!row.managerId) continue;
      const list = byManager.get(row.managerId) ?? [];
      list.push({
        employeeName: row.employeeName ?? 'Unknown',
        periodStart: row.periodStart,
      });
      byManager.set(row.managerId, list);
    }

    const sent: Notification[] = [];

    for (const [managerId, pending] of byManager) {
      const [manager] = await this.db
        .select({
          id: profiles.id,
          email: profiles.email,
          fullName: profiles.fullName,
        })
        .from(profiles)
        .where(eq(profiles.id, managerId))
        .limit(1);

      if (!manager) continue;

      const lines = pending.map(
        (p) => `- ${p.employeeName} (week of ${p.periodStart})`,
      );
      const notification = this.createNotification(
        'approval_reminder',
        manager,
        `${pending.length} Timesheet(s) Awaiting Your Approval`,
        `You have ${pending.length} timesheet(s) pending your approval:\n${lines.join('\n')}`,
      );
      sent.push(notification);
    }

    this.logger.log(`Sent ${sent.length} approval reminders`);
    return sent;
  }

  async sendManagerSummary(): Promise<Notification[]> {
    this.logger.log('Generating weekly manager summaries');

    const now = new Date();
    const day = now.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diffToMonday);
    const weekStart = monday.toISOString().split('T')[0];

    // Get all managers (users who are referenced as managerId)
    const managers = await this.db
      .selectDistinct({ managerId: profiles.managerId })
      .from(profiles)
      .where(sql`${profiles.managerId} IS NOT NULL`);

    const sent: Notification[] = [];

    for (const { managerId } of managers) {
      if (!managerId) continue;

      const [manager] = await this.db
        .select({
          id: profiles.id,
          email: profiles.email,
          fullName: profiles.fullName,
        })
        .from(profiles)
        .where(eq(profiles.id, managerId))
        .limit(1);

      if (!manager) continue;

      // Get direct reports
      const reports = await this.db
        .select({
          id: profiles.id,
          fullName: profiles.fullName,
          email: profiles.email,
        })
        .from(profiles)
        .where(eq(profiles.managerId, managerId));

      if (reports.length === 0) continue;

      const reportIds = reports.map((r) => r.id);

      // Get timesheet statuses for the week
      const tsStatuses = await this.db
        .select({
          userId: timesheets.userId,
          status: timesheets.status,
        })
        .from(timesheets)
        .where(
          and(
            inArray(timesheets.userId, reportIds),
            eq(timesheets.periodStart, weekStart),
          ),
        );

      const statusMap = new Map(tsStatuses.map((t) => [t.userId, t.status]));

      const lines: string[] = [];
      let completed = 0;
      let pending = 0;
      let notStarted = 0;

      for (const report of reports) {
        const status = statusMap.get(report.id);
        if (!status || status === 'draft') {
          notStarted++;
          lines.push(
            `- ${report.fullName ?? report.email}: Not submitted`,
          );
        } else if (status === 'submitted') {
          pending++;
          lines.push(
            `- ${report.fullName ?? report.email}: Submitted (awaiting approval)`,
          );
        } else {
          completed++;
          lines.push(
            `- ${report.fullName ?? report.email}: ${status}`,
          );
        }
      }

      const notification = this.createNotification(
        'manager_summary',
        manager,
        `Weekly Team Summary (${weekStart})`,
        `Team completion for week of ${weekStart}:\n` +
          `- Completed/Approved: ${completed}\n` +
          `- Pending approval: ${pending}\n` +
          `- Not submitted: ${notStarted}\n\n` +
          `Details:\n${lines.join('\n')}`,
      );
      sent.push(notification);
    }

    this.logger.log(`Sent ${sent.length} manager summaries`);
    return sent;
  }

  async sendWeeklyInsights(): Promise<Notification[]> {
    this.logger.log('Generating weekly insights');

    const now = new Date();
    const day = now.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diffToMonday - 7); // Last week
    const weekStart = monday.toISOString().split('T')[0];
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const weekEnd = sunday.toISOString().split('T')[0];

    // Total hours logged last week
    const totalResult = await this.db
      .select({
        totalHours: sum(timesheetEntries.hours).as('total_hours'),
      })
      .from(timesheetEntries)
      .where(
        and(
          gte(timesheetEntries.date, weekStart),
          lte(timesheetEntries.date, weekEnd),
        ),
      );
    const totalHours = Number(totalResult[0]?.totalHours ?? 0);

    // Billable vs total
    const billableResult = await this.db
      .select({
        totalHours: sum(timesheetEntries.hours).as('total_hours'),
      })
      .from(timesheetEntries)
      .innerJoin(
        chargeCodes,
        eq(timesheetEntries.chargeCodeId, chargeCodes.id),
      )
      .where(
        and(
          gte(timesheetEntries.date, weekStart),
          lte(timesheetEntries.date, weekEnd),
          eq(chargeCodes.isBillable, true),
        ),
      );
    const billableHours = Number(billableResult[0]?.totalHours ?? 0);
    const chargeabilityRate =
      totalHours > 0
        ? Math.round((billableHours / totalHours) * 10000) / 100
        : 0;

    // Budget alerts
    const budgetRows = await this.db
      .select({
        chargeCodeId: budgets.chargeCodeId,
        name: chargeCodes.name,
        budgetAmount: budgets.budgetAmount,
        actualSpent: budgets.actualSpent,
      })
      .from(budgets)
      .innerJoin(chargeCodes, eq(budgets.chargeCodeId, chargeCodes.id));

    const overruns = budgetRows.filter(
      (r) => Number(r.actualSpent ?? 0) > Number(r.budgetAmount ?? 0),
    );

    const body =
      `Weekly Insights for ${weekStart} to ${weekEnd}:\n\n` +
      `- Total hours logged: ${totalHours}h\n` +
      `- Billable hours: ${billableHours}h\n` +
      `- Chargeability rate: ${chargeabilityRate}%\n` +
      `- Budget overruns: ${overruns.length}\n` +
      (overruns.length > 0
        ? '\nOver-budget charge codes:\n' +
          overruns
            .map(
              (r) =>
                `- ${r.name} (${r.chargeCodeId}): $${Number(r.actualSpent ?? 0).toLocaleString()} / $${Number(r.budgetAmount ?? 0).toLocaleString()}`,
            )
            .join('\n')
        : '');

    // Send to admin/pmo/finance users (Program Owner, Cost Center Owner roles)
    const recipients = await this.db
      .select({
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.fullName,
      })
      .from(profiles)
      .where(inArray(profiles.role, ['pmo', 'finance', 'admin']));

    const sent: Notification[] = [];
    for (const recipient of recipients) {
      const notification = this.createNotification(
        'weekly_insights',
        recipient,
        `Weekly Insights (${weekStart})`,
        body,
      );
      sent.push(notification);
    }

    this.logger.log(`Sent ${sent.length} weekly insights`);
    return sent;
  }

  async sendAllNotifications(): Promise<{
    timesheetReminders: number;
    approvalReminders: number;
    managerSummaries: number;
    weeklyInsights: number;
  }> {
    const [tr, ar, ms, wi] = await Promise.all([
      this.sendTimesheetReminders(),
      this.sendApprovalReminders(),
      this.sendManagerSummary(),
      this.sendWeeklyInsights(),
    ]);

    return {
      timesheetReminders: tr.length,
      approvalReminders: ar.length,
      managerSummaries: ms.length,
      weeklyInsights: wi.length,
    };
  }

  private createNotification(
    type: Notification['type'],
    recipient: { id: string; email: string; fullName: string | null },
    subject: string,
    body: string,
  ): Notification {
    const notification: Notification = {
      id: `notif-${++this.notificationCounter}`,
      type,
      recipientId: recipient.id,
      recipientEmail: recipient.email,
      recipientName: recipient.fullName ?? recipient.email,
      subject,
      body,
      createdAt: new Date(),
    };

    this.notifications.push(notification);

    this.logger.log(
      `[${type}] To: ${recipient.fullName ?? recipient.email} — ${subject}`,
    );

    return notification;
  }
}
