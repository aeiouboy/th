import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'employee',
  'charge_manager',
  'pmo',
  'finance',
  'admin',
]);

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }),
  jobGrade: varchar('job_grade', { length: 50 }),
  managerId: uuid('manager_id').references((): any => profiles.id),
  role: userRoleEnum('role').default('employee').notNull(),
  department: varchar('department', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
