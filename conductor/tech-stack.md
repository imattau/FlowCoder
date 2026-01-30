# Tech Stack - FlowCoder

## Core Language & Runtime
- **TypeScript / Node.js:** Chosen for its flexibility, large ecosystem, and strong typing support.

## Application Interface
- **Command-Line Interface (CLI):** FlowCoder will operate primarily as a CLI tool, facilitating easy integration into various terminal-based workflows and editors.

## AI & Inference Engine
- **node-llama-cpp:** To handle local GGUF model inference with optimizations for CPU and optional GPU support.
- **GGUF Format:** The primary format for quantized models to ensure efficient local execution.

## Model Management
- **Hugging Face Hub:** Direct integration to authenticate, search, and download GGUF models.
- **@huggingface/hub:** Official JS/TS library to manage model discovery and downloads programmatically.

## System Tools & Context
- **Local Command Integration:** Extensive use of standard system utilities (`ripgrep` for fast searching, `find`, `diff`, `cmp`) to provide the AI with efficient, low-latency access to the codebase and filesystem.
- **Git Integration:** Native `git` bindings or CLI wrappers to understand project history, diffs, and uncommitted changes.
- **Documentation & API Fetching:** Tools to fetch and parse external documentation for enhanced context.

## Static Analysis & Quality
- **ESLint / Prettier:** For maintaining code quality and consistent formatting of generated code.
- **Custom Integrations:** Hooks for calling system-level linters and checkers (e.g., `pyright`, `rustc`, `shellcheck`) to validate AI-generated snippets based on the project context.

## Utilities
- **Commander.js or Oclif:** For building a robust and user-friendly CLI experience.
