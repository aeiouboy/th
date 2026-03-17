import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectDto {
  @ApiProperty({ description: 'Reason for rejection' })
  @IsNotEmpty()
  @IsString()
  comment: string;
}
