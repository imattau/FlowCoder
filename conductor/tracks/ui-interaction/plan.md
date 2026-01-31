# Implementation Plan: Robust UI Interaction & Output Management

## Phase 1: Esc Interruption & Command Indicator
- [x] **Step 1.1:** Refactor `readline` setup in `cli.ts` to detect `Esc` key.
- [x] **Step 1.2:** Implement graceful interruption logic in `ChatLoop`.
- [x] **Step 1.3:** Add visual indicator (spinner) to the `!` command execution in `cli.ts`.

## Phase 2: Output Rerouting
- [x] **Step 2.1:** Modify `execSync` calls in `cli.ts` (for `! <cmd>`) to capture `stdout` and `stderr`.
- [x] **Step 2.2:** Route captured output to `TerminalManager.write`.

## Phase 3: Consolidation
- [ ] **Step 3.1:** Verify all output (AI, tool, shell) correctly appears in the working area.
- [ ] **Step 3.2:** Ensure prompt maintains its bounded position.
