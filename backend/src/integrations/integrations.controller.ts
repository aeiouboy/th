import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { TeamsBotService } from './teams-bot.service';
import { IntegrationNotificationService } from './notification.service';
import { ProjectUploadService } from './project-upload.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import * as teamsManifest from './teams-manifest.json';

@ApiTags('integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly teamsBotService: TeamsBotService,
    private readonly notificationService: IntegrationNotificationService,
    private readonly projectUploadService: ProjectUploadService,
  ) {}

  @Public()
  @Post('teams/webhook')
  @ApiOperation({ summary: 'Teams bot webhook endpoint' })
  async teamsWebhook(@Body() body: any) {
    // Microsoft Bot Framework sends activities
    // In production, verify the JWT token from Bot Framework
    const activity = body;

    if (activity.type === 'message' && activity.text) {
      const userId = activity.from?.aadObjectId || activity.from?.id;
      if (!userId) {
        return { type: 'message', text: 'Could not identify user.' };
      }

      const response = await this.teamsBotService.handleIncomingMessage(
        userId,
        activity.text,
      );

      // Return in Bot Framework activity format
      return {
        type: 'message',
        text: response.text,
        suggestedActions: response.suggestedActions
          ? {
              actions: response.suggestedActions.map((text) => ({
                type: 'imBack',
                title: text,
                value: text,
              })),
            }
          : undefined,
      };
    }

    // Handle conversationUpdate, etc.
    if (activity.type === 'conversationUpdate') {
      return {
        type: 'message',
        text: 'Welcome to the Timesheet Bot! Say "help" to see what I can do.',
      };
    }

    return { status: 'ok' };
  }

  @Public()
  @Get('teams/manifest')
  @ApiOperation({ summary: 'Get Teams app manifest JSON' })
  getTeamsManifest() {
    return teamsManifest;
  }

  @Post('notifications/send')
  @ApiBearerAuth()
  @Roles('admin', 'pmo')
  @ApiOperation({ summary: 'Manually trigger all notifications (Admin/PMO)' })
  async triggerNotifications() {
    const result = await this.notificationService.sendAllNotifications();
    return {
      message: 'Notifications sent successfully',
      ...result,
    };
  }

  @Get('notifications')
  @ApiBearerAuth()
  @Roles('admin', 'pmo')
  @ApiOperation({ summary: 'Get all stored notifications' })
  getNotifications() {
    return this.notificationService.getNotifications();
  }

  @Post('projects/upload')
  @ApiBearerAuth()
  @Roles('admin', 'pmo', 'finance')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload project tracking sheet (CSV)' })
  async uploadProjects(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Please attach a CSV file.');
    }

    return this.projectUploadService.parseAndImport(
      file.buffer,
      file.originalname,
    );
  }

  @Post('teams/message')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a message to the Teams bot (authenticated user)' })
  async sendMessage(
    @CurrentUser() user: any,
    @Body() body: { text: string },
  ) {
    if (!body.text) {
      throw new BadRequestException('Message text is required');
    }

    return this.teamsBotService.handleIncomingMessage(user.id, body.text);
  }
}
