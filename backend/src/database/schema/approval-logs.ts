import {
  pgTable,
  serial,
  uuid,
  text,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { timesheets } from './timesheets';
import { profiles } from './profiles';

export const approvalActionEnum = pgEnum('approval_action', [
  'approve',
  'reject',
]);

export const approvalTypeEnum = pgEnum('approval_type', [
  'manager',
  'charge_code',
]);

export const approvalLogs = pgTable('approval_logs', {
  id: serial('id').primaryKey(),
  timesheetId: uuid('timesheet_id')
    .notNull()
    .references(() => timesheets.id),
  approverId: uuid('approver_id')
    .notNull()
    .references(() => profiles.id),
  action: approvalActionEnum('action').notNull(),
  comment: text('comment'),
  approvedAt: timestamp('approved_at').defaultNow().notNull(),
  approvalType: approvalTypeEnum('approval_type').notNull(),
});
