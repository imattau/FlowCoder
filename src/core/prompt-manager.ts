import { tools } from "./tools.js";

export class PromptManager {
  private static SYSTEM_PROMPT = "You are FlowCoder, a local AI coding assistant.\n" +
"You have access to the following tools to interact with the codebase:\n\n" +
"{{TOOL_DESCRIPTIONS}}\n\n" +
"To use a tool, output a tool call in the following XML-like format:\n" +
"<tool_call>\n" +
"{\"name\": \"tool_name\", \"parameters\": {\"param1\": \"value1\"}}\n" +
"</tool_call>\n\n" +
"After you receive the tool result, continue your response or provide a final answer.\n" +
"STRICT RULE: Do not invent APIs or library functions. If you are unsure of a signature, use `search`, `read_file`, or `fetch_url` to verify.\n" +
"Always prefer local type definitions (.d.ts) or header files to understand library contracts.\n" +
"Always prefer local commands and reading files to understand context.\n" +
"Be concise and professional.";

  static getSystemPrompt(): string {
    const descriptions = Object.values(tools).map(t => {
      return `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters)}`;
    }).join("\n");

    return this.SYSTEM_PROMPT.replace("{{TOOL_DESCRIPTIONS}}", descriptions);
  }

  static parseToolCall(text: string): { name: string, parameters: any } | null {
    const match = text.match(/<tool_call>([\s\S]*)<\/tool_call>/);
    if (!match) return null;

    try {
      const jsonStr = match[1]?.trim();
      if (!jsonStr) return null;
      return JSON.parse(jsonStr);
    } catch (err) {
      console.error("Failed to parse tool call JSON:", err);
      return null;
    }
  }

  static formatToolResult(result: string): string {
    return `\n<tool_result>\n${result}\n</tool_result>\n`;
  }
}