import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from "fs";
import { join, relative } from "path";
import { execSync } from "child_process";
import * as diff from "diff";
import { GlobalStateManager } from "./global-state.js";

const globalState = new GlobalStateManager();

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

  write_file: {
    name: "write_file",
    description: "Write content to a file. Overwrites existing content.",
    parameters: {
      path: { type: "string", description: "Path to write to." },
      content: { type: "string", description: "Full content of the file." }
    },
    execute: (args: { path: string, content: string }) => {
      try {
        writeFileSync(args.path, args.content);
        return `Successfully wrote to ${args.path}`;
      } catch (err: any) {
        return `Error writing file: ${err.message}`;
      }
    }
  },

  patch_file: {
    name: "patch_file",
    description: "Replace a specific block of code in a file using search and replace blocks.",
    parameters: {
      path: { type: "string", description: "The relative path to the file." },
      search: { type: "string", description: "The exact block of code to find." },
      replace: { type: "string", description: "The new code to replace it with." }
    },
    execute: (args: { path: string, search: string, replace: string }) => {
      try {
        if (!existsSync(args.path)) return `Error: File not found at ${args.path}`;
        const content = readFileSync(args.path, "utf-8");
        if (!content.includes(args.search)) {
          return "Error: Search block not found in file. Ensure the search block is an EXACT match including whitespace.";
        }
        
        const newContent = content.replace(args.search, args.replace);
        
        // Show Diff
        const patch = diff.createPatch(args.path, content, newContent);
        console.log("\n--- DIFF ---");
        patch.split("\n").forEach((line: string) => {
          if (line.startsWith("+")) console.log(`\x1b[32m${line}\x1b[0m`);
          else if (line.startsWith("-")) console.log(`\x1b[31m${line}\x1b[0m`);
          else console.log(line);
        });
        console.log("------------\n");

        writeFileSync(args.path, newContent);
        return `Successfully patched ${args.path}`;
      } catch (err: any) {
        return `Error patching file: ${err.message}`;
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

  list_symbols: {
    name: "list_symbols",
    description: "Recursively list important symbols (functions, classes, exports) and type definitions in the project.",
    parameters: {},
    execute: () => {
      try {
        const output = execSync('rg --no-heading --line-number "(export (const|class|function|interface|type)|function \w+|declare (class|namespace|module|type))" src/ ', { encoding: "utf-8" });
        return output || "No symbols found.";
      } catch (err: any) {
        return `Error listing symbols: ${err.message}`;
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

  inspect_library: {
    name: "inspect_library",
    description: "Search for type definitions or header files of an installed library to verify its API.",
    parameters: {
      name: { type: "string", description: "Name of the library (e.g., 'express', 'lodash')." }
    },
    execute: (args: { name: string }) => {
      try {
        const searchPath = join("node_modules", args.name);
        if (!existsSync(searchPath)) return `Error: Library '${args.name}' not found in node_modules.`;
        
        const output = execSync(`find ${searchPath} -name "*.d.ts" | head -n 10`, { encoding: "utf-8" });
        return `Found the following type definitions for ${args.name}:\n${output}\nYou can now use read_file on these paths to see the API contract.`;
      } catch (err: any) {
        return `Error inspecting library: ${err.message}`;
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
        return text.replace(/<[^>]*>?/gm, "").substring(0, 5000); 
      } catch (err: any) {
        return `Error fetching URL: ${err.message}`;
      }
    }
  },

  cache_global_ref: {
    name: "cache_global_ref",
    description: "Download a URL and store it in global references for future re-use across projects.",
    parameters: {
      url: { type: "string", description: "The URL to download." },
      name: { type: "string", description: "A unique name for this reference (e.g. 'react-query-v5')." }
    },
    execute: async (args: { url: string, name: string }) => {
      try {
        const response = await fetch(args.url);
        if (!response.ok) return `Error fetching URL: ${response.statusText}`;
        const text = await response.text();
        const content = text.replace(/<[^>]*>?/gm, "");
        globalState.saveReference(args.name, content, args.url);
        return `Successfully cached '${args.name}' globally.`;
      } catch (err: any) {
        return `Error caching global reference: ${err.message}`;
      }
    }
  },

  use_global_ref: {
    name: "use_global_ref",
    description: "Retrieve a previously cached global reference by name.",
    parameters: {
      name: { type: "string", description: "The name of the reference to retrieve." }
    },
    execute: (args: { name: string }) => {
      const content = globalState.getReference(args.name);
      if (!content) {
        const available = globalState.listGlobalReferences().join(", ");
        return `Error: Global reference '${args.name}' not found. Available: ${available || "None"}`;
      }
      return content;
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
