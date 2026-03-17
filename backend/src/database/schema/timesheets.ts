import {
  pgTable,
  uuid,
  date,
  timestamp,
  text,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { profiles } from './profiles';

export const timesheetStatusEnum = pgEnum('timesheet_status', [
  'draft',
  'submitted',
  'manager_approved',
  'cc_approved',
  'locked',
  'rejected',
]);

export const timesheets = pgTable('timesheets', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  status: timesheetStatusEnum('status').default('draft').notNull(),
  submittedAt: timestamp('submitted_at'),
  lockedAt: timestamp('locked_at'),
  rejectionComment: text('rejection_comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
