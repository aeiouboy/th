import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { costRates } from '../database/schema';

@Injectable()
export class CostRatesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAll() {
    return this.db.select().from(costRates).orderBy(costRates.jobGrade, costRates.effectiveFrom);
  }

  async create(data: {
    jobGrade: string;
    hourlyRate: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
  }) {
    const [created] = await this.db
      .insert(costRates)
      .values(data)
      .returning();
    return created;
  }

  async update(
    id: number,
    data: {
      jobGrade?: string;
      hourlyRate?: string;
      effectiveFrom?: string;
      effectiveTo?: string | null;
    },
  ) {
    const [updated] = await this.db
      .update(costRates)
      .set(data)
      .where(eq(costRates.id, id))
      .returning();
    if (!updated) throw new NotFoundException('Cost rate not found');
    return updated;
  }

  async remove(id: number) {
    const [deleted] = await this.db
      .delete(costRates)
      .where(eq(costRates.id, id))
      .returning();
    if (!deleted) throw new NotFoundException('Cost rate not found');
    return { deleted: true };
  }
}
