# Specification: LSP Integration & Advanced Indexing

## Overview
Integrate FlowCoder with Language Server Protocol (LSP) servers. This provides precise, language-aware understanding of the codebase, allowing agents to query symbols, find definitions, and locate references with high accuracy.

## Key Components

### 1. LSP Client Host (MCP Server)
- An MCP server specifically designed to host and communicate with LSP servers (e.g., `typescript-language-server`, `rust-analyzer`).
- Exposes LSP functionalities as MCP tools.

### 2. New Tools (`src/core/tools.ts` or MCP-exposed)
- `lsp_find_definition(file_path, line, character)`: Navigates to a symbol's definition.
- `lsp_find_references(file_path, line, character)`: Lists all usages of a symbol.
- `lsp_list_symbols(file_path)`: Lists all symbols in a given file.
- `lsp_get_type_definition(file_path, line, character)`: Gets the type definition of a symbol.

### 3. Agent Integration
- **ContextAgent:** Will use `lsp_list_symbols` and `lsp_find_references` to build a more accurate architectural understanding.
- **DebugAgent:** Will use `lsp_find_definition` to pinpoint error locations.
- **RefactorAgent:** (Future) Would coordinate with LSP to ensure refactorings are semantically correct across the codebase.

## Benefits
- **Precision:** Eliminates guesswork in code navigation and analysis.
- **Reduced Context:** AI queries only the relevant symbol information, not entire files.
- **Language Agnostic:** Works with any language that has an LSP server.
- **Foundation for AST:** Provides the necessary symbol resolution for advanced AST transformations.
