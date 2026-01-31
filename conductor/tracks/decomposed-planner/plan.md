# Implementation Plan: Decomposed Planner Pipeline

## Phase 1: Pipeline Agents
- [ ] **Step 1.1:** Implement `IntentAgent` and `ContextAgent` in `src/core/agents/base.ts`.
- [ ] **Step 1.2:** Update `PlannerAgent` to act as the `DispatcherAgent`.

## Phase 2: Pipeline Orchestration
- [ ] **Step 2.1:** Update `AgentFactory` to register the new pipeline agents.
- [ ] **Step 2.2:** Refactor `ChatLoop.processInput` to execute the sequence: Intent -> Context -> Dispatch.

## Phase 3: Model Optimization
- [ ] **Step 3.1:** Map `IntentAgent` and `ContextAgent` to the `tinyEngine` (0.5B).
- [ ] **Step 3.2:** Verify that the 0.5B model can effectively categorize and gather context.
