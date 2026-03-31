import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ParseInputDto {
  @ApiProperty({ example: 'วันนี้ทำงาน OMS 6 ชม. กับ meeting HR 2 ชม.' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({ example: '2026-03-22', description: 'Date in YYYY-MM-DD format. Defaults to today.' })
  @IsString()
  @IsOptional()
  date?: string;
}
