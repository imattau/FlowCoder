# Implementation Plan: Specialized Coder Agents

## Phase 1: Agent Definition
- [ ] **Step 1.1:** Update `src/core/agents/base.ts` with new specialized classes.
- [ ] **Step 1.2:** Implement precise system prompts for each specialized agent.

## Phase 2: Factory & Loop
- [ ] **Step 2.1:** Update `AgentFactory` to register and provide access to the new agents.
- [ ] **Step 2.2:** Update `ChatLoop` to support multi-agent delegation within a single turn.

## Phase 3: Model Mapping
- [ ] **Step 3.1:** Map `PatchAgent` and `TemplateAgent` to the `tinyEngine` (0.5B).
- [ ] **Step 3.2:** Verify that tiny models can handle these specialized tasks effectively.
