import { InferenceEngine } from "./inference.js";
import { PromptManager } from "./prompt-manager.js";
import { tools } from "./tools.js";
import { StateManager } from "./state.js";
import { CommandGuard } from "./command-guard.js";
import { AgentFactory } from "./agents/factory.js";
import { PlannerAgent, CoderAgent, DebugAgent } from "./agents/base.js";
import { execSync } from "child_process";

export class ChatLoop {
  private history: { role: "user" | "assistant" | "system", content: string }[] = [];
  private stateManager: StateManager;
  private guard: CommandGuard;
  private agents: AgentFactory;

  constructor(
    private defaultEngine: InferenceEngine,
    private tinyEngine: InferenceEngine,
    cwd: string = process.cwd()
  ) {
    this.stateManager = new StateManager(cwd);
    this.guard = new CommandGuard(cwd);
    this.agents = new AgentFactory({
        "default": defaultEngine,
        "tiny": tinyEngine,
        "planner": defaultEngine, // Can be configured to tinyEngine if desired
        "coder": defaultEngine,
        "debugger": tinyEngine
    });
    this.history.push({ role: "system", content: PromptManager.getSystemPrompt() });
  }

  async processInput(input: string, onToken?: (token: string) => void): Promise<void> {
    this.history.push({ role: "user", content: input });
    
    let isComplete = false;
    let turnCount = 0;
    const maxTurns = 12;

    while (!isComplete && turnCount < maxTurns) {
      turnCount++;
      
      // 1. PLANNING PHASE (Planner Agent)
      if (onToken) onToken(`\x1b[2m[Planning...]\x1b[0m `);
      const planner = this.agents.getAgent<PlannerAgent>("planner");
      const assistantResponse = await planner.run(input, this.history.map(h => `${h.role}: ${h.content}`));
      
      if (onToken) onToken(`\n${assistantResponse}\n`);
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

            // SELF-HEALING & DEBUGGING
            if (toolCall.name === "write_file" || toolCall.name === "patch_file") {
              if (onToken) onToken(`\x1b[36m[Auto-Verifying Changes...]\x1b[0m\n`);
              try {
                execSync("npm run build", { stdio: "pipe" });
                if (onToken) onToken(`\x1b[32m[Verification Passed]\x1b[0m\n`);
              } catch (err: any) {
                const errorLog = `${err.stdout?.toString() || ""}\n${err.stderr?.toString() || ""}`;
                
                // DELEGATE TO DEBUG AGENT
                if (onToken) onToken(`\x1b[31m[Verification Failed. Consulting Debugger...]\x1b[0m\n`);
                const debuggerAgent = this.agents.getAgent<DebugAgent>("debugger");
                const analysis = await debuggerAgent.run(errorLog);
                
                const debugMsg = `Debugger Analysis: ${analysis}\nPlease fix and verify again.`;
                if (onToken) onToken(`\n\x1b[35m[${debugMsg}]\x1b[0m\n`);
                this.history.push({ role: "system", content: debugMsg });
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
