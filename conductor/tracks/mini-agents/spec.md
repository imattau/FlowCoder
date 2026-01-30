# Specification: Mini-Agent Orchestration

## Overview
Instead of a single monolithic model turn, FlowCoder will delegate sub-tasks to specialized "Mini-Agents" powered by tiny models (e.g., Qwen 0.5B for search, 1.5B for patching).

## Agent Roles

### 1. The Planner (Orchestrator)
- **Model:** 1.5B or 3B.
- **Task:** Analyze user request and break it down into tool calls or delegation to other agents.

### 2. The Searcher
- **Model:** 0.5B.
- **Task:** Specialized in interpreting `search` and `list_symbols` results to find the correct file/line.

### 3. The Patcher
- **Model:** 1.5B (Coder optimized).
- **Task:** Takes a specific code block and the desired change, and outputs a precise `<search>/<replace>` pair.

### 4. The Reviewer (Self-Healer) / DebugAgent
- **Model:** 0.5B - 1.5B.
- **Task:** Interprets build/test errors, logs, and stack traces. Provides a summarized "Correction Plan" to the CoderAgent.
- **Trigger:** Activated automatically when a verification loop (Self-Healing) fails.

## Architecture Change
- `InferenceEngine` becomes a pool or factory.
- `ChatLoop` manages a "Chain of Thought" that may span multiple models.
- **Model Switching:** Use `node-llama-cpp` to efficiently swap or keep multiple models in VRAM/RAM if resources permit.
