import { IsDateString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVacationDto {
  @ApiProperty({ example: '2026-03-20' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-03-22' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 'full_day', enum: ['full_day', 'half_am', 'half_pm'] })
  @IsOptional()
  @IsIn(['full_day', 'half_am', 'half_pm'])
  leaveType?: 'full_day' | 'half_am' | 'half_pm';
}
