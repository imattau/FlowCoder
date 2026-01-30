# Specification: MCP Integration

## Overview
Migrate FlowCoder's tool system to use the Model Context Protocol (MCP). This allows FlowCoder to act as an MCP Host, consuming tools and resources from any compliant MCP Server.

## Architecture

### 1. McpHost (`src/core/mcp/host.ts`)
- Manages the lifecycle of MCP server connections.
- Supports Stdio and (eventually) HTTP transports.
- Handles tool discovery and capability negotiation.

### 2. McpToolBridge
- Automatically maps discovered MCP tools into the `tools` registry used by agents.
- Translates between FlowCoder's tool format and MCP's JSON-RPC protocol.

### 3. Resource Integration
- Allows agents to browse and read MCP "Resources" (static data/docs) alongside the local filesystem.

## Benefits
- **Extensibility:** Instantly add tools like Brave Search, GitHub API, or Postgres by pointing to an MCP server.
- **Reliability:** Uses standardized JSON-schema for tool definitions.
- **Isolation:** Tools run in separate processes.
