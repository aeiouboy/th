import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CostRatesService } from './cost-rates.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Cost Rates')
@ApiBearerAuth()
@Controller('cost-rates')
export class CostRatesController {
  constructor(private readonly costRatesService: CostRatesService) {}

  @Get()
  @Roles('admin', 'finance')
  findAll() {
    return this.costRatesService.findAll();
  }

  @Post()
  @Roles('admin')
  create(
    @Body()
    body: {
      jobGrade: string;
      hourlyRate: string;
      effectiveFrom: string;
      effectiveTo?: string | null;
    },
  ) {
    return this.costRatesService.create(body);
  }

  @Put(':id')
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      jobGrade?: string;
      hourlyRate?: string;
      effectiveFrom?: string;
      effectiveTo?: string | null;
    },
  ) {
    return this.costRatesService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.costRatesService.remove(id);
  }
}
