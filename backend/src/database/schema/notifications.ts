import { pgTable, pgEnum, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const notificationTypeEnum = pgEnum('notification_type', [
  'timesheet_reminder',
  'approval_reminder',
  'manager_summary',
  'weekly_insights',
]);

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: notificationTypeEnum('type').notNull(),
  recipientId: uuid('recipient_id').notNull().references(() => profiles.id),
  subject: varchar('subject', { length: 500 }).notNull(),
  body: text('body').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  readAt: timestamp('read_at'),
});
