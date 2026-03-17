import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTimesheetDto {
  @ApiProperty({ example: '2026-03-16' })
  @IsDateString()
  period_start: string;

  @ApiProperty({ example: '2026-03-22' })
  @IsDateString()
  period_end: string;
}
