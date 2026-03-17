import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkApproveDto {
  @ApiProperty({ type: [String], description: 'Array of timesheet IDs to approve' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  timesheet_ids: string[];
}
