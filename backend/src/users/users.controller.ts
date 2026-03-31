import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateJobGradeDto } from './dto/update-job-grade.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return user;
  }

  @Put('me')
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Put('me/avatar')
  updateAvatar(@CurrentUser() user: any, @Body() body: { avatarUrl: string }) {
    return this.usersService.updateAvatar(user.id, body.avatarUrl);
  }

  @Get()
  @Roles('admin', 'charge_manager', 'pmo', 'finance')
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default 100, max 500)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination (default 0)' })
  findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.usersService.findAll({
      limit: limit ? Math.min(parseInt(limit, 10) || 100, 500) : 100,
      offset: offset ? parseInt(offset, 10) || 0 : 0,
    });
  }

  @Put(':id/role')
  @Roles('admin')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.usersService.updateRole(id, dto.role);
  }

  @Put(':id/job-grade')
  @Roles('admin')
  updateJobGrade(@Param('id') id: string, @Body() dto: UpdateJobGradeDto) {
    return this.usersService.updateJobGrade(id, dto.jobGrade);
  }
}
