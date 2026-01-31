# Implementation Plan: Status Bar & Contextual Indicators

## Phase 1: Terminal Manager Integration
- [x] **Step 1.1:** Update `TerminalManager` to reserve 1-2 lines for the status bar below the prompt.
- [x] **Step 1.2:** Add `writeStatusBar()` method to `TerminalManager` to update specific sections.

## Phase 2: Status Orchestration
- [x] **Step 2.1:** Update `ChatLoop` to send AI status updates to `TerminalManager`.
- [x] **Step 2.2:** Update `cli.ts` to display CWD, loaded models, and initial status.

## Phase 3: Dynamic Updates
- [ ] **Step 3.1:** Ensure status bar updates efficiently without flickering.
- [ ] **Step 3.2:** Verify all relevant status changes are reflected in real-time.