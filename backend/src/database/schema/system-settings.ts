import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';

export const systemSettings = pgTable('system_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: varchar('value', { length: 500 }).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
