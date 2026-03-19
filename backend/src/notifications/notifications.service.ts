import { Injectable, Inject, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { notifications, profiles } from '../database/schema';
import { TeamsWebhookService } from './teams-webhook.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly teamsWebhookService: TeamsWebhookService,
  ) {}

  async create(
    type: (typeof notifications.$inferInsert)['type'],
    recipientId: string,
    subject: string,
    body: string,
  ) {
    const [notification] = await this.db
      .insert(notifications)
      .values({ type, recipientId, subject, body })
      .returning();

    // Fire-and-forget Teams delivery
    this.sendToTeams(type as string, recipientId, subject, body).catch((err) =>
      this.logger.error(`Teams delivery failed: ${err.message}`),
    );

    return notification;
  }

  private async sendToTeams(
    type: string,
    recipientId: string,
    subject: string,
    body: string,
  ): Promise<void> {
    // Look up recipient name for the card
    const [recipient] = await this.db
      .select({ fullName: profiles.fullName, email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, recipientId))
      .limit(1);

    const recipientName = recipient?.fullName ?? recipient?.email ?? 'Unknown';

    await this.teamsWebhookService.sendNotification({
      type,
      recipientName,
      subject,
      body,
    });
  }

  async findByUser(
    userId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean },
  ) {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    const conditions = [eq(notifications.recipientId, userId)];
    if (options?.unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    return this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getUnreadCount(userId: string) {
    const [result] = await this.db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, userId),
          eq(notifications.isRead, false),
        ),
      );
    return { count: result?.count ?? 0 };
  }

  async markAsRead(notificationId: string, userId: string) {
    const [notification] = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.recipientId !== userId) {
      throw new ForbiddenException('Cannot mark another user\'s notification as read');
    }

    const [updated] = await this.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, notificationId))
      .returning();

    return updated;
  }

  async markAllAsRead(userId: string) {
    await this.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.recipientId, userId),
          eq(notifications.isRead, false),
        ),
      );
    return { success: true };
  }
}
