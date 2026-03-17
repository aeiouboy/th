import {
  pgTable,
  uuid,
  varchar,
  date,
  numeric,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { timesheets } from './timesheets';
import { chargeCodes } from './charge-codes';

export const timesheetEntries = pgTable('timesheet_entries', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  timesheetId: uuid('timesheet_id')
    .notNull()
    .references(() => timesheets.id),
  chargeCodeId: varchar('charge_code_id', { length: 50 })
    .notNull()
    .references(() => chargeCodes.id),
  date: date('date').notNull(),
  hours: numeric('hours', { precision: 4, scale: 2 }).notNull(),
  description: text('description'),
  calculatedCost: numeric('calculated_cost', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
