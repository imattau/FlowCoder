# Specification: Robust UI Interaction & Output Management

## Overview
Refine FlowCoder's terminal UI for improved user control and clearer feedback. Focus on responsive interruptions and proper output routing.

## Key Components

### 1. Esc Interruption
- **Functionality:** Pressing `Esc` during an AI turn or tool execution should gracefully cancel the current operation and return control to the prompt.
- **Implementation:**
  - `readline` raw mode detection of `Esc` key.
  - Signal propagation to interrupt `execSync` processes or `fetch` calls.

### 2. Command Execution Indicator
- **Functionality:** When a shell command (`! <cmd>`) is running, provide a visual cue in the command line area itself (e.g., spinner, changing prompt color).
- **Implementation:**
  - `ora` spinner or similar directly in the prompt line.

### 3. Output Stream Rerouting
- **Problem:** Command output from `execSync` is currently appearing below the command line.
- **Goal:** All output, especially from shell commands, must appear in the scrollable working area managed by `TerminalManager`.
- **Implementation:**
  - Intercept `execSync` output and pipe it to `TerminalManager.write`.
  - Ensure `stdio: "pipe"` is used, then `stdout` and `stderr` are explicitly read.

## Benefits
- **User Control:** Graceful interruption prevents unwanted AI actions or long waits.
- **Clarity:** Instant visual feedback on command status.
- **Consistency:** All output is unified in the working area, maintaining the app-like layout.
