# Implementation Plan: File-Based Handovers

## Phase 1: Context Infrastructure
- [ ] **Step 1.1:** Update `StateManager` to manage `.flowcoder/context/`.
- [ ] **Step 1.2:** Implement `ContextManager` utility to read/write `scratchpad.md`.

## Phase 2: Agent Refactoring
- [ ] **Step 2.1:** Refactor `BaseAgent` to support "Context-Aware" prompts.
- [ ] **Step 2.2:** Update `PatchAgent` and `DebugAgent` to prioritize reading the scratchpad.

## Phase 3: Orchestration
- [ ] **Step 3.1:** Update `ChatLoop` to write the Planner's intent to `scratchpad.md` before invoking specialized agents.
- [ ] **Step 3.2:** Verify that tiny models can successfully retrieve their tasks from the file system.
