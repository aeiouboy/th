import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { parse } from 'csv-parse/sync';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { chargeCodes, profiles, budgets } from '../database/schema';

interface CsvRow {
  project_name: string;
  charge_code: string;
  budget: string;
  start_date: string;
  end_date: string;
  owner_email: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
  total: number;
}

@Injectable()
export class ProjectUploadService {
  private readonly logger = new Logger(ProjectUploadService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async parseAndImport(fileBuffer: Buffer, filename: string): Promise<ImportResult> {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext !== 'csv') {
      throw new BadRequestException(
        'Only CSV files are supported. Please upload a .csv file.',
      );
    }

    let rows: CsvRow[];
    try {
      rows = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (error: any) {
      throw new BadRequestException(`Failed to parse CSV: ${error.message}`);
    }

    if (rows.length === 0) {
      throw new BadRequestException('CSV file contains no data rows.');
    }

    // Validate required columns
    const requiredColumns = [
      'project_name',
      'charge_code',
      'budget',
      'start_date',
      'end_date',
      'owner_email',
    ];
    const firstRow = rows[0];
    const missingColumns = requiredColumns.filter(
      (col) => !(col in firstRow),
    );
    if (missingColumns.length > 0) {
      throw new BadRequestException(
        `Missing required columns: ${missingColumns.join(', ')}. Required: ${requiredColumns.join(', ')}`,
      );
    }

    const result: ImportResult = {
      created: 0,
      updated: 0,
      errors: [],
      total: rows.length,
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header row

      try {
        await this.processRow(row, rowNum, result);
      } catch (error: any) {
        result.errors.push({ row: rowNum, message: error.message });
      }
    }

    this.logger.log(
      `Import complete: ${result.created} created, ${result.updated} updated, ${result.errors.length} errors out of ${result.total} rows`,
    );

    return result;
  }

  private async processRow(
    row: CsvRow,
    rowNum: number,
    result: ImportResult,
  ): Promise<void> {
    const chargeCode = row.charge_code?.trim();
    const projectName = row.project_name?.trim();
    const budgetStr = row.budget?.trim();
    const startDate = row.start_date?.trim();
    const endDate = row.end_date?.trim();
    const ownerEmail = row.owner_email?.trim();

    if (!chargeCode) {
      throw new Error('charge_code is required');
    }
    if (!projectName) {
      throw new Error('project_name is required');
    }

    // Parse budget
    const budgetAmount = parseFloat(budgetStr?.replace(/[,$]/g, '') || '0');
    if (isNaN(budgetAmount)) {
      throw new Error(`Invalid budget value: ${budgetStr}`);
    }

    // Validate dates
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      throw new Error(
        `Invalid start_date format: ${startDate}. Expected YYYY-MM-DD`,
      );
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw new Error(
        `Invalid end_date format: ${endDate}. Expected YYYY-MM-DD`,
      );
    }

    // Look up owner by email
    let ownerId: string | null = null;
    if (ownerEmail) {
      const [owner] = await this.db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.email, ownerEmail))
        .limit(1);

      if (!owner) {
        result.errors.push({
          row: rowNum,
          message: `Owner not found: ${ownerEmail}. Charge code will be created without owner.`,
        });
      } else {
        ownerId = owner.id;
      }
    }

    // Check if charge code already exists
    const [existing] = await this.db
      .select()
      .from(chargeCodes)
      .where(eq(chargeCodes.id, chargeCode))
      .limit(1);

    if (existing) {
      // Update existing
      await this.db
        .update(chargeCodes)
        .set({
          name: projectName,
          budgetAmount: budgetAmount.toFixed(2),
          validFrom: startDate || existing.validFrom,
          validTo: endDate || existing.validTo,
          ownerId: ownerId ?? existing.ownerId,
          updatedAt: new Date(),
        })
        .where(eq(chargeCodes.id, chargeCode));

      // Upsert budget record
      const [existingBudget] = await this.db
        .select()
        .from(budgets)
        .where(eq(budgets.chargeCodeId, chargeCode))
        .limit(1);

      if (existingBudget) {
        await this.db
          .update(budgets)
          .set({
            budgetAmount: budgetAmount.toFixed(2),
            lastUpdated: new Date(),
          })
          .where(eq(budgets.chargeCodeId, chargeCode));
      } else {
        await this.db.insert(budgets).values({
          chargeCodeId: chargeCode,
          budgetAmount: budgetAmount.toFixed(2),
          actualSpent: '0',
          lastUpdated: new Date(),
        });
      }

      result.updated++;
    } else {
      // Create new
      await this.db.insert(chargeCodes).values({
        id: chargeCode,
        name: projectName,
        level: 'project',
        budgetAmount: budgetAmount.toFixed(2),
        validFrom: startDate || null,
        validTo: endDate || null,
        ownerId,
        isBillable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create budget record
      await this.db.insert(budgets).values({
        chargeCodeId: chargeCode,
        budgetAmount: budgetAmount.toFixed(2),
        actualSpent: '0',
        lastUpdated: new Date(),
      });

      result.created++;
    }
  }
}
