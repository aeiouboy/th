import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, like, ilike, sql, inArray } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { chargeCodes, chargeCodeUsers, profiles } from '../database/schema';
import { CreateChargeCodeDto, ChargeCodeLevel } from './dto/create-charge-code.dto';
import { UpdateChargeCodeDto } from './dto/update-charge-code.dto';
import { UpdateAccessDto } from './dto/update-access.dto';

const LEVEL_PREFIX: Record<string, string> = {
  program: 'PRG',
  project: 'PRJ',
  activity: 'ACT',
  task: 'TSK',
};

const LEVEL_HIERARCHY: Record<string, string | null> = {
  program: null,
  project: 'program',
  activity: 'project',
  task: 'activity',
};

@Injectable()
export class ChargeCodesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAll(filters?: {
    level?: string;
    status?: string;
    billable?: string;
    search?: string;
  }) {
    let query = this.db.select().from(chargeCodes).$dynamic();

    const conditions: any[] = [];

    if (filters?.level) {
      conditions.push(eq(chargeCodes.level, filters.level as any));
    }

    if (filters?.billable === 'true') {
      conditions.push(eq(chargeCodes.isBillable, true));
    } else if (filters?.billable === 'false') {
      conditions.push(eq(chargeCodes.isBillable, false));
    }

    if (filters?.search) {
      conditions.push(
        ilike(chargeCodes.name, `%${filters.search}%`),
      );
    }

    if (filters?.status === 'active') {
      conditions.push(
        sql`(${chargeCodes.validTo} IS NULL OR ${chargeCodes.validTo} >= CURRENT_DATE)`,
      );
    } else if (filters?.status === 'expired') {
      conditions.push(
        sql`${chargeCodes.validTo} < CURRENT_DATE`,
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query;
  }

  async findMyChargeCodes(userId: string) {
    const assigned = await this.db
      .select({ chargeCodeId: chargeCodeUsers.chargeCodeId })
      .from(chargeCodeUsers)
      .where(eq(chargeCodeUsers.userId, userId));

    const assignedIds = assigned.map((a) => a.chargeCodeId);

    if (assignedIds.length === 0) {
      return [];
    }

    return this.db
      .select()
      .from(chargeCodes)
      .where(inArray(chargeCodes.id, assignedIds));
  }

  async findById(id: string) {
    const [code] = await this.db
      .select()
      .from(chargeCodes)
      .where(eq(chargeCodes.id, id))
      .limit(1);
    if (!code) throw new NotFoundException('Charge code not found');

    const users = await this.db
      .select({
        userId: chargeCodeUsers.userId,
        email: profiles.email,
        fullName: profiles.fullName,
      })
      .from(chargeCodeUsers)
      .innerJoin(profiles, eq(chargeCodeUsers.userId, profiles.id))
      .where(eq(chargeCodeUsers.chargeCodeId, id));

    return { ...code, assignedUsers: users };
  }

  async findChildren(id: string) {
    return this.db
      .select()
      .from(chargeCodes)
      .where(eq(chargeCodes.parentId, id));
  }

  async create(dto: CreateChargeCodeDto) {
    // Validate parent-child hierarchy
    if (dto.parentId) {
      const expectedParentLevel = LEVEL_HIERARCHY[dto.level];
      if (!expectedParentLevel) {
        throw new BadRequestException('Programs cannot have a parent');
      }
      const parent = await this.findByIdRaw(dto.parentId);
      if (parent.level !== expectedParentLevel) {
        throw new BadRequestException(
          `A ${dto.level} must have a ${expectedParentLevel} as parent`,
        );
      }
    } else if (dto.level !== ChargeCodeLevel.Program) {
      throw new BadRequestException(
        `A ${dto.level} must have a parent`,
      );
    }

    const id = await this.generateId(dto.level);
    const path = dto.parentId
      ? await this.buildPath(dto.parentId, id)
      : id;

    const [created] = await this.db
      .insert(chargeCodes)
      .values({
        id,
        name: dto.name,
        parentId: dto.parentId || null,
        path,
        level: dto.level as any,
        programName: dto.programName,
        costCenter: dto.costCenter,
        activityCategory: dto.activityCategory,
        budgetAmount: dto.budgetAmount?.toString(),
        ownerId: dto.ownerId,
        approverId: dto.approverId,
        validFrom: dto.validFrom,
        validTo: dto.validTo,
        isBillable: dto.isBillable ?? true,
      })
      .returning();

    return created;
  }

  async update(id: string, dto: UpdateChargeCodeDto) {
    await this.findByIdRaw(id);

    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.programName !== undefined) updateData.programName = dto.programName;
    if (dto.costCenter !== undefined) updateData.costCenter = dto.costCenter;
    if (dto.activityCategory !== undefined) updateData.activityCategory = dto.activityCategory;
    if (dto.budgetAmount !== undefined) updateData.budgetAmount = dto.budgetAmount?.toString();
    if (dto.ownerId !== undefined) updateData.ownerId = dto.ownerId;
    if (dto.approverId !== undefined) updateData.approverId = dto.approverId;
    if (dto.validFrom !== undefined) updateData.validFrom = dto.validFrom;
    if (dto.validTo !== undefined) updateData.validTo = dto.validTo;
    if (dto.isBillable !== undefined) updateData.isBillable = dto.isBillable;

    const [updated] = await this.db
      .update(chargeCodes)
      .set(updateData)
      .where(eq(chargeCodes.id, id))
      .returning();

    return updated;
  }

  async updateAccess(chargeCodeId: string, dto: UpdateAccessDto) {
    await this.findByIdRaw(chargeCodeId);

    if (dto.removeUserIds?.length) {
      for (const userId of dto.removeUserIds) {
        await this.db
          .delete(chargeCodeUsers)
          .where(
            and(
              eq(chargeCodeUsers.chargeCodeId, chargeCodeId),
              eq(chargeCodeUsers.userId, userId),
            ),
          );
      }
    }

    if (dto.addUserIds?.length) {
      const values = dto.addUserIds.map((userId) => ({
        chargeCodeId,
        userId,
      }));
      await this.db
        .insert(chargeCodeUsers)
        .values(values)
        .onConflictDoNothing();
    }

    return this.findById(chargeCodeId);
  }

  async getTree() {
    const all = await this.db.select().from(chargeCodes);
    return this.buildTree(all);
  }

  private buildTree(items: any[], parentId: string | null = null): any[] {
    return items
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: this.buildTree(items, item.id),
      }));
  }

  private async findByIdRaw(id: string) {
    const [code] = await this.db
      .select()
      .from(chargeCodes)
      .where(eq(chargeCodes.id, id))
      .limit(1);
    if (!code) throw new NotFoundException('Charge code not found');
    return code;
  }

  private async generateId(level: string): Promise<string> {
    const prefix = LEVEL_PREFIX[level];
    const existing = await this.db
      .select({ id: chargeCodes.id })
      .from(chargeCodes)
      .where(like(chargeCodes.id, `${prefix}-%`));

    const maxNum = existing.reduce((max, row) => {
      const num = parseInt(row.id.split('-')[1], 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);

    return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
  }

  private async buildPath(parentId: string, childId: string): Promise<string> {
    const parent = await this.findByIdRaw(parentId);
    return parent.path ? `${parent.path}/${childId}` : `${parentId}/${childId}`;
  }
}
