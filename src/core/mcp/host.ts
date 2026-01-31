import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CONFIG } from "../../config.js";
import { BlessedUIManager } from "../ui/blessed-ui-manager.js";
import chalk from "chalk";

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: any;
  serverName: string;
}

export class McpHost {
  private clients: Map<string, Client> = new Map();
  private tools: Map<string, McpTool> = new Map();
  private ui: BlessedUIManager;

  constructor() {
      this.ui = BlessedUIManager.getInstance();
  }

  async init() {
    const serversToLoad: Record<string, any> = {};

    if (CONFIG.MCP_CONFIG.enable_defaults) {
        for (const [name, cfg] of Object.entries(CONFIG.MCP_CONFIG.defaults)) {
            if (cfg.enabled) {
                serversToLoad[name] = cfg;
            }
        }
    }

    for (const [name, cfg] of Object.entries(CONFIG.MCP_CONFIG.custom_servers)) {
        serversToLoad[name] = cfg;
    }

    for (const [name, config] of Object.entries(serversToLoad)) {
      this.ui.write(chalk.dim(`Connecting to MCP Server: ${name}...`));
      this.ui.writeStatusBar(chalk.yellow(`Connecting to MCP: ${name}...`));
      
      try {
        const env: Record<string, string> = {};
        for (const [k, v] of Object.entries(process.env)) {
            if (v !== undefined) env[k] = v;
        }
        if (config.env) {
            for (const [k, v] of Object.entries(config.env)) {
                env[k] = v as string;
            }
        }

        const transport = new StdioClientTransport({
          command: config.command,
          args: config.args,
          env: env
        });

        const client = new Client({
          name: "FlowCoder-Host",
          version: "1.0.0"
        }, {
          capabilities: {}
        });

        await client.connect(transport);
        this.clients.set(name, client);

        // --- NEW: Capture and redirect stderr ---
        // StdioClientTransport has a 'process' property once connected
        const serverProcess = (transport as any).process;
        if (serverProcess && serverProcess.stderr) {
            serverProcess.stderr.on("data", (data: Buffer) => {
                const lines = data.toString().split("\n");
                for (const line of lines) {
                    if (line.trim()) {
                        this.ui.write(chalk.dim(`[${name}] ${line.trim()}`));
                    }
                }
            });
        }

        const response = await client.listTools();
        for (const tool of response.tools) {
          const mcpTool: McpTool = {
            name: tool.name,
            inputSchema: tool.inputSchema,
            serverName: name
          };
          if (tool.description) mcpTool.description = tool.description;
          
          this.tools.set(tool.name, mcpTool);
        }
        this.ui.write(chalk.green(`✔ Connected to MCP Server: ${name} (${response.tools.length} tools)`));
      } catch (err: any) {
        this.ui.write(chalk.red(`✖ Failed to connect to MCP Server ${name}: ${err.message}`));
      }
    }
    this.ui.writeStatusBar(chalk.gray("All MCP servers processed."));
  }

  getTools(): McpTool[] {
    return Array.from(this.tools.values());
  }

  async callTool(name: string, args: any): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`MCP Tool ${name} not found.`);

    const client = this.clients.get(tool.serverName);
    if (!client) throw new Error(`MCP Client for ${name} not found.`);

    const result = await client.callTool({
      name,
      arguments: args
    });

    if (result.isError) {
        throw new Error(`MCP Tool Error: ${JSON.stringify(result.content)}`);
    }

    const content = result.content as any[];

    return content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n");
  }

  async cleanup() {
      for (const client of this.clients.values()) {
          try {
            await client.close();
          } catch (e) {
              // Ignore cleanup errors
          }
      }
  }
}