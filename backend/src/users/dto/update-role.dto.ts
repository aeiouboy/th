import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiProperty({ enum: ['employee', 'charge_manager', 'pmo', 'finance', 'admin'] })
  @IsString()
  @IsIn(['employee', 'charge_manager', 'pmo', 'finance', 'admin'])
  role!: string;
}
