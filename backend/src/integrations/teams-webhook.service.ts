import { Injectable, Logger } from '@nestjs/common';

const DEFAULT_WEBHOOK_URL =
  'https://centralgroup.webhook.office.com/webhookb2/8a66c931-96fd-4e87-962f-a292751aad07@817e531d-191b-4cf5-8812-f0061d89b53d/IncomingWebhook/7e1cf2f9338f4752b9fecb996eb48232/cb3342f7-d297-4017-80eb-9087c1b528dd/V2DfldJokmM-ryWVhbi6_nlymsp5eHbPNXJldHmBJBHMc1';

@Injectable()
export class TeamsWebhookService {
  private readonly logger = new Logger(TeamsWebhookService.name);
  private readonly webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.TEAMS_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
  }

  /**
   * Send a MessageCard to Microsoft Teams via Incoming Webhook.
   *
   * @param title   Card title (activityTitle)
   * @param body    Markdown body text
   * @param facts   Optional key-value pairs shown as a fact list
   * @param color   Theme color hex without '#' (default green)
   */
  async sendCard(
    title: string,
    body: string,
    facts?: { name: string; value: string }[],
    color?: string,
  ): Promise<void> {
    const themeColor = color ?? '00c853'; // green default

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const card = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor,
      summary: title,
      sections: [
        {
          activityTitle: title,
          ...(body ? { text: body } : {}),
          facts: (facts ?? []).filter((f) => f.name !== '---'),
          markdown: true,
        },
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'Open Timesheet',
          targets: [{ os: 'default', uri: frontendUrl }],
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
        const text = await response.text();
        this.logger.error(
          `Teams webhook responded ${response.status}: ${text}`,
        );
      } else {
        this.logger.log(`Teams card sent: "${title}"`);
      }
    } catch (error) {
      this.logger.error(`Failed to send Teams webhook: ${error}`);
    }
  }
}
