import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const TYPE_CONFIG: Record<string, { emoji: string; label: string; accentColor: string }> = {
  timesheet_reminder: { emoji: '⏰', label: 'TIMESHEET REMINDER', accentColor: 'warning' },
  approval_reminder: { emoji: '✅', label: 'APPROVAL REQUIRED', accentColor: 'attention' },
  manager_summary: { emoji: '📊', label: 'WEEKLY TEAM SUMMARY', accentColor: 'accent' },
  weekly_insights: { emoji: '📈', label: 'WEEKLY INSIGHTS', accentColor: 'good' },
};

@Injectable()
export class TeamsWebhookService {
  private readonly logger = new Logger(TeamsWebhookService.name);
  private readonly webhookUrl: string | undefined;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.webhookUrl = this.configService.get<string>('TEAMS_WEBHOOK_URL');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    if (!this.webhookUrl) {
      this.logger.warn('TEAMS_WEBHOOK_URL not configured — Teams delivery disabled');
    }
  }

  async sendNotification(params: {
    type: string;
    recipientName: string;
    subject: string;
    body: string;
  }): Promise<void> {
    if (!this.webhookUrl) return;

    const cfg = TYPE_CONFIG[params.type] ?? { emoji: '🔔', label: 'NOTIFICATION', accentColor: 'default' };
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Parse body into bullet points for better readability
    const bodyLines = params.body
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const bodyItems: any[] = [];

    for (const line of bodyLines) {
      if (line.startsWith('- ')) {
        // Bullet items → FactSet rows
        const text = line.replace(/^- /, '');
        const colonIdx = text.indexOf(':');
        if (colonIdx > 0 && colonIdx < 30) {
          bodyItems.push({
            type: 'fact',
            title: text.substring(0, colonIdx).trim(),
            value: text.substring(colonIdx + 1).trim(),
          });
        } else {
          bodyItems.push({ type: 'text', value: `• ${text}` });
        }
      } else {
        bodyItems.push({ type: 'text', value: line });
      }
    }

    // Build card body
    const cardBody: any[] = [
      // Header container with accent
      {
        type: 'Container',
        style: cfg.accentColor,
        bleed: true,
        items: [
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'TextBlock',
                    text: `${cfg.emoji}  ${cfg.label}`,
                    weight: 'Bolder',
                    size: 'Small',
                    color: 'light',
                  },
                ],
              },
              {
                type: 'Column',
                width: 'stretch',
                items: [
                  {
                    type: 'TextBlock',
                    text: timestamp,
                    size: 'Small',
                    horizontalAlignment: 'Right',
                    color: 'light',
                    isSubtle: true,
                  },
                ],
              },
            ],
          },
        ],
      },
      // Subject
      {
        type: 'TextBlock',
        text: params.subject,
        weight: 'Bolder',
        size: 'Large',
        wrap: true,
        spacing: 'Medium',
      },
      // Recipient
      {
        type: 'ColumnSet',
        spacing: 'Small',
        columns: [
          {
            type: 'Column',
            width: 'auto',
            items: [
              {
                type: 'TextBlock',
                text: '👤',
                size: 'Small',
              },
            ],
          },
          {
            type: 'Column',
            width: 'stretch',
            items: [
              {
                type: 'TextBlock',
                text: params.recipientName,
                size: 'Small',
                isSubtle: true,
                weight: 'Bolder',
              },
            ],
          },
        ],
      },
      // Separator
      {
        type: 'TextBlock',
        text: ' ',
        spacing: 'Small',
        separator: true,
      },
    ];

    // Body content — group facts together, text separately
    const facts = bodyItems.filter((i) => i.type === 'fact');
    const texts = bodyItems.filter((i) => i.type === 'text');

    if (facts.length > 0) {
      cardBody.push({
        type: 'FactSet',
        facts: facts.map((f) => ({ title: f.title, value: f.value })),
        spacing: 'Small',
      });
    }

    if (texts.length > 0) {
      cardBody.push({
        type: 'TextBlock',
        text: texts.map((t) => t.value).join('\n\n'),
        wrap: true,
        spacing: facts.length > 0 ? 'Medium' : 'Small',
        size: 'Small',
      });
    }

    // If no structured content, show raw body
    if (facts.length === 0 && texts.length === 0) {
      cardBody.push({
        type: 'TextBlock',
        text: params.body,
        wrap: true,
        spacing: 'Small',
      });
    }

    const card = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          contentUrl: null,
          content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.4',
            body: cardBody,
            actions: [
              {
                type: 'Action.OpenUrl',
                title: '📋 Open Timesheet System',
                url: this.frontendUrl,
              },
              {
                type: 'Action.OpenUrl',
                title: '🔔 View Notifications',
                url: `${this.frontendUrl}/notifications`,
              },
            ],
          },
        },
      ],
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });

      if (!response.ok) {
        this.logger.error(
          `Teams webhook failed: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error: any) {
      this.logger.error(`Teams webhook error: ${error.message}`);
    }
  }
}
