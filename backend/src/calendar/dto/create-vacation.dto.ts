import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVacationDto {
  @ApiProperty({ example: '2026-03-20' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-03-22' })
  @IsDateString()
  endDate: string;
}
