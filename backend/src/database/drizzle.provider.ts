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
      max: 5,               // Conservative pool size for Supabase free-tier (20 connection limit)
      idle_timeout: 10,     // Release idle connections after 10s to prevent pool exhaustion
      max_lifetime: 300,    // Recycle connections after 5min to prevent stale handles
      connect_timeout: 15,
    });
    return drizzle(client, { schema });
  },
};
