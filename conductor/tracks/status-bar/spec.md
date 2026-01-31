# Specification: Status Bar & Contextual Indicators

## Overview
Enhance the FlowCoder terminal UI with a persistent status bar below the command line. This bar will provide real-time, at-a-glance information about the current session and AI state.

## Key Components

### 1. Status Bar Area (`src/core/ui/terminal-manager.ts`)
- Reserves an additional fixed number of lines (e.g., 1 or 2) at the very bottom of the terminal.
- This area is separate from the scrollable working area and the command line.

### 2. Dynamic Content Update
- `TerminalManager` provides methods to write text to specific cells/sections within the status bar.
- Content includes:
  - **Current Working Directory (CWD):** Always visible.
  - **Loaded Model:** Displays the name of the currently active AI model(s).
  - **AI Status:** "Thinking...", "Awaiting User Input", "Idle", "Executing Tool: [ToolName]".
  - **Task ID:** Current active task ID.

### 3. Orchestration (`src/core/chat-loop.ts` & `src/cli.ts`)
- `ChatLoop` sends status updates to `TerminalManager` as AI phases change.
- `cli.ts` provides initial status (e.g., CWD, initial model names).

## Benefits
- **At-a-glance Context:** Always know the project context and AI's state.
- **Improved Transparency:** Clearer indication of background processes.
- **Enhanced App-like Feel:** Adds a professional touch to the terminal UI.
