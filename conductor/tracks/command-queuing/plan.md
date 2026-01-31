# Implementation Plan: Command Queuing

## Phase 1: Parsing & Storage
- [ ] **Step 1.1:** Update `PromptManager.parseToolCall` to `parseToolCalls` (returning an array).
- [ ] **Step 1.2:** Add `queue` property to `ChatLoop` state.

## Phase 2: User Interface
- [ ] **Step 2.1:** Implement `displayQueue()` helper to print colorized list of actions.
- [ ] **Step 2.2:** Add multi-choice confirmation prompt (Run All / Step / Abort).

## Phase 3: Execution Engine
- [ ] **Step 3.1:** Refactor tool execution logic into a `drainQueue()` method.
- [ ] **Step 3.2:** Ensure verification (Self-Healing) happens after relevant steps in the queue.
