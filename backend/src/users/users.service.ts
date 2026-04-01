import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { profiles } from '../database/schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async createUser(dto: CreateUserDto) {
    // Invite user via Supabase Auth (sends email to set password)
    const { data: authData, error: authError } =
      await this.supabaseAdmin.auth.admin.inviteUserByEmail(dto.email);

    if (authError) {
      if (authError.message?.toLowerCase().includes('already')) {
        throw new ConflictException('A user with this email already exists');
      }
      throw new BadRequestException(authError.message);
    }

    if (!authData.user) {
      throw new BadRequestException('Failed to create auth user');
    }

    // Create profile row
    const [profile] = await this.db
      .insert(profiles)
      .values({
        id: authData.user.id,
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role as any,
        department: dto.department ?? null,
        jobGrade: dto.jobGrade ?? null,
        managerId: dto.managerId ?? null,
      })
      .returning();

    return profile;
  }

  async findAll(pagination?: { limit?: number; offset?: number }) {
    const limit = Math.min(pagination?.limit ?? 100, 500);
    const offset = pagination?.offset ?? 0;
    return this.db.select().from(profiles).limit(limit).offset(offset);
  }

  async findById(id: string) {
    const [user] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const [updated] = await this.db
      .update(profiles)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async updateRole(id: string, role: string) {
    const [updated] = await this.db
      .update(profiles)
      .set({ role: role as any, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async updateAvatar(id: string, avatarUrl: string) {
    try {
      const parsed = new URL(avatarUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      throw new BadRequestException('avatarUrl must be a valid HTTP(S) URL');
    }

    const [updated] = await this.db
      .update(profiles)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async updateJobGrade(id: string, jobGrade: string) {
    const [updated] = await this.db
      .update(profiles)
      .set({ jobGrade, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }
}
