# Specification: Visual Loading Indicators

## Overview
Improve FlowCoder's transparency and user experience by providing clear visual feedback for all background operations. This includes spinners for thinking/loading states and progress bars for heavy tasks like model downloads.

## Key Components

### 1. Spinner Widget (`src/core/ui/blessed-ui-manager.ts`)
- A dedicated, non-blocking component that cycles through animation frames (e.g., `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`).
- Can be displayed in the status bar or the working area.

### 2. Progress Bar Widget
- A visual bar that fills based on a percentage (0-100).
- Used for:
  - Model downloading.
  - Large data fetching operations.
  - Long-running tool executions.

### 3. Action Feedback System
- Standardized status updates for user actions:
  - "Writing File: [path]..."
  - "Searching Codebase..."
  - "Analyzing build errors..."

## Benefits
- **Better UX:** User always knows if the system is working or stuck.
- **Professional Feel:** Modern, app-like feedback mechanisms.
- **Informative:** Clearly communicates the progress of heavy background tasks.
