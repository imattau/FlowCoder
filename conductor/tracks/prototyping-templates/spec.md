# Specification: Prototyping & Templating (Tools-First)

## Overview
Transform FlowCoder into a "Logic Controller." The AI no longer generates large blocks of boilerplate from scratch; instead, it orchestrates industry-standard tools and internal templates.

## Key Components

### 1. The Scaffolder (`src/core/prototyping/scaffold.ts`)
- Drives system-level init tools: `npm init`, `cargo init`, `go mod init`, `composer init`.
- AI provides the metadata (project name, type); the tool provides the structure.

### 2. The Templating Engine (`src/core/prototyping/templates.ts`)
- Loads "Golden Patterns" from `.flowcoder/templates/`.
- Uses a templating language (e.g., Handlebars or simple string replacement).
- **Tool:** `apply_template(template_id, context_json)`.
- Allows 0.5B models to generate high-quality React/API code by just filling in variable schemas.

### 3. AST Refactorer (The Semantic Tool)
- Moves beyond string-based patching to Abstract Syntax Tree manipulation.
- **Tool:** `rename_symbol`, `extract_method`, `add_import`.
- Ensures total architectural consistency across files.

## Safety
- All scaffolding and templating operations are logged in `decisions.md`.
- Requires user permission before running external `init` commands.
