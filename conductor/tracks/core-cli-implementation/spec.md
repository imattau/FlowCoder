# Specification: Core CLI Implementation

## Overview
The Core CLI Implementation establishes the foundational `flowcoder` executable. It enables users to interact with local GGUF models, manages model downloading, and provides a basic context-aware chat interface.

## User Experience
- **Installation:** `npm install -g flowcoder` (or run from source).
- **First Run:** `flowcoder init` or auto-detection to download a default model.
- **Interactive Mode:** `flowcoder chat` opens a REPL.
  - User types a query.
  - AI analyzes context (cwd).
  - AI may execute read/search tools.
  - AI responds with code or explanation.

## Architecture Components

### 1. CLI Entry Point (`src/cli.ts`)
- Uses `commander` for argument parsing.
- Handles commands: `chat`, `model`, `config`.

### 2. Model Manager (`src/core/model-manager.ts`)
- Interface to `node-llama-cpp`.
- Manages storage location (default: `~/.flowcoder/models`).
- Downloads GGUF models from Hugging Face if missing.
- Default Model: `Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF` (or similar efficient local model).

### 3. Context Engine (`src/core/context.ts`)
- **File System:** Safe wrappers for `fs.readFile`, `glob`.
- **Search:** Wrapper around `ripgrep` (or fallback to recursive find/grep).
- **Git:** Wrapper for `git status`, `git diff`.
- **Docs:** Fetcher for external URLs (HTML -> Markdown conversion).

### 4. Inference Engine (`src/core/inference.ts`)
- Manages the `LlamaContext` and `LlamaSession`.
- Handles system prompts and prompt templates (ChatML/Alpaca).
- Stream response handling.

### 5. Tool System (`src/core/tools.ts`)
- Defines available tools for the LLM:
  - `read_file(path)`
  - `list_files(path)`
  - `search(query)`
  - `run_cmd(command)` (Restricted/Safe mode)
  - `fetch_url(url)` (Read external docs/APIs)

### 6. Project State & Memory (`src/core/state.ts`)
- **Storage:** Persists state in `.flowcoder/`.
- **Structure:**
  - `project.json`: Overall project context, goals, and conventions.
  - `tasks/task-[id].json`: Specific active task state, history, and plan.
  - `decisions.md`: Log of architectural decisions (ADRs) and key choices.
  - `references.md`: List of pinned documentation links, file pointers, and external snippets.
- **Workflow:** AI reads/updates these files to maintain continuity and context across sessions.

## key Constraints
- **Performance:** Must run effectively on CPU (Apple Silicon or x64 AVX2).
- **Memory:** Default context size should be conservative (e.g., 4096 or 8192 tokens) to prevent OOM on 8GB machines.
- **Safety:**
  - **Sandboxing:** Commands run in a restricted environment by default (e.g., using Docker or a restricted shell environment if feasible, or strict path/command allowlists).
  - **Permissions:** Destructive commands (`rm`, `mv`, write operations) and network requests require explicit user confirmation unless whitelisted.
