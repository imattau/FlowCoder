# Specification: Enhanced Terminal UI

## Overview
Transform the FlowCoder CLI into a more structured terminal application. The user input prompt will be fixed at the bottom of the screen, and the AI's output, tool execution, and contextual information will be displayed in a scrollable "Working Area" above it.

## Key Components

### 1. Terminal Manager (`src/core/ui/terminal-manager.ts`)
- Manages the terminal state: cursor position, screen clearing, and scrolling.
- Provides primitives to write to specific areas of the screen.

### 2. Bounded Input
- `readline`'s prompt is always redrawn on the last line.

### 3. Scrollable Working Area
- AI output, tool results, and system messages are buffered.
- When the buffer exceeds the available lines (terminal height - input lines), the content scrolls.

### 4. Dynamic Redrawing
- Efficiently updates only the changed parts of the screen to prevent flickering.

## Benefits
- **App-like Experience:** Clear separation of input and output.
- **Improved Readability:** Easier to follow long AI turns and tool outputs.
- **Dedicated Working Space:** More room for displaying code, diffs, and context.
