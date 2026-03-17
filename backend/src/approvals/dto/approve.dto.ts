import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
