import { existsSync, readFileSync } from "fs";
import { join } from "path";

export interface ProjectCommands {
  build: string;
  lint: string;
  test: string;
}

export function discoverProjectCommands(cwd: string): ProjectCommands {
  if (existsSync(join(cwd, "Cargo.toml"))) {
    return { build: "cargo check", lint: "cargo clippy", test: "cargo test" };
  }
  if (existsSync(join(cwd, "pyproject.toml")) || existsSync(join(cwd, "requirements.txt"))) {
    return { build: "python3 -m py_compile **/*.py", lint: "ruff check .", test: "pytest" };
  }
  if (existsSync(join(cwd, "go.mod"))) {
    return { build: "go build ./...", lint: "go vet ./...", test: "go test ./..." };
  }
  if (existsSync(join(cwd, "package.json"))) {
    return { build: "npm run build", lint: "npm run lint", test: "npm test" };
  }
  return { build: "make build", lint: "make lint", test: "make test" };
}

export interface ExternalContext {
    source: string;
    content: string;
}

export function findExternalContext(cwd: string): ExternalContext[] {
    const targets = [
        ".cursorrules",
        "CLAUDE.md",
        ".windsurfrules",
        "README.md",
        "CONTRIBUTING.md"
    ];

    const results: ExternalContext[] = [];

    for (const file of targets) {
        const path = join(cwd, file);
        if (existsSync(path)) {
            try {
                const content = readFileSync(path, "utf-8").substring(0, 2000);
                results.push({ source: file, content });
            } catch (e) {
                // Ignore read errors
            }
        }
    }

    return results;
}