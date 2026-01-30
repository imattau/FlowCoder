import { resolve, relative, isAbsolute } from "path";
import readline from "readline";

export class CommandGuard {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = resolve(cwd);
  }

  isPathSafe(targetPath: string): boolean {
    const absoluteTargetPath = isAbsolute(targetPath) ? resolve(targetPath) : resolve(this.cwd, targetPath);
    const rel = relative(this.cwd, absoluteTargetPath);
    return !rel.startsWith("..") && !isAbsolute(rel);
  }

  async confirmCommand(command: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((res) => {
      rl.question(`\n\x1b[31m[SECURITY] AI wants to run: ${command}\nAllow? (y/N): \x1b[0m`, (answer) => {
        rl.close();
        res(answer.toLowerCase() === "y");
      });
    });
  }

  validateToolCall(name: string, parameters: any): { safe: boolean, reason?: string } {
    if (name === "read_file" || name === "list_files") {
      if (!this.isPathSafe(parameters.path || ".")) {
        return { safe: false, reason: "Access outside project root is forbidden." };
      }
    }

    if (name === "run_cmd") {
      // Basic blocklist for extremely dangerous commands (can be expanded)
      const dangerous = ["rm -rf /", "mkfs", "dd"];
      if (dangerous.some(d => parameters.command.includes(d))) {
        return { safe: false, reason: "Command is explicitly forbidden." };
      }
    }

    if (name === "cache_global_ref") {
        return { safe: true }; // Will require confirmation in ChatLoop
    }

    return { safe: true };
  }
}
