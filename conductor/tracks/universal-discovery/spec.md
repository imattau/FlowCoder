# Specification: Universal Context Discovery

## Overview
FlowCoder should be able to ground itself in projects that don't have a `.flowcoder` folder yet. It must detect and "adopt" existing context from other AI tools and standard project documentation.

## Discovery Targets
- **Cursor:** `.cursorrules`
- **Claude:** `CLAUDE.md`
- **Windsurf:** `.windsurfrules`
- **Standard Docs:** `README.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`
- **Git Context:** `.git/COMMIT_EDITMSG` (for last task)

## Components

### 1. Discovery Engine (`src/core/discovery.ts`)
- Implement `findExternalContext()`: Scans the CWD for the targets listed above.
- Parses these files to extract:
  - Project Goals
  - Tech Stack
  - Coding Conventions

### 2. Adoption Logic (`src/core/state.ts`)
- If `.flowcoder` is missing, use the discovered external context to create a first-turn `project.json`.
- Prepend external findings to the `getProjectSummary()` output.

## Benefits
- **Zero Configuration:** AI is immediately useful on any repository.
- **Interoperability:** Leverages work already done in other tools.
- **Improved Grounding:** Deeper understanding of legacy projects.
