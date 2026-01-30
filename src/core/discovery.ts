import { existsSync } from "fs";
import { join } from "path";

export interface ProjectCommands {
  build: string;
  lint: string;
  test: string;
}

export function discoverProjectCommands(cwd: string): ProjectCommands {
  // 1. Rust (Cargo)
  if (existsSync(join(cwd, "Cargo.toml"))) {
    return {
      build: "cargo check",
      lint: "cargo clippy",
      test: "cargo test"
    };
  }

  // 2. Python (look for pyproject.toml, requirements.txt)
  if (existsSync(join(cwd, "pyproject.toml")) || existsSync(join(cwd, "requirements.txt"))) {
    return {
      build: "python3 -m py_compile **/*.py", // Basic syntax check
      lint: existsSync(join(cwd, ".ruff_cache")) || true ? "ruff check ." : "flake8 .",
      test: "pytest"
    };
  }

  // 3. Go
  if (existsSync(join(cwd, "go.mod"))) {
    return {
      build: "go build ./...",
      lint: "go vet ./...",
      test: "go test ./..."
    };
  }

  // 4. Node.js (Default fallback if package.json exists)
  if (existsSync(join(cwd, "package.json"))) {
    return {
      build: "npm run build",
      lint: "npm run lint",
      test: "npm test"
    };
  }

  // Generic Fallback
  return {
    build: "make build",
    lint: "make lint",
    test: "make test"
  };
}
