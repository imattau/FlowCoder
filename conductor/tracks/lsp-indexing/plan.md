# Implementation Plan: LSP Integration & Advanced Indexing

## Phase 1: LSP Server Integration (MCP)
- [ ] **Step 1.1:** Add `typescript-language-server` to `package.json`.
- [ ] **Step 1.2:** Implement an MCP Server for LSP (or find an existing one) that exposes LSP functions as tools.
- [ ] **Step 1.3:** Configure `config.ts` to load this LSP MCP server.

## Phase 2: Tool Exposure
- [ ] **Step 2.1:** Ensure MCP server exposes `lsp_find_definition`, `lsp_find_references`, `lsp_list_symbols`.
- [ ] **Step 2.2:** Update `PromptManager` to include these new tools.

## Phase 3: Agent Orchestration
- [ ] **Step 3.1:** Update `ContextAgent` prompt to prioritize using LSP tools for context gathering.
- [ ] **Step 3.2:** Update `DebugAgent` prompt to use `lsp_find_definition` when analyzing code errors.
