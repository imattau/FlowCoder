# Specification: Command Queuing

## Overview
Move from single-action turns to a batch-capable queue. The AI can propose a series of steps (e.g., read, patch, test) which are queued for user approval and sequential execution.

## Components

### 1. Multi-Action Parser
- Updates `PromptManager` to use global regex matching for all `<tool_call>` tags.
- Collects an array of tool call objects.

### 2. The Queue Manager
- Visualizes the proposed list of actions in the terminal.
- Allows user interaction:
  - **(A)pprove All:** Run the entire queue without further prompts.
  - **(S)tep:** Run the next action and ask again.
  - **(E)dit:** (Future) Manually modify a tool call.
  - **(C)ancel:** Clear the queue.

### 3. Loop Integration
- `ChatLoop` checks the queue after each turn.
- If the queue is empty, it asks the Planner for more input.
- If not empty, it drains the queue one-by-one.

## UX
- Color-coded list numbering.
- Clear status indicators for "Pending", "Running", and "Done".
