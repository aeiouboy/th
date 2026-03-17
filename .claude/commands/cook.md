---
description: Implement the plan
argument-hint: [path-to-plan]
---

# Cook

Orchestrate a team of agents to implement the plan at `PATH_TO_PLAN`.

## Variables

PATH_TO_PLAN: $ARGUMENTS

## Workflow

1. If no `PATH_TO_PLAN` is provided, STOP immediately and ask the user to provide it (AskUserQuestion).
2. Read the plan at `PATH_TO_PLAN`.
3. Extract the plan name from the filename to use as the team name.

### Create Team

4. Use `TeamCreate` to create a team named after the plan.

### Create Tasks

5. Read the `## Step by Step Tasks` section from the plan.
6. For each task, use `TaskCreate` to create a task in the team's task list:
   - Use the task title as the subject
   - Include the full task description, assigned agent type, and dependencies
   - Set `blockedBy` for tasks that depend on other tasks

### Spawn Teammates

7. Read the `## Team Orchestration > Team Members` section from the plan.
8. For each team member, spawn a teammate using the `Agent` tool with:
   - `name`: The member's Name from the plan
   - `subagent_type`: The member's Agent Type from the plan
   - `team_name`: The team name from step 4
   - `run_in_background`: true
   - `prompt`: Include the full plan context and their specific role/tasks

### Infra Verify (before feature builds)

9. After the foundation/scaffolding task completes, **verify infrastructure BEFORE assigning feature tasks**:
   - If the plan uses external services (database, auth, APIs), the foundation builder must verify real connections as its LAST step
   - The team lead must confirm the builder reported successful connection tests (e.g., `SELECT 1` on DB, JWKS endpoint returns keys, auth token flow works)
   - If infra verification fails, DO NOT proceed to feature builds. Fix infra first.
   - Save verified connection details (correct hostnames, ports, endpoints) so downstream agents use correct values.

### Orchestrate

10. You are the **team lead**. You NEVER write code directly.
11. Assign the first unblocked task(s) to the appropriate teammate(s) using `TaskUpdate` with `owner`.
12. When a teammate completes a task, mark it completed via `TaskUpdate` and assign the next unblocked task.
13. Follow the `## Pipeline` section ordering from the plan.
14. **For the Write Tests task**: Ensure the tester writes BOTH unit tests (mocked) AND at least 1 E2E smoke test (real services). If the project has a dev server + database, the smoke test must: start server → authenticate → call API → verify real data. Tests that only mock everything are insufficient.
15. **For the Validate task**: Ensure the validator starts real servers, makes real API calls with real auth tokens, and verifies response bodies contain actual data from the database — not just HTTP 200 status codes.
16. If a validation step fails, follow the `## Healing Rules` to route fixes to the right agent.
17. Continue until all tasks are completed or max retries are exhausted.

### Healing Log

When the heal step runs, save a healing log to `docs/test-results/healing-log.md` (kebab-case, alongside other results) with this structure:

```markdown
# Healing Log

## Iteration 1
- **Date**: YYYY-MM-DD HH:MM
- **Validation failures**: list each failure (command, output summary)
- **Healed by**: agent name
- **Fix applied**: what was changed
- **Result**: pass/fail after fix

## Iteration 2 (if needed)
...
```

This gives the user visibility into what broke and how it was fixed.

## Report

- Present the final status of all tasks.
- Summarize work done by each teammate.
- Report files and total lines changed with `git diff --stat`.
- Report location of test results: `docs/test-results/`
- Report location of validation logs: `logs/`
- If healing occurred, report location of healing log: `docs/test-results/healing-log.md`