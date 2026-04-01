import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, like, ilike, sql, inArray, sum } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { chargeCodes, chargeCodeUsers, chargeCodeRequests, profiles, budgets, timesheetEntries, timesheets } from '../database/schema';
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
    limit?: number;
    offset?: number;
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
      const escaped = filters.search.replace(/[%_\\]/g, '\\$&');
      conditions.push(
        ilike(chargeCodes.name, `%${escaped}%`),
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

    const resultLimit = filters?.limit ?? 100;
    const resultOffset = filters?.offset ?? 0;

    query = query.limit(resultLimit).offset(resultOffset) as any;

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
      .where(inArray(chargeCodes.id, assignedIds))
      .limit(500);
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

    // Fetch actual spent from budgets table
    const [budget] = await this.db
      .select({
        actualSpent: budgets.actualSpent,
        forecastAtCompletion: budgets.forecastAtCompletion,
      })
      .from(budgets)
      .where(eq(budgets.chargeCodeId, id))
      .limit(1);

    const ownerName = code.ownerId
      ? (await this.db.select({ fullName: profiles.fullName }).from(profiles).where(eq(profiles.id, code.ownerId)).limit(1))[0]?.fullName
      : null;
    const approverName = code.approverId
      ? (await this.db.select({ fullName: profiles.fullName }).from(profiles).where(eq(profiles.id, code.approverId)).limit(1))[0]?.fullName
      : null;

    return {
      ...code,
      actualSpent: Number(budget?.actualSpent ?? 0),
      forecastAtCompletion: budget?.forecastAtCompletion ? Number(budget.forecastAtCompletion) : null,
      ownerName,
      approverName,
      assignedUsers: users,
    };
  }

  async findChildren(id: string) {
    return this.db
      .select()
      .from(chargeCodes)
      .where(eq(chargeCodes.parentId, id))
      .limit(500);
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

    const id = dto.id?.trim() || await this.generateId(dto.level);
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

  async updateAccess(chargeCodeId: string, dto: UpdateAccessDto, callerId: string) {
    const code = await this.findByIdRaw(chargeCodeId);

    if (code.ownerId !== callerId && code.approverId !== callerId) {
      const [caller] = await this.db
        .select({ role: profiles.role })
        .from(profiles)
        .where(eq(profiles.id, callerId))
        .limit(1);
      if (caller?.role !== 'admin') {
        throw new ForbiddenException(
          'Only the charge code owner, approver, or admin can modify access',
        );
      }
    }

    // Collect this charge code + all descendant IDs for cascading
    const descendantIds = await this.findDescendantIds(chargeCodeId);
    const allChargeCodeIds = [chargeCodeId, ...descendantIds];

    if (dto.removeUserIds?.length) {
      await this.db
        .delete(chargeCodeUsers)
        .where(
          and(
            inArray(chargeCodeUsers.chargeCodeId, allChargeCodeIds),
            inArray(chargeCodeUsers.userId, dto.removeUserIds),
          ),
        );
    }

    if (dto.addUserIds?.length) {
      const values = allChargeCodeIds.flatMap((ccId) =>
        dto.addUserIds!.map((userId) => ({
          chargeCodeId: ccId,
          userId,
        })),
      );
      await this.db
        .insert(chargeCodeUsers)
        .values(values)
        .onConflictDoNothing();
    }

    return this.findById(chargeCodeId);
  }

  async getBudgetDetail(id: string) {
    const code = await this.findByIdRaw(id);

    // Get all descendants using recursive approach
    const allCodes = await this.db.select().from(chargeCodes);
    const allBudgets = await this.db.select().from(budgets);
    const budgetMap = new Map(allBudgets.map((b) => [b.chargeCodeId, b]));

    // Get timesheet entries for cost/hours breakdown
    const entries = await this.db
      .select({
        chargeCodeId: timesheetEntries.chargeCodeId,
        userId: timesheets.userId,
        totalHours: sql<string>`SUM(${timesheetEntries.hours}::numeric)`,
        totalCost: sql<string>`SUM(${timesheetEntries.calculatedCost}::numeric)`,
      })
      .from(timesheetEntries)
      .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
      .groupBy(timesheetEntries.chargeCodeId, timesheets.userId);

    const allProfiles = await this.db.select().from(profiles);
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

    // Build descendant set
    const descendantIds = new Set<string>();
    const collectDescendants = (parentId: string) => {
      for (const c of allCodes) {
        if (c.parentId === parentId && !descendantIds.has(c.id)) {
          descendantIds.add(c.id);
          collectDescendants(c.id);
        }
      }
    };
    collectDescendants(id);
    descendantIds.add(id);
    const allRelevantIds = descendantIds;

    // Build entries cost map (actual cost from timesheet entries per charge code)
    const entryCostMap = new Map<string, number>();
    for (const entry of entries) {
      const cost = Number(entry.totalCost ?? 0);
      entryCostMap.set(entry.chargeCodeId, (entryCostMap.get(entry.chargeCodeId) ?? 0) + cost);
    }

    // Build budget tree
    const buildBudgetTree = (parentId: string): any[] => {
      return allCodes
        .filter((c) => c.parentId === parentId)
        .map((c) => {
          const b = budgetMap.get(c.id);
          const budget = Number(b?.budgetAmount ?? c.budgetAmount ?? 0);
          const budgetActual = Number(b?.actualSpent ?? 0);
          const entryActual = entryCostMap.get(c.id) ?? 0;
          const actual = budgetActual > 0 ? budgetActual : entryActual;
          return {
            id: c.id,
            name: c.name,
            level: c.level,
            budget,
            actual,
            variance: budget - actual,
            percentage: budget > 0 ? Math.round((actual / budget) * 10000) / 100 : 0,
            children: buildBudgetTree(c.id),
          };
        });
    };

    // Team breakdown: group by profiles.department for users who logged to these charge codes
    const teamMap = new Map<string, { name: string; hours: number; cost: number }>();
    const personMap = new Map<string, { name: string; hours: number; cost: number }>();

    for (const entry of entries) {
      if (!allRelevantIds.has(entry.chargeCodeId)) continue;
      const hours = Number(entry.totalHours ?? 0);
      const cost = Number(entry.totalCost ?? 0);
      const profile = profileMap.get(entry.userId);
      const dept = profile?.department ?? 'Unassigned';
      const personName = profile?.fullName ?? profile?.email ?? 'Unknown';

      if (!teamMap.has(dept)) teamMap.set(dept, { name: dept, hours: 0, cost: 0 });
      const t = teamMap.get(dept)!;
      t.hours += hours;
      t.cost += cost;

      if (!personMap.has(entry.userId)) personMap.set(entry.userId, { name: personName, hours: 0, cost: 0 });
      const p = personMap.get(entry.userId)!;
      p.hours += hours;
      p.cost += cost;
    }

    const totalHours = Array.from(personMap.values()).reduce((s, p) => s + p.hours, 0);

    const codeBudget = budgetMap.get(id);
    const ownBudget = Number(codeBudget?.budgetAmount ?? code.budgetAmount ?? 0);

    // Aggregate budget + actual from all descendants if own budget is 0
    const aggregateFromTree = (nodes: any[]): { budget: number; actual: number } => {
      let budget = 0;
      let actual = 0;
      for (const node of nodes) {
        budget += node.budget;
        actual += node.actual;
        const childAgg = aggregateFromTree(node.children);
        budget += childAgg.budget;
        actual += childAgg.actual;
      }
      return { budget, actual };
    };

    const children = buildBudgetTree(id);
    const childAgg = aggregateFromTree(children);
    const topBudget = ownBudget > 0 ? ownBudget : childAgg.budget;
    const topActual = childAgg.actual || Number(codeBudget?.actualSpent ?? 0);

    return {
      budget: topBudget,
      actual: topActual,
      variance: topBudget - topActual,
      percentage: topBudget > 0 ? Math.round((topActual / topBudget) * 10000) / 100 : 0,
      children: buildBudgetTree(id),
      teamBreakdown: Array.from(teamMap.values()).map((t) => ({
        name: t.name,
        hours: Math.round(t.hours * 100) / 100,
        cost: Math.round(t.cost * 100) / 100,
        percentage: totalHours > 0 ? Math.round((t.hours / totalHours) * 10000) / 100 : 0,
      })).sort((a, b) => b.hours - a.hours),
      personBreakdown: Array.from(personMap.entries()).map(([userId, p]) => ({
        userId,
        name: p.name,
        hours: Math.round(p.hours * 100) / 100,
        cost: Math.round(p.cost * 100) / 100,
        percentage: totalHours > 0 ? Math.round((p.hours / totalHours) * 10000) / 100 : 0,
      })).sort((a, b) => b.hours - a.hours),
    };
  }

  async cascadeAccess(chargeCodeId: string, userIds: string[], callerId: string) {
    const code = await this.findByIdRaw(chargeCodeId);

    // Permission check
    if (code.ownerId !== callerId && code.approverId !== callerId) {
      const [caller] = await this.db
        .select({ role: profiles.role })
        .from(profiles)
        .where(eq(profiles.id, callerId))
        .limit(1);
      if (caller?.role !== 'admin') {
        throw new ForbiddenException(
          'Only the charge code owner, approver, or admin can cascade access',
        );
      }
    }

    // Get all descendant IDs
    const descendantIds = await this.findDescendantIds(chargeCodeId);
    const allChargeCodeIds = [chargeCodeId, ...descendantIds];

    // Insert access for each user x charge code combination
    const values = allChargeCodeIds.flatMap((ccId) =>
      userIds.map((userId) => ({
        chargeCodeId: ccId,
        userId,
      })),
    );

    if (values.length > 0) {
      await this.db
        .insert(chargeCodeUsers)
        .values(values)
        .onConflictDoNothing();
    }

    return { affected: values.length };
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

  /**
   * Find all descendant charge code IDs for a given parent.
   * Loads all charge codes once and traverses in memory to avoid N+1 queries.
   */
  private async findDescendantIds(parentId: string): Promise<string[]> {
    const allCodes = await this.db
      .select({ id: chargeCodes.id, parentId: chargeCodes.parentId })
      .from(chargeCodes);

    const childrenMap = new Map<string, string[]>();
    for (const cc of allCodes) {
      if (cc.parentId) {
        const children = childrenMap.get(cc.parentId) ?? [];
        children.push(cc.id);
        childrenMap.set(cc.parentId, children);
      }
    }

    const result: string[] = [];
    const collect = (pid: string) => {
      const children = childrenMap.get(pid) ?? [];
      for (const childId of children) {
        result.push(childId);
        collect(childId);
      }
    };
    collect(parentId);
    return result;
  }

  async requestAccess(chargeCodeId: string, requesterId: string, reason: string) {
    // Validate charge code exists
    await this.findByIdRaw(chargeCodeId);

    // Check if already assigned
    const [existing] = await this.db
      .select()
      .from(chargeCodeUsers)
      .where(
        and(
          eq(chargeCodeUsers.chargeCodeId, chargeCodeId),
          eq(chargeCodeUsers.userId, requesterId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new BadRequestException('You already have access to this charge code');
    }

    // Check for pending request
    const [pendingReq] = await this.db
      .select()
      .from(chargeCodeRequests)
      .where(
        and(
          eq(chargeCodeRequests.chargeCodeId, chargeCodeId),
          eq(chargeCodeRequests.requesterId, requesterId),
          eq(chargeCodeRequests.status, 'pending'),
        ),
      )
      .limit(1);

    if (pendingReq) {
      throw new BadRequestException('You already have a pending request for this charge code');
    }

    const [created] = await this.db
      .insert(chargeCodeRequests)
      .values({
        requesterId,
        chargeCodeId,
        reason: reason || null,
      })
      .returning();

    return created;
  }

  async getMyRequests(userId: string) {
    return this.db
      .select({
        id: chargeCodeRequests.id,
        chargeCodeId: chargeCodeRequests.chargeCodeId,
        reason: chargeCodeRequests.reason,
        status: chargeCodeRequests.status,
        createdAt: chargeCodeRequests.createdAt,
        chargeCodeName: chargeCodes.name,
      })
      .from(chargeCodeRequests)
      .innerJoin(chargeCodes, eq(chargeCodeRequests.chargeCodeId, chargeCodes.id))
      .where(eq(chargeCodeRequests.requesterId, userId))
      .orderBy(chargeCodeRequests.createdAt)
      .limit(50);
  }

  async getAccessRequests(userId: string, role: string) {
    // Admins see all pending requests; CC owners/managers see requests for their codes
    if (role === 'admin') {
      return this.db
        .select({
          id: chargeCodeRequests.id,
          requesterId: chargeCodeRequests.requesterId,
          chargeCodeId: chargeCodeRequests.chargeCodeId,
          reason: chargeCodeRequests.reason,
          status: chargeCodeRequests.status,
          createdAt: chargeCodeRequests.createdAt,
          requesterName: profiles.fullName,
          requesterEmail: profiles.email,
          chargeCodeName: chargeCodes.name,
        })
        .from(chargeCodeRequests)
        .innerJoin(profiles, eq(chargeCodeRequests.requesterId, profiles.id))
        .innerJoin(chargeCodes, eq(chargeCodeRequests.chargeCodeId, chargeCodes.id))
        .where(eq(chargeCodeRequests.status, 'pending'))
        .limit(500);
    }

    // CC owners/managers: only their codes
    return this.db
      .select({
        id: chargeCodeRequests.id,
        requesterId: chargeCodeRequests.requesterId,
        chargeCodeId: chargeCodeRequests.chargeCodeId,
        reason: chargeCodeRequests.reason,
        status: chargeCodeRequests.status,
        createdAt: chargeCodeRequests.createdAt,
        requesterName: profiles.fullName,
        requesterEmail: profiles.email,
        chargeCodeName: chargeCodes.name,
      })
      .from(chargeCodeRequests)
      .innerJoin(profiles, eq(chargeCodeRequests.requesterId, profiles.id))
      .innerJoin(chargeCodes, eq(chargeCodeRequests.chargeCodeId, chargeCodes.id))
      .where(
        and(
          eq(chargeCodeRequests.status, 'pending'),
          sql`(${chargeCodes.ownerId} = ${userId} OR ${chargeCodes.approverId} = ${userId})`,
        ),
      )
      .limit(500);
  }

  async reviewAccessRequest(requestId: string, status: 'approved' | 'rejected', reviewerId: string) {
    const [request] = await this.db
      .select()
      .from(chargeCodeRequests)
      .where(eq(chargeCodeRequests.id, requestId))
      .limit(1);

    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'pending') {
      throw new BadRequestException('Request already reviewed');
    }

    const [updated] = await this.db
      .update(chargeCodeRequests)
      .set({
        status: status as any,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(chargeCodeRequests.id, requestId))
      .returning();

    // If approved, add user to charge_code_users
    if (status === 'approved') {
      await this.db
        .insert(chargeCodeUsers)
        .values({
          chargeCodeId: request.chargeCodeId,
          userId: request.requesterId,
        })
        .onConflictDoNothing();
    }

    return updated;
  }

  async setArchived(id: string, archived: boolean) {
    const [updated] = await this.db
      .update(chargeCodes)
      .set({ isArchived: archived, updatedAt: new Date() })
      .where(eq(chargeCodes.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Charge code ${id} not found`);
    }

    return updated;
  }

  async remove(id: string) {
    const code = await this.findByIdRaw(id);

    // Delete children first (cascade), then this node
    const descendantIds = await this.findDescendantIds(id);
    const allIds = [...descendantIds, id];

    // Delete related records from all referencing tables
    if (allIds.length > 0) {
      await this.db.delete(timesheetEntries).where(inArray(timesheetEntries.chargeCodeId, allIds));
      await this.db.delete(budgets).where(inArray(budgets.chargeCodeId, allIds));
      await this.db.delete(chargeCodeUsers).where(inArray(chargeCodeUsers.chargeCodeId, allIds));
      await this.db.delete(chargeCodeRequests).where(inArray(chargeCodeRequests.chargeCodeId, allIds));
    }

    // Delete descendants bottom-up (reverse order to respect FK)
    for (const descId of descendantIds.reverse()) {
      await this.db.delete(chargeCodes).where(eq(chargeCodes.id, descId));
    }

    // Delete the node itself
    await this.db.delete(chargeCodes).where(eq(chargeCodes.id, id));

    return { deleted: true, id };
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
