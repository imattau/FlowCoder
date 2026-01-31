# Implementation Plan: Universal Context Discovery

## Phase 1: Broad Scanning
- [ ] **Step 1.1:** Update `discovery.ts` to include an `ExternalContext` scanner.
- [ ] **Step 1.2:** Add logic to read and summarize the first 1000 characters of discovered context files.

## Phase 2: State Adoption
- [ ] **Step 2.1:** Modify `StateManager.getProjectSummary()` to merge external context.
- [ ] **Step 2.2:** Update `ChatLoop.init()` to alert the user if external context was "adopted."

## Phase 3: Verification
- [ ] **Step 3.1:** Create a mock project with a `.cursorrules` file and verify FlowCoder reads it on startup.
