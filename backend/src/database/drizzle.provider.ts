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
      max: 8,               // Allow enough concurrent connections for parallel auth + queries
      idle_timeout: 20,     // Release idle connections after 20s
      max_lifetime: 1800,   // Recycle connections after 30min to prevent stale handles
      connect_timeout: 15,
    });
    return drizzle(client, { schema });
  },
};
