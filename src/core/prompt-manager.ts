import { tools } from "./tools.js";

export interface ToolMetadata {
    name: string;
    description?: string;
    parameters?: any;
    inputSchema?: any; // For MCP
}

export class PromptManager {
  private static SYSTEM_PROMPT = "You are FlowCoder, a local AI coding assistant.\n" +
"You have access to the following tools to interact with the codebase:\n\n" +
"{{TOOL_DESCRIPTIONS}}\n\n" +
"To use tools, output one or more tool calls in the following XML-like format:\n" +
"<tool_call>\n" +
"{\"name\": \"tool_name\", \"parameters\": {\"param1\": \"value1\"}}\n" +
"</tool_call>\n\n" +
"You can queue multiple tool calls in a single response if needed.\n" +
"After the tools execute, you will receive results and can then provide a final answer.\n" +
"STRICT RULE: Do not invent APIs or library functions. If you are unsure of a signature, use `search`, `read_file`, or `fetch_url` to verify.\n" +
"Always prefer local type definitions (.d.ts) or header files to understand library contracts.\n" +
"Always prefer local commands and reading files to understand context.\n" +
"Be concise and professional.";

  static getSystemPrompt(mcpTools: ToolMetadata[] = []): string {
    const internalTools = Object.values(tools).map(t => {
      return `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters)}`;
    });

    const externalTools = mcpTools.map(t => {
        return `- ${t.name}: ${t.description}\n  Parameters Schema: ${JSON.stringify(t.inputSchema)}`;
    });

    const descriptions = [...internalTools, ...externalTools].join("\n");

    return this.SYSTEM_PROMPT.replace("{{TOOL_DESCRIPTIONS}}", descriptions);
  }

  static parseToolCalls(text: string): { name: string, parameters: any }[] {
    const regex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
    const calls: { name: string, parameters: any }[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      try {
        const jsonStr = match[1]?.trim();
        if (jsonStr) {
          calls.push(JSON.parse(jsonStr));
        }
      } catch (err) {
        console.error("Failed to parse tool call JSON:", err);
      }
    }

    return calls;
  }

  static formatToolResult(result: string): string {
    return `\n<tool_result>\n${result}\n</tool_result>\n`;
  }
}
