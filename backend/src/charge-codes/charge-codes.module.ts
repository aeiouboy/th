import { Module } from '@nestjs/common';
import { ChargeCodesController } from './charge-codes.controller';
import { ChargeCodesService } from './charge-codes.service';

@Module({
  controllers: [ChargeCodesController],
  providers: [ChargeCodesService],
  exports: [ChargeCodesService],
})
export class ChargeCodesModule {}
