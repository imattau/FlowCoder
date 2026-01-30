# Specification: Autonomy Engine (Vibecoding)

## Overview
The Autonomy Engine upgrades FlowCoder from a manual tool-executor to an autonomous assistant that can plan, implement, verify, and fix its own code.

## Key Components

### 1. Semantic Patching (`patch_file`)
- Instead of overwriting files, the AI will use a search-and-replace block.
- Format:
  ```xml
  <search>old code</search>
  <replace>new code</replace>
  ```
- Handles indentation and partial matches gracefully.

### 2. The Verification Loop (Self-Healing)
- AI can now run "Background Tasks" (Tests/Linting).
- When a `write_file` or `patch_file` occurs, the AI can be instructed to automatically run a verification command.
- Failure output is fed back into the chat history as a system message: "Verification failed with error: ... Please fix."

### 3. Project Mapping (`list_symbols`)
- Automated generation of a project summary.
- Uses `grep` or `ctags` to list classes, functions, and exports.
- Injected into the system prompt to provide "Global Navigation" context.

### 4. Interactive Diffs
- Before applying a change, the CLI displays a terminal-based diff (unified diff format).
- User confirms: "Vibe check passed? [y/N]"

## Safety
- `patch_file` is subject to the same `CommandGuard` path restrictions as `write_file`.
