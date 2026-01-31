# Implementation Plan: MCP Integration

## Phase 1: Infrastructure
- [x] **Step 1.1:** Install MCP SDK (`@modelcontextprotocol/sdk`).
- [x] **Step 1.2:** Implement `McpHost` to manage local stdio-based servers.
- [x] **Step 1.3:** Create configuration in `config.ts` for a list of MCP servers to load on startup.

## Phase 2: Tool Bridge
- [x] **Step 2.1:** Implement logic to fetch tool lists from MCP servers.
- [x] **xStep 2.2:** Update `PromptManager` to include tools discovered via MCP.
- [x] **Step 2.3:** Update `ChatLoop` to route tool calls to the correct MCP server.

## Phase 3: Migration
- [x] **Step 3.1:** Migrate existing tools (search, fetch_url) to local MCP servers or keep as "Internal" tools.
- [x] **Step 3.2:** Verify with a sample external MCP server (e.g., a simple filesystem or search server).