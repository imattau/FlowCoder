import { InferenceEngine } from "./inference.js";
import { PromptManager } from "./prompt-manager.js";
import { tools } from "./tools.js";
import { StateManager } from "./state.js";
import { CommandGuard } from "./command-guard.js";
import { execSync } from "child_process";

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
          try {
            const result = await tool.execute(toolCall.parameters);
            const formattedResult = PromptManager.formatToolResult(result);
            this.history.push({ role: "system", content: formattedResult });
            
            if (onToken) onToken(`\x1b[32m[Tool Result Received]\x1b[0m\n`);

            // SELF-HEALING: Automatic Verification
            if (toolCall.name === "write_file" || toolCall.name === "patch_file") {
              if (onToken) onToken(`\x1b[36m[Auto-Verifying Changes...]\x1b[0m\n`);
              try {
                execSync("npm run build", { stdio: "pipe" });
                if (onToken) onToken(`\x1b[32m[Verification Passed]\x1b[0m\n`);
              } catch (err: any) {
                const errorMsg = `Verification Failed after your change:\n${err.stdout?.toString() || ""}\n${err.stderr?.toString() || ""}\nPlease fix the errors and try again.`;
                if (onToken) onToken(`\n\x1b[31m[${errorMsg}]\x1b[0m\n`);
                this.history.push({ role: "system", content: errorMsg });
              }
            }
          } catch (err: any) {
            const errorMsg = `Error executing tool: ${err.message}`;
            this.history.push({ role: "system", content: errorMsg });
            if (onToken) onToken(`\n\x1b[31m[${errorMsg}]\x1b[0m\n`);
          }
        } else {
          this.history.push({ role: "system", content: `Error: Tool ${toolCall.name} not found.` });
        }
      } else {
        isComplete = true;
      }
    }
  }
}