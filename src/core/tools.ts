import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative } from "path";
import { execSync } from "child_process";

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute(args: any): Promise<string> | string;
}

export const tools: Record<string, Tool> = {
  read_file: {
    name: "read_file",
    description: "Read the content of a file from the local filesystem.",
    parameters: {
      path: { type: "string", description: "The relative path to the file." }
    },
    execute: (args: { path: string }) => {
      try {
        if (!existsSync(args.path)) return `Error: File not found at ${args.path}`;
        const content = readFileSync(args.path, "utf-8");
        return content;
      } catch (err: any) {
        return `Error reading file: ${err.message}`;
      }
    }
  },

  list_files: {
    name: "list_files",
    description: "List files in a directory.",
    parameters: {
      path: { type: "string", description: "The relative path to the directory." }
    },
    execute: (args: { path: string }) => {
      try {
        const dirPath = args.path || ".";
        if (!existsSync(dirPath)) return `Error: Directory not found at ${dirPath}`;
        const files = readdirSync(dirPath);
        return files.join("\n");
      } catch (err: any) {
        return `Error listing files: ${err.message}`;
      }
    }
  },

  search: {
    name: "search",
    description: "Search for a pattern in the codebase using ripgrep.",
    parameters: {
      query: { type: "string", description: "The regex pattern to search for." }
    },
    execute: (args: { query: string }) => {
      try {
        const output = execSync(`rg --max-count 20 --ignore-case "${args.query}"`, { encoding: "utf-8" });
        return output;
      } catch (err: any) {
        if (err.status === 1) return "No matches found.";
        return `Error running search: ${err.message}. Ensure ripgrep (rg) is installed.`;
      }
    }
  },

  run_cmd: {
    name: "run_cmd",
    description: "Run a shell command. Use with caution.",
    parameters: {
      command: { type: "string", description: "The shell command to execute." }
    },
    execute: (args: { command: string }) => {
      try {
        const output = execSync(args.command, { encoding: "utf-8" });
        return output || "(Command executed successfully with no output)";
      } catch (err: any) {
        return `Error executing command: ${err.message}\nStdout: ${err.stdout}\nStderr: ${err.stderr}`;
      }
    }
  },

  fetch_url: {
    name: "fetch_url",
    description: "Fetch content from a URL and return as text/markdown.",
    parameters: {
      url: { type: "string", description: "The URL to fetch." }
    },
    execute: async (args: { url: string }) => {
      try {
        const response = await fetch(args.url);
        if (!response.ok) return `Error fetching URL: ${response.statusText}`;
        const text = await response.text();
        // Basic cleanup of HTML (placeholder for real conversion)
        return text.replace(/<[^>]*>?/gm, "").substring(0, 5000); 
      } catch (err: any) {
        return `Error fetching URL: ${err.message}`;
      }
    }
  },

  get_git_context: {
    name: "get_git_context",
    description: "Get current git status and recent diffs.",
    parameters: {},
    execute: () => {
      try {
        const status = execSync("git status -s", { encoding: "utf-8" });
        const diff = execSync("git diff HEAD --stat", { encoding: "utf-8" });
        return `Status:\n${status || "Clean"}\n\nDiff Summary:\n${diff || "No changes"}`;
      } catch (err: any) {
        return `Error getting git context: ${err.message}`;
      }
    }
  }
};

