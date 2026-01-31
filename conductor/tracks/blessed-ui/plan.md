# Implementation Plan: Terminal UI Framework Migration

## Phase 1: Blessed Core Integration
- [ ] **Step 1.1:** Install `blessed`.
- [ ] **Step 1.2:** Create `src/core/ui/blessed-ui-manager.ts` and replace `TerminalManager`.
- [ ] **Step 1.3:** Instantiate `blessed` screen and basic widgets (working area, input, status bar).

## Phase 2: Input & Output Rerouting
- [ ] **Step 2.1:** Modify `cli.ts` to replace `readline` with `blessed`'s input event handling.
- [ ] **Step 2.2:** Update `ChatLoop`'s output calls to write to `blessed` widgets.
- [ ] **Step 2.3:** Re-implement `ora` spinners using `blessed`'s capabilities or simplify to text updates.

## Phase 3: Feature Parity & Cleanup
- [ ] **Step 3.1:** Re-implement `Esc` interruption and `Ctrl+C` handling.
- [ ] **Step 3.2:** Ensure dynamic prompt styling and command queue display work.
- [ ] **Step 3.3:** Remove all remnants of `readline` and direct ANSI writes.
