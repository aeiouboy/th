import {
  IsArray,
  ValidateNested,
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EntryDto {
  @ApiProperty({ example: 'PRJ-001' })
  @IsString()
  charge_code_id: string;

  @ApiProperty({ example: '2026-03-16' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 8.0 })
  @IsNumber()
  @Min(0)
  @Max(24)
  hours: number;

  @ApiPropertyOptional({ example: 'Development work' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpsertEntriesDto {
  @ApiProperty({ type: [EntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntryDto)
  entries: EntryDto[];
}
