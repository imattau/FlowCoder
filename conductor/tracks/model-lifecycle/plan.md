# Implementation Plan: Model Lifecycle Management

## Phase 1: Engine Upgrades
- [ ] **Step 1.1:** Update `InferenceEngine` to support lazy loading and a `dispose()` method.
- [ ] **Step 1.2:** Update `ModelManager` to provide paths without forced loading.

## Phase 2: Strategic Unloading
- [ ] **Step 2.1:** Implement "Phase-Based Cleanup" in `ChatLoop`.
- [ ] **Step 2.2:** Unload the heavy Dispatcher model as soon as the queue starts draining.

## Phase 3: Monitoring & Logging
- [ ] **Step 3.1:** Add visual feedback when a model is being loaded/unloaded.
- [ ] **Step 3.2:** Verify resource release using simple telemetry.
