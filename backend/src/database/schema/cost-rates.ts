import {
  pgTable,
  serial,
  varchar,
  numeric,
  date,
} from 'drizzle-orm/pg-core';

export const costRates = pgTable('cost_rates', {
  id: serial('id').primaryKey(),
  jobGrade: varchar('job_grade', { length: 50 }).notNull(),
  hourlyRate: numeric('hourly_rate', { precision: 10, scale: 2 }).notNull(),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),
});
