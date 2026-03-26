import {
  pgTable,
  varchar,
  uuid,
  numeric,
  date,
  boolean,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const chargeCodeLevelEnum = pgEnum('charge_code_level', [
  'program',
  'project',
  'activity',
  'task',
]);

export const chargeCodes = pgTable('charge_codes', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  parentId: varchar('parent_id', { length: 50 }).references(
    (): any => chargeCodes.id,
  ),
  path: varchar('path', { length: 1000 }),
  level: chargeCodeLevelEnum('level'),
  programName: varchar('program_name', { length: 255 }),
  costCenter: varchar('cost_center', { length: 100 }),
  activityCategory: varchar('activity_category', { length: 100 }),
  budgetAmount: numeric('budget_amount', { precision: 12, scale: 2 }),
  ownerId: uuid('owner_id').references(() => profiles.id),
  approverId: uuid('approver_id').references(() => profiles.id),
  validFrom: date('valid_from'),
  validTo: date('valid_to'),
  isBillable: boolean('is_billable').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_charge_codes_parent').on(table.parentId),
  index('idx_charge_codes_level').on(table.level),
  index('idx_charge_codes_owner').on(table.ownerId),
  index('idx_charge_codes_approver').on(table.approverId),
]);
