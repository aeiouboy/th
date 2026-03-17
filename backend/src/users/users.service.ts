import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { profiles } from '../database/schema';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAll() {
    return this.db.select().from(profiles);
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
