# Implementation Plan: Automated Reference Grounding

## Phase 1: Scanning & Auditing
- [ ] **Step 1.1:** Implement `scanDependencies` in `discovery.ts`.
- [ ] **Step 1.2:** Add `getAuditReport()` to `GlobalStateManager` to check for missing documentation.

## Phase 2: Automatic Persistence
- [ ] **Step 2.1:** Update `StateManager` to auto-index discovered local files into `references.md`.

## Phase 3: Proactive Execution
- [ ] **Step 3.1:** Update `ChatLoop` to include the Audit Report in the `ContextAgent` turn.
- [ ] **Step 3.2:** Verify the AI recommends fetching missing documentation for a new dependency.
