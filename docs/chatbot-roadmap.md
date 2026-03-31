# Chatbot Roadmap

The Timesheet & Cost Allocation System includes a conversational assistant to help employees query timesheet data, check chargeability, and perform common actions without leaving their current workflow.

---

## Phase 1 — In-App Chat Widget (Implemented)

**Status**: Implemented (2026-03-20)

**Components:**
- `frontend/src/components/layout/ChatWidget.tsx` — floating chat panel, toggled via a button in the authenticated layout
- `frontend/src/components/layout/ChatBubble.tsx` — individual message bubble (user vs. bot styling)

**How it works:**

The chat widget sends user messages to the existing Teams bot integration endpoint:

```
POST /api/v1/integrations/teams/message
Authorization: Bearer <token>
Body: { "text": "show my timesheets" }
```

The backend NLP handler (`IntegrationsBotService`) processes the message and returns a structured response:

```json
{
  "text": "You have 2 timesheets this month. The March 1–15 period is submitted.",
  "suggestedActions": ["View timesheet", "Check chargeability", "Check budget"]
}
```

**Supported intents (Phase 1):**

| Intent | Example phrases |
|--------|----------------|
| View timesheets | "show my timesheets", "what's my timesheet status" |
| Check chargeability | "what's my chargeability", "am I billable enough" |
| Check pending approvals | "how many approvals are pending", "who hasn't submitted" |
| Check budget | "is my project over budget", "show budget for PRJ-001" |

**Validation:**
- Empty messages are rejected client-side before sending
- Bot responses are displayed as plain text (no HTML rendering)
- Network errors surface as an error bubble in the chat

---

## Phase 2 — Microsoft Teams Bot Integration (Future)

**Status**: Planned — not yet implemented

**Approach**: Azure Bot Service + Bot Framework SDK

The same NLP backend (`IntegrationsBotService`) that powers the in-app widget can also respond to messages sent via Microsoft Teams. The Bot Framework webhook endpoint (`POST /integrations/teams/webhook`) is already scaffolded and registered.

**What needs to be done:**
1. Register an Azure Bot resource and obtain the `MicrosoftAppId` and `MicrosoftAppPassword`.
2. Configure the webhook URL in Azure Bot Service pointing to the Railway backend (`https://precious-growth-production-d6b9.up.railway.app/api/v1/integrations/teams/webhook`).
3. Publish the Teams app manifest (available at `GET /integrations/teams/manifest`) to the Microsoft Teams admin center.
4. Add `MICROSOFT_APP_ID` and `MICROSOFT_APP_PASSWORD` to `backend/.env` and Railway environment variables.

**Capabilities (same intents as Phase 1):**
- Employees can type natural language queries in a Teams DM with the bot
- Bot responds in the Teams conversation thread
- Proactive notifications (timesheet reminders, approval alerts) sent by the scheduler can be delivered to the Teams channel in addition to the in-app notification inbox

**Teams manifest fields to update** (see `backend/src/integrations/integrations.controller.ts`):
- `developer.websiteUrl` — point to the production frontend
- `developer.privacyUrl` / `developer.termsOfUseUrl` — update to real policy pages
- `bots[].botId` — replace with the Azure Bot resource app ID

---

## Phase 3 — AI-Powered Suggestions (Future)

**Status**: Exploratory — not scoped

**Concept:**

Extend the NLP handler with an LLM backend (e.g. Azure OpenAI) to:

1. **Auto-complete charge codes** — when an employee types a partial description ("working on migration"), the assistant suggests the most likely charge code based on their history.
2. **Anomaly detection** — flag unusual patterns ("You logged 0 hours on Wednesday — is that correct?").
3. **Natural language reports** — "Generate a P/L summary for PRG-001 in Q1 2026" returns a formatted table in the chat.
4. **Smart reminders** — personalized reminders based on the employee's typical logging pattern ("You usually submit by Thursday noon — it's currently Thursday 3pm and your timesheet is still draft").

**Dependencies:**
- Azure OpenAI or equivalent LLM API access
- Conversation history stored in the `notifications` table (or a new `chat_sessions` table)
- Role-based prompt injection to restrict data access (employees see only their own data; PMO sees aggregates)
