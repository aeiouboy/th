import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { chargeCodeUsers } from '../database/schema/charge-code-users';
import { chargeCodes } from '../database/schema/charge-codes';

export interface ParsedEntry {
  project: string;
  hours: number;
  date: string;
  description: string;
  chargeCodeId: string | null;
  chargeCodeName: string | null;
  confidence: number;
}

interface LlmEntry {
  project: string;
  hours: number;
  date: string;
  description: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async parseTimeEntry(text: string, userId: string, date?: string): Promise<ParsedEntry[] | { rejected: true; reason: string }> {
    const today = date || new Date().toISOString().split('T')[0];
    this.logger.log(`parseTimeEntry: text="${text}", userId=${userId}, date=${today}`);

    // 1. Call LLM to parse natural language
    const llmResult = await this.callLlm(text, today);

    // Guard: rejected by LLM
    if ('rejected' in llmResult) {
      return llmResult;
    }

    this.logger.log(`LLM returned ${llmResult.length} entries`);

    // 2. Get user's assigned charge codes
    const userChargeCodes = await this.getUserChargeCodes(userId);
    this.logger.log(`User has ${userChargeCodes.length} charge codes`);

    // 3. Match parsed projects to charge codes
    return llmResult.map((entry) => {
      const match = this.findBestMatch(entry.project, userChargeCodes);
      return {
        project: entry.project,
        hours: entry.hours,
        date: entry.date,
        description: entry.description,
        chargeCodeId: match?.id ?? null,
        chargeCodeName: match?.name ?? null,
        confidence: match ? match.score : 0,
      };
    });
  }

  private async callLlm(text: string, today: string): Promise<LlmEntry[] | { rejected: true; reason: string }> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const systemPrompt = `You are a timesheet entry parser. Your ONLY job is to extract time entries from work-related messages.

GUARD RULES (CRITICAL):
- If the message is NOT about recording work hours or time entries, return: {"rejected": true, "reason": "brief explanation in same language as input"}
- Examples of messages to REJECT: greetings, questions, jokes, off-topic chat, requests unrelated to logging work time
- ONLY accept messages that describe work done with time/hours information
- If the message mentions work but has NO hours/duration specified, you MUST reject. NEVER assume or default hours (e.g. do NOT assume 8 hours). Ask the user to specify hours explicitly

PARSING RULES (when message is valid):
- Accept Thai or English input
- Extract: project/task name, hours, date, description
- If no date is mentioned, use today: ${today}
- If relative dates are used (yesterday, เมื่อวาน, พรุ่งนี้), calculate from today (${today})
- Hours can be expressed as "ชม.", "ชั่วโมง", "hrs", "hours", "h", or just numbers in context
- Hours must be > 0 and <= 24
- Return a JSON object with an "entries" array

Response format (valid input):
{
  "entries": [
    {
      "project": "project or task name as mentioned",
      "hours": 6,
      "date": "YYYY-MM-DD",
      "description": "brief description of work done"
    }
  ]
}

Response format (invalid input):
{
  "rejected": true,
  "reason": "This doesn't look like a time entry. Please describe your work with hours, e.g. 'OMS 6 ชม.'"
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`OpenRouter API error: ${response.status} ${errorBody}`);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in LLM response');
    }

    // Strip markdown code fences if present
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    this.logger.log(`LLM response: ${cleaned.substring(0, 200)}`);
    const parsed = JSON.parse(cleaned);

    // Guard: check if LLM rejected the input
    if (parsed.rejected) {
      return { rejected: true, reason: parsed.reason || 'ข้อความไม่เกี่ยวกับการบันทึกเวลาทำงาน' };
    }

    return parsed.entries || [];
  }

  private async getUserChargeCodes(userId: string) {
    const rows = await this.db
      .select({
        id: chargeCodes.id,
        name: chargeCodes.name,
        path: chargeCodes.path,
        level: chargeCodes.level,
      })
      .from(chargeCodeUsers)
      .innerJoin(chargeCodes, eq(chargeCodeUsers.chargeCodeId, chargeCodes.id))
      .where(eq(chargeCodeUsers.userId, userId));

    return rows;
  }

  private findBestMatch(
    project: string,
    codes: { id: string; name: string; path: string | null; level: string | null }[],
  ): { id: string; name: string; score: number } | null {
    if (codes.length === 0) return null;

    const needle = project.toLowerCase().trim();
    let bestMatch: { id: string; name: string; score: number } | null = null;

    for (const code of codes) {
      const codeName = code.name.toLowerCase();
      const codePath = (code.path || '').toLowerCase();

      let score = 0;

      // Exact match
      if (codeName === needle) {
        score = 1.0;
      }
      // Name contains the project keyword
      else if (codeName.includes(needle)) {
        score = 0.8;
      }
      // Project keyword contains the code name
      else if (needle.includes(codeName)) {
        score = 0.7;
      }
      // Path contains the project keyword
      else if (codePath.includes(needle)) {
        score = 0.6;
      }
      // Partial word match
      else {
        const needleWords = needle.split(/\s+/);
        const codeWords = codeName.split(/\s+/);
        const matchCount = needleWords.filter((w) =>
          codeWords.some((cw) => cw.includes(w) || w.includes(cw)),
        ).length;
        if (matchCount > 0) {
          score = (matchCount / Math.max(needleWords.length, codeWords.length)) * 0.5;
        }
      }

      if (score > (bestMatch?.score ?? 0)) {
        bestMatch = { id: code.id, name: code.name, score };
      }
    }

    return bestMatch && bestMatch.score > 0 ? bestMatch : null;
  }
}
