import { InferenceEngine } from "./inference.ts";
import { PromptManager } from "./prompt-manager.ts";
import { tools } from "./tools.ts";
import { StateManager } from "./state.ts";
import { CommandGuard } from "./command-guard.ts";

export class ChatLoop {
  private history: { role: "user" | "assistant" | "system", content: string }[] = [];
  private stateManager: StateManager;
  private guard: CommandGuard;

  constructor(
    private engine: InferenceEngine,
    cwd: string = process.cwd()
  ) {
    this.stateManager = new StateManager(cwd);
    this.guard = new CommandGuard(cwd);
    this.history.push({ role: "system", content: PromptManager.getSystemPrompt() });
  }

  async processInput(input: string, onToken?: (token: string) => void): Promise<void> {
    this.history.push({ role: "user", content: input });
    
    let isComplete = false;
    let turnCount = 0;
    const maxTurns = 10;

    while (!isComplete && turnCount < maxTurns) {
      turnCount++;
      
      const fullPrompt = this.history.map(m => `${m.role}: ${m.content}`).join("\n") + "\nassistant:";
      
      let assistantResponse = "";
      await this.engine.generateResponse(fullPrompt, (token) => {
        assistantResponse += token;
        if (onToken) onToken(token);
      });

      this.history.push({ role: "assistant", content: assistantResponse });

      const toolCall = PromptManager.parseToolCall(assistantResponse);
      if (toolCall) {
        // Validation
        const validation = this.guard.validateToolCall(toolCall.name, toolCall.parameters);
        if (!validation.safe) {
          const errorMsg = `Error: Tool call rejected. ${validation.reason}`;
          if (onToken) onToken(`\n\x1b[31m[${errorMsg}]\x1b[0m\n`);
          this.history.push({ role: "system", content: errorMsg });
          continue;
        }

        // Confirmation for destructive/shell commands
        if (toolCall.name === "run_cmd") {
          const confirmed = await this.guard.confirmCommand(toolCall.parameters.command);
          if (!confirmed) {
            const msg = "User rejected command execution.";
            if (onToken) onToken(`\n\x1b[31m[${msg}]\x1b[0m\n`);
            this.history.push({ role: "system", content: msg });
            continue;
          }
        }

        if (onToken) onToken(`\n\x1b[33m[Executing Tool: ${toolCall.name}]\x1b[0m\n`);
        
        const tool = tools[toolCall.name];
        if (tool) {
          const result = await tool.execute(toolCall.parameters);
          const formattedResult = PromptManager.formatToolResult(result);
          this.history.push({ role: "system", content: formattedResult });
          
          if (onToken) onToken(`\x1b[32m[Tool Result Received]\x1b[0m\n`);
        } else {
          this.history.push({ role: "system", content: `Error: Tool ${toolCall.name} not found.` });
        }
      } else {
        isComplete = true;
      }
    }
  }
}
