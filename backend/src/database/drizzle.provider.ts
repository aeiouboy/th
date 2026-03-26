import { Provider } from '@nestjs/common';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');

export type DrizzleDB = PostgresJsDatabase<typeof schema>;

export const DrizzleProvider: Provider = {
  provide: DRIZZLE,
  useFactory: () => {
    const connectionString = process.env.SUPABASE_DB_URL;
    if (!connectionString) {
      throw new Error('SUPABASE_DB_URL environment variable is not set');
    }
    const client = postgres(connectionString, {
      prepare: false,
      max: 3,               // Conservative pool for Supabase free-tier (20 conn limit)
      idle_timeout: 20,     // Release idle connections after 20s
      max_lifetime: 120,    // Recycle connections every 2min to prevent stale handles from pooler
      connect_timeout: 10,  // Fail fast if can't connect
      fetch_types: false,   // Skip type fetching — reduces startup queries on pooler
      connection: {
        application_name: 'timesheet-backend',
      },
      onnotice: () => {},   // Suppress notice messages
    });
    return drizzle(client, { schema });
  },
};
