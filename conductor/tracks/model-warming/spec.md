# Specification: Predictive Model Warming

## Overview
Reduce perceived latency by proactively loading the next logical model into memory *before* it's actually needed. This makes transitions between AI thinking phases (e.g., Dispatcher to Coder) much faster.

## Key Components

### 1. Prediction Logic (`src/core/chat-loop.ts`)
- After each agent's turn, `ChatLoop` will analyze the context and predict the next most likely agent/model to be used.
- Prediction will be based on hardcoded transitions (e.g., Intent -> Context -> Dispatcher -> Coder/Debugger).

### 2. Asynchronous Model Loading (`src/core/inference.ts`)
- `InferenceEngine`'s `ensureLoaded()` method should be capable of being called without blocking the main execution loop.
- Potentially a new `loadInBackground()` method.

### 3. Smart Unloading
- Instead of immediately unloading, `ChatLoop` will manage a small "cooldown" period or reference counter for recently used models.
- Heavy models (like the Dispatcher) are still prioritized for unloading but with awareness of the immediate next steps.

## Benefits
- **Reduced Latency:** Transitions between agents feel instant.
- **Seamless Interaction:** Eliminates pauses while models load.
- **Improved User Experience:** Makes FlowCoder feel significantly more responsive.
