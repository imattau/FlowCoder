import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

export class TemplateEngine {
  private templatesDir: string;

  constructor(cwd: string = process.cwd()) {
    this.templatesDir = join(cwd, ".flowcoder", "templates");
  }

  apply(templateId: string, variables: Record<string, string>): string {
    const path = join(this.templatesDir, `\${templateId}.md`);
    if (!existsSync(path)) throw new Error(`Template '\${templateId}' not found.`);

    let content = readFileSync(path, "utf-8");
    
    // Simple replacement: {{variable}}
    for (const [key, val] of Object.entries(variables)) {
      const regex = new RegExp(`{{\${key}}}`, "g");
      content = content.replace(regex, val);
    }

    return content;
  }

  listTemplates(): string[] {
    if (!existsSync(this.templatesDir)) return [];
    return readdirSync(this.templatesDir).map(f => f.replace(".md", ""));
  }
}
