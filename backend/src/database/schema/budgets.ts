import { pgTable, varchar, numeric, timestamp } from 'drizzle-orm/pg-core';
import { chargeCodes } from './charge-codes';

export const budgets = pgTable('budgets', {
  chargeCodeId: varchar('charge_code_id', { length: 50 })
    .primaryKey()
    .references(() => chargeCodes.id),
  budgetAmount: numeric('budget_amount', { precision: 12, scale: 2 }),
  actualSpent: numeric('actual_spent', { precision: 12, scale: 2 }).default(
    '0',
  ),
  forecastAtCompletion: numeric('forecast_at_completion', {
    precision: 12,
    scale: 2,
  }),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
});
