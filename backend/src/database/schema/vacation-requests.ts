import {
  pgTable,
  serial,
  uuid,
  date,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const vacationStatusEnum = pgEnum('vacation_status', [
  'pending',
  'approved',
  'rejected',
]);

export const vacationRequests = pgTable('vacation_requests', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: vacationStatusEnum('vacation_status').default('pending').notNull(),
  approvedBy: uuid('approved_by').references(() => profiles.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
