import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { companySettings } from '../database/schema';

@Injectable()
export class CompanySettingsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async get(key: string) {
    const [row] = await this.db
      .select()
      .from(companySettings)
      .where(eq(companySettings.key, key))
      .limit(1);
    if (!row) throw new NotFoundException(`Setting '${key}' not found`);
    return row;
  }

  async set(key: string, value: string) {
    const [row] = await this.db
      .insert(companySettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: companySettings.key,
        set: { value },
      })
      .returning();
    return row;
  }
}
