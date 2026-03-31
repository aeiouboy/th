import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { profiles } from './profiles';
import { chargeCodes } from './charge-codes';

export const chargeCodeRequestStatusEnum = pgEnum(
  'charge_code_request_status',
  ['pending', 'approved', 'rejected'],
);

export const chargeCodeRequests = pgTable('charge_code_requests', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  requesterId: uuid('requester_id')
    .notNull()
    .references(() => profiles.id),
  chargeCodeId: varchar('charge_code_id', { length: 50 })
    .notNull()
    .references(() => chargeCodes.id),
  reason: text('reason'),
  status: chargeCodeRequestStatusEnum('status').default('pending'),
  reviewedBy: uuid('reviewed_by').references(() => profiles.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
