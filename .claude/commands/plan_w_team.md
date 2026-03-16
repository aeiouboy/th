---
description: Creates a concise engineering implementation plan based on user requirements and saves it to specs directory
argument-hint: [user prompt] [orchestration prompt]
model: opus
disallowed-tools: Task, EnterPlanMode
hooks:
  Stop:
    - hooks:
        - type: command
          command: >-
            uv run $CLAUDE_PROJECT_DIR/.claude/hooks/validators/validate_new_file.py
            --directory specs
            --extension .md
        - type: command
          command: >-
            uv run $CLAUDE_PROJECT_DIR/.claude/hooks/validators/validate_file_contains.py
            --directory specs
            --extension .md
            --contains '## Task Description'
            --contains '## Objective'
            --contains '## Relevant Files'
            --contains '## Step by Step Tasks'
            --contains '## Acceptance Criteria'
            --contains '## Tech Stack'
            --contains '## Technical Design'
            --contains '## Team Orchestration'
            --contains '### Team Members'
            --contains '## Pipeline'
            --contains 'Code Review'
            --contains 'Write Tests'
            --contains 'Validate Final'
---

# Plan With Team

Create a detailed implementation plan based on the user's requirements provided through the `USER_PROMPT` variable. Analyze the request, think through the implementation approach, and save a comprehensive specification document to `PLAN_OUTPUT_DIRECTORY/<name-of-plan>.md` that can be used as a blueprint for actual development work. Follow the `Instructions` and work through the `Workflow` to create the plan.

## Variables

USER_PROMPT: $1
ORCHESTRATION_PROMPT: $2 - (Optional) Guidance for team assembly, task structure, and execution strategy
PLAN_OUTPUT_DIRECTORY: `specs/`
TEAM_MEMBERS: `.claude/agents/team/*.md`
GENERAL_PURPOSE_AGENT: `general-purpose`

## Instructions

- **PLANNING ONLY**: Do NOT build, write code, or deploy agents. Your only output is a plan document saved to `PLAN_OUTPUT_DIRECTORY`.
- If no `USER_PROMPT` is provided, stop and ask the user to provide it.
- If `ORCHESTRATION_PROMPT` is provided, use it to guide team composition, task granularity, dependency structure, and parallel/sequential decisions.
- Carefully analyze the user's requirements provided in the USER_PROMPT variable
- Determine the task type (chore|feature|refactor|fix|enhancement) and complexity (simple|medium|complex)
- Think deeply (ultrathink) about the best approach to implement the requested functionality or solve the problem
- Understand the codebase directly without subagents to understand existing patterns and architecture
- Follow the Plan Format below to create a comprehensive implementation plan
- Include all required sections and conditional sections based on task type and complexity
- Generate a descriptive, kebab-case filename based on the main topic of the plan
- Save the complete implementation plan to `PLAN_OUTPUT_DIRECTORY/<descriptive-name>.md`
- Ensure the plan is detailed enough that another developer could follow it to implement the solution
- Include code examples or pseudo-code where appropriate to clarify complex concepts
- Consider edge cases, error handling, and scalability concerns
- Understand your role as the team lead. Refer to the `Team Orchestration` section for more details.

### Team Orchestration

As the team lead, you have access to powerful tools for coordinating work across multiple agents. You NEVER write code directly - you orchestrate team members using these tools.

#### Task Management Tools

**TaskCreate** - Create tasks in the shared task list:
```typescript
TaskCreate({
  subject: "Implement user authentication",
  description: "Create login/logout endpoints with JWT tokens. See specs/auth-plan.md for details.",
  activeForm: "Implementing authentication"  // Shows in UI spinner when in_progress
})
// Returns: taskId (e.g., "1")
```

**TaskUpdate** - Update task status, assignment, or dependencies:
```typescript
TaskUpdate({
  taskId: "1",
  status: "in_progress",  // pending → in_progress → completed
  owner: "builder-auth"   // Assign to specific team member
})
```

**TaskList** - View all tasks and their status:
```typescript
TaskList({})
// Returns: Array of tasks with id, subject, status, owner, blockedBy
```

**TaskGet** - Get full details of a specific task:
```typescript
TaskGet({ taskId: "1" })
// Returns: Full task including description
```

#### Task Dependencies

Use `addBlockedBy` to create sequential dependencies - blocked tasks cannot start until dependencies complete:

```typescript
// Task 2 depends on Task 1
TaskUpdate({
  taskId: "2",
  addBlockedBy: ["1"]  // Task 2 blocked until Task 1 completes
})

// Task 3 depends on both Task 1 and Task 2
TaskUpdate({
  taskId: "3",
  addBlockedBy: ["1", "2"]
})
```

Dependency chain example:
```
Task 1: Setup foundation     → no dependencies
Task 2: Implement feature    → blockedBy: ["1"]
Task 3: Write tests          → blockedBy: ["2"]
Task 4: Final validation     → blockedBy: ["1", "2", "3"]
```

#### Owner Assignment

Assign tasks to specific team members for clear accountability:

```typescript
// Assign task to a specific builder
TaskUpdate({
  taskId: "1",
  owner: "builder-api"
})

// Team members check for their assignments
TaskList({})  // Filter by owner to find assigned work
```

#### Agent Deployment with Task Tool

**Task** - Deploy an agent to do work:
```typescript
Task({
  description: "Implement auth endpoints",
  prompt: "Implement the authentication endpoints as specified in Task 1...",
  subagent_type: "general-purpose",
  model: "opus",  // or "opus" for complex work, "haiku" for VERY simple
  run_in_background: false  // true for parallel execution
})
// Returns: agentId (e.g., "a1b2c3")
```

#### Resume Pattern

Store the agentId to continue an agent's work with preserved context:

```typescript
// First deployment - agent works on initial task
Task({
  description: "Build user service",
  prompt: "Create the user service with CRUD operations...",
  subagent_type: "general-purpose"
})
// Returns: agentId: "abc123"

// Later - resume SAME agent with full context preserved
Task({
  description: "Continue user service",
  prompt: "Now add input validation to the endpoints you created...",
  subagent_type: "general-purpose",
  resume: "abc123"  // Continues with previous context
})
```

When to resume vs start fresh:
- **Resume**: Continuing related work, agent needs prior context
- **Fresh**: Unrelated task, clean slate preferred

#### Parallel Execution

Run multiple agents simultaneously with `run_in_background: true`:

```typescript
// Launch multiple agents in parallel
Task({
  description: "Build API endpoints",
  prompt: "...",
  subagent_type: "general-purpose",
  run_in_background: true
})
// Returns immediately with agentId and output_file path

Task({
  description: "Build frontend components",
  prompt: "...",
  subagent_type: "general-purpose",
  run_in_background: true
})
// Both agents now working simultaneously

// Check on progress
TaskOutput({
  task_id: "agentId",
  block: false,  // non-blocking check
  timeout: 5000
})

// Wait for completion
TaskOutput({
  task_id: "agentId",
  block: true,  // blocks until done
  timeout: 300000
})
```

#### Orchestration Workflow

1. **Create tasks** with `TaskCreate` for each step in the plan
2. **Set dependencies** with `TaskUpdate` + `addBlockedBy`
3. **Assign owners** with `TaskUpdate` + `owner`
4. **Deploy agents** with `Task` to execute assigned work
5. **Monitor progress** with `TaskList` and `TaskOutput`
6. **Resume agents** with `Task` + `resume` for follow-up work
7. **Mark complete** with `TaskUpdate` + `status: "completed"`

## Workflow

IMPORTANT: **PLANNING ONLY** - Do not execute, build, or deploy. Output is a plan document.

1. Analyze Requirements - Parse the USER_PROMPT to understand the core problem and desired outcome
2. Understand Codebase - Without subagents, directly understand existing patterns, architecture, and relevant files
3. Design Solution - Develop technical approach including architecture decisions and implementation strategy
4. Define Team Members - Use `ORCHESTRATION_PROMPT` (if provided) to guide team composition. Identify from `.claude/agents/team/*.md` or use `general-purpose`. Document in plan.
5. Define Step by Step Tasks - Use `ORCHESTRATION_PROMPT` (if provided) to guide task granularity and parallel/sequential structure. Write out tasks with IDs, dependencies, assignments. Document in plan.
6. Generate Filename - Create a descriptive kebab-case filename based on the plan's main topic
7. Save Plan - Write the plan to `PLAN_OUTPUT_DIRECTORY/<filename>.md`
8. Save & Report - Follow the `Report` section to write the plan to `PLAN_OUTPUT_DIRECTORY/<filename>.md` and provide a summary of key components

## Plan Format

- IMPORTANT: Replace <requested content> with the requested content. It's been templated for you to replace. Consider it a micro prompt to replace the requested content.
- IMPORTANT: Anything that's NOT in <requested content> should be written EXACTLY as it appears in the format below.
- IMPORTANT: Follow this EXACT format when creating implementation plans:

```md
# Plan: <task name>

## Task Description
<describe the task in detail based on the prompt>

## Objective
<clearly state what will be accomplished when this plan is complete>

<if task_type is feature or complexity is medium/complex, include these sections:>
## Problem Statement
<clearly define the specific problem or opportunity this task addresses>

## Solution Approach
<describe the proposed solution approach and how it addresses the objective>
</if>

## Tech Stack
<list the technologies, languages, frameworks, and tools to be used>
- **Language**: <e.g., TypeScript, Python, JavaScript>
- **Framework**: <e.g., Next.js, Flask, vanilla — or "None" for zero-dependency>
- **Runtime**: <e.g., Browser, Node.js, Python 3.11+>
- **Key APIs/Libraries**: <e.g., HTML5 Canvas, Web Audio API, WebSocket>
- **Build Tools**: <e.g., None (single file), Vite, uv>
- **Testing**: <e.g., pytest, vitest, manual browser testing>

## Technical Design
<describe the architecture and key technical decisions that builders must follow>

### Architecture
<describe the overall system architecture — e.g., component diagram, data flow, module boundaries>

### Key Design Decisions
<list important technical decisions and their rationale — e.g., "Use object pooling for bullets to avoid GC stutter", "Single HTML file for zero-dependency deployment">

### Data Model
<describe key data structures, state shape, or schemas — e.g., entity objects, game state, API payloads>

### API / Interface Contracts
<if applicable, describe public interfaces, function signatures, or API endpoints that modules must implement>

<if task involves front-end / UI work, include this section:>
## UX/UI Design

### Figma / Design Reference
<link to Figma file, screenshot, or design reference if provided by the user. If none provided, state "No external design provided — ASCII wireframes below serve as the design spec.">

### Wireframes
<draw ASCII wireframes for each screen/view the builders need to implement. Be specific about layout, element placement, and responsive behavior.>

Example format:
```
┌─────────────────────────────────────────┐
│  Logo          Nav Item 1  Nav Item 2   │
├─────────────────────────────────────────┤
│                                         │
│   ┌──────────┐  ┌──────────┐           │
│   │  Card 1  │  │  Card 2  │           │
│   │          │  │          │           │
│   └──────────┘  └──────────┘           │
│                                         │
├─────────────────────────────────────────┤
│  Footer                                 │
└─────────────────────────────────────────┘
```

### Visual Style
<describe colors, typography, spacing, animations, and overall feel — e.g., "dark theme, neon accents, retro pixel font, glowing effects">

### User Flow
<describe the key user interactions step by step — e.g., "User lands on title screen → presses Enter → game starts → dies → game over screen → press Enter to restart">
</if>

## Relevant Files
Use these files to complete the task:

<list files relevant to the task with bullet points explaining why. Include new files to be created under an h3 'New Files' section if needed>

<if complexity is medium/complex, include this section:>
## Implementation Phases
### Phase 1: Foundation
<describe any foundational work needed>

### Phase 2: Core Implementation
<describe the main implementation work>

### Phase 3: Integration & Polish
<describe integration, testing, and final touches>
</if>

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- You're responsible for deploying the right team members with the right context to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to to the building, validating, testing, deploying, and other tasks.
  - This is critical. You're job is to act as a high level director of the team, not a builder.
  - You're role is to validate all work is going well and make sure the team is on track to complete the plan.
  - You'll orchestrate this by using the Task* Tools to manage coordination between the team members.
  - Communication is paramount. You'll use the Task* Tools to communicate with the team members and ensure they're on track to complete the plan.
- Take note of the session id of each team member. This is how you'll reference them.

### Team Members
<list the team members you'll use to execute the plan. You MUST always include at least one code-reviewer, one test-writer, and one validator.>

- Builder
  - Name: <unique name for this builder - this allows you and other team members to reference THIS builder by name. Take note there may be multiple builders, the name make them unique.>
  - Role: <the single role and focus of this builder will play>
  - Agent Type: <the subagent type of this builder, you'll specify based on the name in TEAM_MEMBERS file or GENERAL_PURPOSE_AGENT if you want to use a general-purpose agent>
  - Resume: <default true. This lets the agent continue working with the same context. Pass false if you want to start fresh with a new context.>
- <continue with additional builders as needed>

- Code Reviewer
  - Name: <unique name for this code reviewer>
  - Role: Review and fix code quality, efficiency, and reuse issues after builders complete their work
  - Agent Type: code-reviewer
  - Resume: false

- Test Writer
  - Name: <unique name for this test writer>
  - Role: Write comprehensive automated tests for the implemented code
  - Agent Type: test-writer
  - Resume: false

- Validator
  - Name: <unique name for this validator>
  - Role: Final read-only validation that all acceptance criteria are met and all tests pass
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

- IMPORTANT: Execute every step in order, top to bottom. Each task maps directly to a `TaskCreate` call.
- Before you start, run `TaskCreate` to create the initial task list that all team members can see and execute.

<list step by step tasks as h3 headers. Start with foundational work, then core implementation, then validation.>

### 1. <First Task Name>
- **Task ID**: <unique kebab-case identifier, e.g., "setup-database">
- **Depends On**: <Task ID(s) this depends on, or "none" if no dependencies>
- **Assigned To**: <team member name from Team Members section>
- **Agent Type**: <subagent from TEAM_MEMBERS file or GENERAL_PURPOSE_AGENT if you want to use a general-purpose agent>
- **Parallel**: <true if can run alongside other tasks, false if must be sequential>
- <specific action to complete>
- <specific action to complete>

### 2. <Second Task Name>
- **Task ID**: <unique-id>
- **Depends On**: <previous Task ID, e.g., "setup-database">
- **Assigned To**: <team member name>
- **Agent Type**: <subagent type from TEAM_MEMBERS file or GENERAL_PURPOSE_AGENT if you want to use a general-purpose agent>
- **Parallel**: <true/false>
- <specific action>
- <specific action>

### 3. <Continue Pattern — add as many build tasks as needed>

<MANDATORY POST-BUILD TASKS — these 3 tasks MUST always be the final tasks in every plan>

### N-2. Code Review
- **Task ID**: code-review
- **Depends On**: <all build task IDs>
- **Assigned To**: <code-reviewer team member>
- **Agent Type**: code-reviewer
- **Parallel**: false
- Review all files created/modified by builders for quality, efficiency, reuse, and accessibility issues
- Fix all issues found directly
- Report what was fixed and what was skipped

### N-1. Write Tests
- **Task ID**: write-tests
- **Depends On**: code-review
- **Assigned To**: <test-writer team member>
- **Agent Type**: test-writer
- **Parallel**: false
- Write comprehensive automated tests for the implemented code
- Cover: correctness, edge cases, error paths, data integrity
- Run all tests and ensure they pass
- Report coverage areas and results

### N. Validate Final Output
- **Task ID**: validate-all
- **Depends On**: code-review, write-tests
- **Assigned To**: <validator team member>
- **Agent Type**: validator
- **Parallel**: false
- Run all validation commands
- Run all automated tests
- Verify acceptance criteria met

<continue with additional build tasks as needed before the mandatory post-build tasks. Agent types must exist in .claude/agents/team/*.md>

## Pipeline

Every plan follows this mandatory execution pipeline:

```
Research (if needed) → Build → Code Review → Write Tests → Validate Final
```

- **Research**: Optional. Gather information needed before building.
- **Build**: Core implementation work by builder agents. Can be parallelized.
- **Code Review**: MANDATORY. code-reviewer agent reviews and fixes quality/efficiency/reuse issues.
- **Write Tests**: MANDATORY. test-writer agent creates automated tests for the implementation.
- **Validate Final**: MANDATORY. validator agent confirms all acceptance criteria met and all tests pass.

If the validator fails, the lead sends findings back to a builder to fix, then re-runs Code Review → Write Tests → Validate (max 2 retries).

## Acceptance Criteria
<list specific, measurable criteria that must be met for the task to be considered complete>
- Code review passes with no remaining quality issues
- All automated tests pass

## Validation Commands
Execute these commands to validate the task is complete:

<list specific commands to validate the work. Be precise about what to run>
- Example: `uv run python -m py_compile apps/*.py` - Test to ensure the code compiles

## Notes
<optional additional context, considerations, or dependencies. If new libraries are needed, specify using `uv add`>
```

## Report

After creating and saving the implementation plan, provide a concise report with the following format:

```
✅ Implementation Plan Created

File: PLAN_OUTPUT_DIRECTORY/<filename>.md
Topic: <brief description of what the plan covers>
Key Components:
- <main component 1>
- <main component 2>
- <main component 3>

Team Task List:
- <list of tasks, and owner (concise)>

Team members:
- <list of team members and their roles (concise)>

When you're ready, you can execute the plan in a new agent by running:
/cook <replace with path to plan>
```
