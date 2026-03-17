import { IsString, IsDateString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateHolidayDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'New Year' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  holidayName?: string;

  @ApiPropertyOptional({ example: 'TH' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;
}
