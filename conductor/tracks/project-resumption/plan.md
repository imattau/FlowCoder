# Implementation Plan: Project Resumption

## Phase 1: State Consolidation
- [ ] **Step 1.1:** Implement `getProjectSummary` in `StateManager`.
- [ ] **Step 1.2:** Add logic to find the "active" task from the `tasks/` directory.

## Phase 2: Orchestration
- [ ] **Step 2.1:** Update `ChatLoop.init()` to inject the summary into history.
- [ ] **Step 2.2:** Update `PlannerAgent` prompt to support proactive resumption.

## Phase 3: Verification
- [ ] **Step 3.1:** Test by creating a project, exiting, and restarting to see if the AI "remembers" the task.
