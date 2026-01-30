# Implementation Plan: Mini-Agent Orchestration

## Phase 1: Multi-Model Management
- [x] **Step 1.1:** Update `ModelManager` to support a registry of models.
- [x] **Step 1.2:** Implement `EnginePool` to manage multiple `InferenceEngine` instances.
- [x] **Step 1.3:** Add configuration for "Agent-to-Model" mapping in `config.ts`.

## Phase 2: Agent Definitions
- [x] **Step 2.1:** Create `BaseAgent` class in `src/core/agents/base.ts`.
- [x] **Step 2.2:** Implement `PlannerAgent`.
- [x] **Step 2.3:** Implement `CoderAgent` (using `patch_file`).
- [x] **Step 2.4:** Implement `DebugAgent`.

## Phase 3: Orchestration Loop
- [x] **Step 3.1:** Implement `AgentFactory` to manage model-to-agent assignment.
- [x] **Step 3.2:** Update `ChatLoop` to use the `PlannerAgent` for turn decisions.
- [x] **Step 3.3:** Implement "Delegation" logic where one agent's output is passed to another's input.