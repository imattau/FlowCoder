# Specification: Terminal UI Framework Migration

## Overview
Migrate FlowCoder's terminal UI from manual `readline` and ANSI escape code management to the `blessed` library. This will resolve persistent rendering issues, improve UI stability, and provide a more robust foundation for complex terminal interactions.

## Key Components

### 1. BlessedUIManager (`src/core/ui/blessed-ui-manager.ts`)
- Replaces `TerminalManager` entirely.
- Manages the `blessed` screen instance.
- Creates and orchestrates `blessed` widgets for:
  - **Working Area:** A `log` or `box` widget that handles scrolling AI output, tool results, and system messages.
  - **Input Area:** A `textbox` or custom input widget for user commands.
  - **Status Bar:** A `text` or `box` widget for displaying dynamic status information.

### 2. Input Handling Integration
- `blessed` will manage all keyboard input events.
- `cli.ts` will integrate with `blessed`'s input events (`key`, `submit`) instead of `readline`.

### 3. Output Routing
- All `tm.write` calls from `ChatLoop` and `cli.ts` will be rerouted to update the `blessed` working area.
- `tm.writeStatusBar` calls will update the `blessed` status bar widget.

### 4. Ora Integration
- `ora` spinners need to be replaced or adapted to update `blessed` widgets, as `ora` directly writes to `stdout`/`stderr`. A simpler approach might be to use custom `blessed` spinners or dynamic text updates in the status bar/working area.

## Benefits
- **Stability:** `blessed` handles low-level terminal complexities, reducing rendering bugs.
- **Maintainability:** UI code becomes more structured and easier to extend.
- **Rich Features:** Access to `blessed`'s powerful widget set for future enhancements.
- **True App-like Feel:** Provides a fully controlled, consistent terminal application experience.
