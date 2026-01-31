# Specification: Specialized Coder Agents

## Overview
Decompose the general `CoderAgent` into high-precision mini-agents. Each agent is designed to perform one type of coding task exceptionally well, often using the smallest possible model (0.5B - 1.5B).

## New Agent Roles

### 1. PatchAgent (The Sniper)
- **Model:** 0.5B - 1.5B.
- **Task:** Take a high-level instruction and a code block, then output a precise `<search>/<replace>` patch.
- **Goal:** Minimize errors in text substitution.

### 2. BoilerplateAgent (The Builder)
- **Model:** 1.5B.
- **Task:** Generating entire new files or large structural components using `write_file` or `scaffold_project`.

### 3. TemplateAgent (The Weaver)
- **Model:** 0.5B.
- **Task:** Specialized in mapping user data to the `apply_template` tool.

### 4. RefactorAgent (The Semanticist)
- **Model:** 1.5B.
- **Task:** Driving the AST `refactor_rename` tool and managing semantic consistency.

## Orchestration
- The `PlannerAgent` becomes the "Dispatcher," deciding which specialized coder to invoke based on the task complexity.
