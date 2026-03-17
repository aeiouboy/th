import { IsString, IsDateString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHolidayDto {
  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'New Year' })
  @IsString()
  @MaxLength(255)
  holidayName: string;

  @ApiPropertyOptional({ example: 'TH', default: 'TH' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;
}
