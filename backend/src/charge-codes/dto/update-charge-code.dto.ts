import { PartialType } from '@nestjs/swagger';
import { CreateChargeCodeDto } from './create-charge-code.dto';

export class UpdateChargeCodeDto extends PartialType(CreateChargeCodeDto) {}
