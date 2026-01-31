# Specification: Model Lifecycle Management

## Overview
Optimize resource usage by managing the active state of GGUF models. Instead of keeping all models in memory, FlowCoder will load them on-demand and unload them when their operational phase is complete.

## Components

### 1. LazyInferenceEngine
- Extends `InferenceEngine` to store the `modelPath` but defer the actual `loadModel` call until `generateResponse` is invoked.

### 2. Explicit Unloading
- Adds a `dispose()` or `unload()` method to the engine that correctly releases the `LlamaModel` and `LlamaContext` references, allowing garbage collection and VRAM release.

### 3. Lifecycle Hooks in ChatLoop
- **Post-Planning Hook:** Unloads the 1.5B model once the `commandQueue` is populated.
- **On-Demand Loading:** Automatically re-loads the 0.5B model when the `DebugAgent` is triggered.

## Benefits
- **Resource Efficiency:** Significant reduction in idle RAM/VRAM.
- **Stability:** Prevents OOM (Out of Memory) crashes when switching between large planning models and coding models.
- **Flexibility:** Allows the use of larger models (e.g. 7B or 14B) for planning without starving the rest of the system during implementation.
