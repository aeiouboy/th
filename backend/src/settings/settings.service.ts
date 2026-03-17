import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { systemSettings } from '../database/schema';

@Injectable()
export class SettingsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.db.select().from(systemSettings);
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async get(key: string): Promise<string> {
    const [row] = await this.db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);
    if (!row) {
      if (key === 'default_currency') return 'THB';
      return '';
    }
    return row.value;
  }

  async set(key: string, value: string): Promise<{ key: string; value: string }> {
    const [row] = await this.db
      .insert(systemSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: new Date() },
      })
      .returning();
    return { key: row.key, value: row.value };
  }
}
