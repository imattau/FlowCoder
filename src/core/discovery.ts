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

export function scanDependencies(cwd: string): string[] {
    const deps: string[] = [];

    // 1. Node.js
    const pkgPath = join(cwd, "package.json");
    if (existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
            if (pkg.dependencies) deps.push(...Object.keys(pkg.dependencies));
            if (pkg.devDependencies) deps.push(...Object.keys(pkg.devDependencies));
        } catch (e) {}
    }

    // 2. Rust
    const cargoPath = join(cwd, "Cargo.toml");
    if (existsSync(cargoPath)) {
        const content = readFileSync(cargoPath, "utf-8");
        const matches = content.match(/^\[dependencies\]\n([\s\S]*?)\n(\[|$)/m);
        if (matches && matches[1]) {
            const lines = matches[1].split("\n");
            for (const line of lines) {
                const name = line.split("=")[0]?.trim();
                if (name) deps.push(name);
            }
        }
    }

    return Array.from(new Set(deps)); // Unique only
}
