import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CONFIG } from "../../config.js";
import ora from "ora";
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

  async init() {
    for (const [name, config] of Object.entries(CONFIG.MCP_SERVERS)) {
      const spinner = ora(chalk.dim(`Connecting to MCP Server: ${name}...`)).start();
      try {
        const env: Record<string, string> = {};
        for (const [k, v] of Object.entries(process.env)) {
            if (v !== undefined) env[k] = v;
        }
        if (config.env) {
            for (const [k, v] of Object.entries(config.env)) {
                env[k] = v;
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

        // Discover tools
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
        spinner.succeed(chalk.green(`Connected to MCP Server: ${name} (${response.tools.length} tools)`));
      } catch (err: any) {
        spinner.fail(chalk.red(`Failed to connect to MCP Server ${name}: ${err.message}`));
      }
    }
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
