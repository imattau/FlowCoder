# Implementation Plan: Visual Loading Indicators

## Phase 1: Indicator Components
- [ ] **Step 1.1:** Implement `Spinner` logic in `BlessedUIManager`.
- [ ] **Step 1.2:** Implement `ProgressBar` widget in `BlessedUIManager`.

## Phase 2: System Integration
- [ ] **Step 2.1:** Update `ModelManager` to use the progress bar during downloads.
- [ ] **Step 2.2:** Update `ChatLoop` to use spinners for "Thinking" and "Executing" phases.

## Phase 3: Action Feedback
- [ ] **Step 3.1:** Implement immediate status bar updates for all tool executions.
- [ ] **Step 3.2:** Verify indicators work seamlessly with the existing `blessed` layout.
