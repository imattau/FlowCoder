# Implementation Plan: Prototyping & Templating

## Phase 1: Scaffolding Tooling
- [ ] **Step 1.1:** Implement `scaffold_project` tool.
    - Logic to map "Project Type" to system commands.
    - *Verification:* AI can successfully initialize a new Node or Rust project.

## Phase 2: Template System
- [ ] **Step 2.1:** Create Template Library structure.
    - Directory: `.flowcoder/templates/`.
    - Initial templates: `express-route`, `react-component`, `typescript-class`.
- [ ] **Step 2.2:** Implement `apply_template` tool.
    - Use `handlebars` or similar for robust injection.
    - *Verification:* AI generates a perfect component by providing only `name` and `props`.

## Phase 3: Semantic Refactoring
- [ ] **Step 3.1:** Integrate AST tool (e.g., a mini-MCP server for `ts-morph`).
- [ ] **Step 3.2:** Update `DebugAgent` to prefer AST-based fixes for structural errors.
