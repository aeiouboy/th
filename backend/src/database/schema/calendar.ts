import {
  pgTable,
  serial,
  date,
  boolean,
  varchar,
} from 'drizzle-orm/pg-core';

export const calendar = pgTable('calendar', {
  id: serial('id').primaryKey(),
  date: date('date').unique().notNull(),
  isWeekend: boolean('is_weekend').default(false),
  isHoliday: boolean('is_holiday').default(false),
  holidayName: varchar('holiday_name', { length: 255 }),
  countryCode: varchar('country_code', { length: 2 }).default('TH'),
});
