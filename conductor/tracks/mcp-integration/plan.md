# Implementation Plan: MCP Integration

## Phase 1: Infrastructure
- [ ] **Step 1.1:** Install MCP SDK (`@modelcontextprotocol/sdk`).
- [ ] **Step 1.2:** Implement `McpHost` to manage local stdio-based servers.
- [ ] **Step 1.3:** Create configuration in `config.ts` for a list of MCP servers to load on startup.

## Phase 2: Tool Bridge
- [ ] **Step 2.1:** Implement logic to fetch tool lists from MCP servers.
- [ ] **Step 2.2:** Update `PromptManager` to include tools discovered via MCP.
- [ ] **Step 2.3:** Update `ChatLoop` to route tool calls to the correct MCP server.

## Phase 3: Migration
- [ ] **Step 3.1:** Migrate existing tools (search, fetch_url) to local MCP servers or keep as "Internal" tools.
- [ ] **Step 3.2:** Verify with a sample external MCP server (e.g., a simple filesystem or search server).
