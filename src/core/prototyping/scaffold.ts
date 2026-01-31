import { execSync } from "child_process";
import chalk from "chalk";

export type ProjectType = "node" | "rust" | "go" | "python";

export function scaffoldProject(type: ProjectType, name: string): string {
  try {
    let command: string;
    switch (type) {
      case "node":
        command = `mkdir \${name} && cd \${name} && npm init -y`;
        break;
      case "rust":
        command = `cargo new \${name}`;
        break;
      case "go":
        command = `mkdir \${name} && cd \${name} && go mod init \${name}`;
        break;
      case "python":
        command = `mkdir \${name} && cd \${name} && python3 -m venv venv && touch requirements.txt`;
        break;
      default:
        return `Error: Unknown project type '\${type}'`;
    }

    execSync(command, { encoding: "utf-8" });
    return `Successfully scaffolded \${type} project '\${name}'.`;
  } catch (err: any) {
    return `Error scaffolding project: \${err.message}`;
  }
}
