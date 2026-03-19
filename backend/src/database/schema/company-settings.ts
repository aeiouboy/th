import { pgTable, varchar } from 'drizzle-orm/pg-core';

export const companySettings = pgTable('company_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: varchar('value', { length: 500 }).notNull(),
  description: varchar('description', { length: 500 }),
});
