import { pgTable, varchar, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { chargeCodes } from './charge-codes';
import { profiles } from './profiles';

export const chargeCodeUsers = pgTable(
  'charge_code_users',
  {
    chargeCodeId: varchar('charge_code_id', { length: 50 })
      .notNull()
      .references(() => chargeCodes.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id),
  },
  (table) => [primaryKey({ columns: [table.chargeCodeId, table.userId] })],
);
