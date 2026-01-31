# Specification: Decomposed Planner Pipeline

## Overview
Decompose the monolithic planning turn into a three-stage pipeline. Each stage is handled by a specialized agent, potentially using different models.

## New Agent Roles

### 1. IntentAgent
- **Model:** 0.5B (Tiny).
- **Task:** Categorize the user request (e.g., "Feature", "Fix", "Refactor", "General Question").
- **Goal:** Rapid initial classification.

### 2. ContextAgent
- **Model:** 0.5B (Tiny).
- **Task:** Drive discovery tools (`search`, `list_symbols`, `read_file`) based on the intent.
- **Goal:** Fill the `scratchpad.md` with relevant technical context *before* the dispatcher runs.

### 3. DispatcherAgent
- **Model:** 1.5B.
- **Task:** Take the Intent and the gathered Context, then write the final "Execution Plan" to `scratchpad.md` and select the Coder.
- **Goal:** High-quality reasoning grounded in pre-verified data.

## Workflow Change
1. `ChatLoop` calls `IntentAgent`.
2. `ChatLoop` calls `ContextAgent` (may repeat until context is deemed sufficient).
3. `ChatLoop` calls `DispatcherAgent`.
4. Dispatcher selects the Specialized Coder.
