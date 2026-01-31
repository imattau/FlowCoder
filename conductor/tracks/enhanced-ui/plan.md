# Implementation Plan: Enhanced Terminal UI

## Phase 1: Terminal Primitives
- [x] **Step 1.1:** Implement `TerminalManager` with basic cursor control and screen clearing.
- [x] **Step 1.2:** Modify `ChatLoop` to use `TerminalManager` for all output.

## Phase 2: Bounded Input & Scrolling
- [x] **Step 2.1:** Refactor `readline` setup in `cli.ts` to fix prompt position.
- [x] **Step 2.2:** Implement output buffer and scrolling logic in `TerminalManager`.

## Phase 3: Dynamic Redrawing
- [ ] **Step 3.1:** Optimize screen updates to minimize flickering.
- [ ] **Step 3.2:** Integrate UI into all agent/tool outputs for consistent display.