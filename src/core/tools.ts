import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from "fs";
import { join, relative } from "path";
import { execSync } from "child_process";
import * as diff from "diff";
import { GlobalStateManager } from "./global-state.js";
import { scaffoldProject, type ProjectType } from "./prototyping/scaffold.js";
import { TemplateEngine } from "./prototyping/templates.js";
import { RefactorEngine } from "./prototyping/refactor.js";

const globalState = new GlobalStateManager();
const templateEngine = new TemplateEngine();
const refactorEngine = new RefactorEngine();

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
        return `Found the following type definitions for ${args.name}:
${output}You can now use read_file on these paths to see the API contract.`;
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
        return `Error executing command: ${err.message}
Stdout: ${err.stdout}
Stderr: ${err.stderr}`;
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

  scaffold_project: {
    name: "scaffold_project",
    description: "Initialize a new project structure using standard system tools.",
    parameters: {
      type: { type: "string", description: "The project type (node, rust, go, python)." },
      name: { type: "string", description: "The name of the new project/directory." }
    },
    execute: (args: { type: ProjectType, name: string }) => {
      return scaffoldProject(args.type, args.name);
    }
  },

  apply_template: {
    name: "apply_template",
    description: "Generate code using a pre-defined template from the library.",
    parameters: {
      template_id: { type: "string", description: "ID of the template (e.g., 'react-component')." },
      variables: { type: "object", description: "Key-value pairs for template variables." }
    },
    execute: (args: { template_id: string, variables: Record<string, string> }) => {
      try {
        return templateEngine.apply(args.template_id, args.variables);
      } catch (err: any) {
        return `Error applying template: ${err.message}`;
      }
    }
  },

  list_templates: {
    name: "list_templates",
    description: "List available code templates in the project library.",
    parameters: {},
    execute: () => {
      const templates = templateEngine.listTemplates();
      return templates.length > 0 ? templates.join("\n") : "No templates found.";
    }
  },

  refactor_rename: {
    name: "refactor_rename",
    description: "Semantically rename a symbol (variable, function, class) across a file using AST.",
    parameters: {
      path: { type: "string", description: "Path to the source file." },
      old_name: { type: "string", description: "The current name of the symbol." },
      new_name: { type: "string", description: "The new name for the symbol." }
    },
    execute: async (args: { path: string, old_name: string, new_name: string }) => {
      return await refactorEngine.renameSymbol(args.path, args.old_name, args.new_name);
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
  },

  git_manager: {
    name: "git_manager",
    description: "Perform git operations (stage, commit, branch).",
    parameters: {
      action: { type: "string", description: "stage, commit, or branch" },
      message: { type: "string", description: "Commit message (required for commit)" },
      name: { type: "string", description: "Branch name (required for branch)" }
    },
    execute: (args: { action: "stage" | "commit" | "branch", message?: string, name?: string }) => {
      try {
        if (args.action === "stage") {
          execSync("git add .");
          return "All changes staged.";
        } else if (args.action === "commit") {
          if (!args.message) return "Error: Commit message required.";
          execSync(`git commit -m "${args.message}"`);
          return `Committed changes with message: ${args.message}`;
        } else if (args.action === "branch") {
          if (!args.name) return "Error: Branch name required.";
          execSync(`git checkout -b ${args.name}`);
          return `Created and switched to branch: ${args.name}`;
        }
        return "Unknown git action.";
      } catch (err: any) {
        return `Git Error: ${err.message}`;
      }
    }
  },

  package_manager: {
    name: "package_manager",
    description: "Install or remove project dependencies.",
    parameters: {
      action: { type: "string", description: "install or remove" },
      package: { type: "string", description: "Name of the package" },
      dev: { type: "boolean", description: "Whether to install as a devDependency" }
    },
    execute: (args: { action: "install" | "remove", package: string, dev?: boolean }) => {
      try {
        const isNode = existsSync("package.json");
        if (!isNode) return "Error: No package.json found. Only Node.js supported for now.";
        
        let cmd = "";
        if (args.action === "install") {
          cmd = `npm install ${args.package} ${args.dev ? "--save-dev" : ""}`;
        } else {
          cmd = `npm uninstall ${args.package}`;
        }
        
        execSync(cmd);
        return `Successfully ${args.action === "install" ? "installed" : "removed"} ${args.package}`;
      } catch (err: any) {
        return `Package Manager Error: ${err.message}`;
      }
    }
  },

  ask_user: {
    name: "ask_user",
    description: "Pause execution to ask the user a clarification question.",
    parameters: {
      question: { type: "string", description: "The question to ask the user." }
    },
    execute: async (args: { question: string }) => {
      return `PAUSE_FOR_USER: ${args.question}`;
    }
  },

  get_project_tree: {
    name: "get_project_tree",
    description: "Get a recursive tree view of the project structure.",
    parameters: {},
    execute: () => {
      try {
        const output = execSync("find . -maxdepth 3 -not -path '*/.*' -not -path './node_modules*'", { encoding: "utf-8" });
        return output || "Empty project.";
      } catch (err: any) {
        return `Error generating tree: ${err.message}`;
      }
    }
  }
};
