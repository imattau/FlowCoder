import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import { CONFIG } from "../config.js";

export class GlobalStateManager {
  private globalRefsDir: string;

  constructor() {
    this.globalRefsDir = CONFIG.GLOBAL_REFS_DIR;
    this.ensureStructure();
  }

  private ensureStructure() {
    if (!existsSync(CONFIG.FLOWCODER_DIR)) mkdirSync(CONFIG.FLOWCODER_DIR);
    if (!existsSync(this.globalRefsDir)) mkdirSync(this.globalRefsDir, { recursive: true });
  }

  saveReference(name: string, content: string, url: string) {
    const filename = `\${name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    const data = `---
source: \${url}
cached_at: \${new Date().toISOString()}
---

\${content}`;
    writeFileSync(join(this.globalRefsDir, filename), data);
  }

  getReference(name: string): string | null {
    const filename = `\${name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    const path = join(this.globalRefsDir, filename);
    if (!existsSync(path)) return null;
    return readFileSync(path, "utf-8");
  }

  listGlobalReferences(): string[] {
    return readdirSync(this.globalRefsDir).map(f => f.replace(".md", ""));
  }

  getAuditReport(dependencies: string[]): { found: string[], missing: string[] } {
      const cached = this.listGlobalReferences();
      const found: string[] = [];
      const missing: string[] = [];

      for (const dep of dependencies) {
          const safeName = dep.replace(/[^a-z0-9]/gi, "_").toLowerCase();
          if (cached.includes(safeName)) {
              found.push(dep);
          } else {
              // Only report core libraries, ignore likely local/tiny ones
              if (dep.length > 3) missing.push(dep);
          }
      }

      return { found, missing };
  }
}