# Specification: Project Resumption

## Overview
Enable FlowCoder to pick up existing projects seamlessly. On startup, the system should automatically read the `.flowcoder/` folder to understand the project's identity, current goals, and active task history.

## Components

### 1. State Grounding (`src/core/state.ts`)
- Implement `getProjectSummary()`:
  - Reads `project.json` (Goals, Conventions).
  - Finds the most recent task in `tasks/`.
  - Reads the last 3 entries in `decisions.md`.

### 2. Context Injection (`src/core/chat-loop.ts`)
- During `init()`, if project state exists, prepend a `system` message: "You are resuming work on an existing project. Here is the current state: [Summary]".

### 3. Proactive Agent Prompting
- The `PlannerAgent` is instructed: "If you detect an active task, start by summarizing what has been done and what the immediate next step should be."

## Benefits
- **No Cold Starts:** You don't have to explain the project every time you open the CLI.
- **Consistency:** AI adheres to previously logged conventions and decisions automatically.
- **Continuity:** Transition between sessions feels natural.
