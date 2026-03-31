import { Body, Controller, Post, Logger, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseInputDto } from './dto/parse-input.dto';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  @Post('parse')
  async parse(@CurrentUser() user: any, @Body() dto: ParseInputDto) {
    try {
      this.logger.log(`Parsing: "${dto.text}" for user ${user.id}`);
      const result = await this.aiService.parseTimeEntry(dto.text, user.id, dto.date);
      if ('rejected' in result) {
        throw new BadRequestException(result.reason);
      }
      this.logger.log(`Parsed ${result.length} entries`);
      return result;
    } catch (error) {
      this.logger.error(`Parse failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
