# Specification: File-Based Handovers

## Overview
Reduce model context usage by using disk-based "Shared State." Instead of passing 5000 tokens of chat history to a tiny 0.5B model, we pass a tiny prompt that points the model to a "Context File" it can read using `read_file`.

## Key Components

### 1. The Context Buffer (`.flowcoder/context/`)
- **`scratchpad.md`**: A shared text area where the Planner drafts instructions or the Debugger logs analysis.
- **`handoff.json`**: Structured metadata for the next agent in the sequence.

### 2. Prompt Compression
- Agents are instructed to "Read the scratchpad for the latest state."
- Only the **immediate instruction** is passed in the prompt string.

### 3. State Persistence
- Since the state is on disk, if FlowCoder crashes or the model turn fails, the intermediate "thought" is preserved in the scratchpad.

## Benefits
- **Token Efficiency:** Saves thousands of context tokens on multi-agent turns.
- **Improved Accuracy:** Smaller models perform better when they only have to process relevant context.
- **Persistence:** Clear audit trail of agent handovers on disk.
