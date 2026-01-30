# FlowCoder

FlowCoder is a local AI coding assistant that runs GGUF models on your machine. It leverages local system tools and provides a secure, sandboxed environment for AI-assisted development.

## Features

- **Local Inference:** Runs GGUF models using `node-llama-cpp` (CPU optimized).
- **Context-Aware:** AI can read files, list directories, and search your codebase.
- **Git Integration:** AI understands your current git status and diffs.
- **Task Management:** Track project goals and tasks in the `.flowcoder` folder.
- **Secure Sandbox:** Destructive commands require explicit user confirmation.
- **Documentation Fetching:** AI can fetch and read external API documentation.

## Installation

```bash
npm install
```

## Usage

### Initialize
Download the default model (Qwen 2.5 Coder 1.5B):
```bash
npm start -- init
```

### Start a Task
```bash
npm start -- task "Refactor the tool system"
```

### Chat
Start an interactive session:
```bash
npm start -- chat
```

### Configuration
View current settings:
```bash
npm start -- config
```

## Security

FlowCoder implements a **CommandGuard** that:
1. Restricts file access to the project root.
2. Intercepts shell commands (`run_cmd`) and asks for user permission.
3. Blocks known dangerous commands.

## Tech Stack
- **TypeScript / Node.js**
- **node-llama-cpp** (Inference engine)
- **Commander.js** (CLI)
- **Ripgrep** (Fast code search)