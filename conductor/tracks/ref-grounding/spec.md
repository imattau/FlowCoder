# Specification: Automated Reference Grounding

## Overview
FlowCoder should proactively ensure it has the correct API information for the project's dependencies. This move from "Passive Discovery" to "Active Auditing" ensures the AI is never guessing.

## Components

### 1. Dependency Scanner (`src/core/discovery.ts`)
- Implement `scanDependencies()`: Extracts core library names from project manifests.
- Supports: `package.json` (dependencies), `Cargo.toml`, `requirements.txt`.

### 2. Reference Auditor
- Compares scanned dependencies against:
  - Global Cache (`~/.flowcoder/global_references/`)
  - Local Project Cache (`references.md`)
- Generates a "Grounding Audit" report.

### 3. Automatic Indexer (`src/core/state.ts`)
- Discovered local documentation (README, etc.) is automatically appended to `references.md` if not already indexed.

### 4. ContextAgent Integration
- The `ContextAgent` receives the Audit Report.
- Action: "I noticed you are using 'express' but I don't have its API reference cached. Should I fetch it?"

## Benefits
- **Bulletproof Grounding:** AI always has the "source of truth."
- **Reduced Latency:** Uses global cache whenever possible.
- **Proactive Improvement:** The reference library grows organically with every new project.
