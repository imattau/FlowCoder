# Implementation Plan: Predictive Model Warming

## Phase 1: Engine Preparation
- [ ] **Step 1.1:** Update `InferenceEngine` to support asynchronous loading (e.g., `loadInBackground()`).
- [ ] **Step 1.2:** Add `isLoaded()` check to `InferenceEngine`.

## Phase 2: Prediction & Warming
- [ ] **Step 2.1:** Implement prediction logic in `ChatLoop` for common agent transitions.
- [ ] **Step 2.2:** Call `loadInBackground()` for the predicted next model.

## Phase 3: Smart Management
- [ ] **Step 3.1:** Refine unloading strategy in `ChatLoop` to account for warming.
- [ ] **Step 3.2:** Add visual feedback to the status bar when a model is warmed.
