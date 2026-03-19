import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CompanySettingsService } from './company-settings.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Company Settings')
@ApiBearerAuth()
@Controller('company-settings')
export class CompanySettingsController {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
  ) {}

  @Get(':key')
  get(@Param('key') key: string) {
    return this.companySettingsService.get(key);
  }

  @Put(':key')
  @Roles('admin')
  set(@Param('key') key: string, @Body() body: { value: string }) {
    return this.companySettingsService.set(key, body.value);
  }
}
