# Specification - mvp_core_20260131: FlowCoder MVP

## Overview
This track focuses on building the foundational Command-Line Interface (CLI) for FlowCoder and integrating local GGUF model inference using `node-llama-cpp`. The goal is to provide a functional chat interface where users can interact with a locally running AI model.

## Functional Requirements
- **CLI Framework:** Initialize a robust CLI using a framework like Commander.js or Oclif.
- **Model Inference:** Integrate `node-llama-cpp` to load and run GGUF models on the local CPU (with optional GPU support).
- **Interactive Chat:** Implement a simple chat loop (`chat` command) where users can send prompts and receive streaming or buffered responses from the local model.
- **Basic Configuration:** Allow users to specify the path to a local GGUF model file.

## Technical Constraints
- **Runtime:** Node.js (TypeScript).
- **Inference:** Must use `node-llama-cpp`.
- **Hardware:** Primary optimization for CPU-only execution.

## Future Scope (Out of this Track)
- Hugging Face Hub integration.
- Codebase context awareness (ripgrep, git).
- Static analysis integration.
