import { InferenceEngine } from "./inference.js";
import { PromptManager } from "./prompt-manager.js";
import { tools } from "./tools.js";
import { StateManager } from "./state.js";
import { CommandGuard } from "./command-guard.js";
import { AgentFactory } from "./agents/factory.js";
import { PlannerAgent, DebugAgent } from "./agents/base.js";
import { McpHost } from "./mcp/host.js";
import { execSync } from "child_process";
import { discoverProjectCommands, type ProjectCommands } from "./discovery.js";
import ora from "ora";
import chalk from "chalk";

export class ChatLoop {
  private history: { role: "user" | "assistant" | "system", content: string }[] = [];
  private stateManager: StateManager;
  private guard: CommandGuard;
  private agents: AgentFactory;
  private commands: ProjectCommands;
  private mcp: McpHost;

  constructor(
    private defaultEngine: InferenceEngine,
    private tinyEngine: InferenceEngine,
    cwd: string = process.cwd()
  ) {
    this.stateManager = new StateManager(cwd);
    this.guard = new CommandGuard(cwd);
    this.commands = discoverProjectCommands(cwd);
    this.mcp = new McpHost();
    this.agents = new AgentFactory({
        "default": defaultEngine,
        "tiny": tinyEngine,
        "planner": defaultEngine,
        "coder": defaultEngine,
        "debugger": tinyEngine
    });
  }

  async init() {
      await this.mcp.init();
      // Inject system prompt with discovered tools
      this.history.push({
          role: "system", 
          content: PromptManager.getSystemPrompt(this.mcp.getTools()) 
      });
  }

  private runVerification(): { success: boolean, output: string } {
    let combinedOutput = "";
    try {
      combinedOutput += `[LINTING: ${this.commands.lint}]\n`;
      try {
        combinedOutput += execSync(this.commands.lint, { encoding: "utf-8", stdio: "pipe" });
      } catch (e: any) {
        combinedOutput += `Lint Failed:\n${e.stdout?.toString() || ""}\n${e.stderr?.toString() || ""}\n`;
      }
      
      combinedOutput += `\n[BUILDING: ${this.commands.build}]\n`;
      combinedOutput += execSync(this.commands.build, { encoding: "utf-8", stdio: "pipe" });
      
      return { success: true, output: combinedOutput };
    } catch (err: any) {
      combinedOutput += `\nCRITICAL ERROR:\n${err.stdout?.toString() || ""}\n${err.stderr?.toString() || ""}`;
      return { success: false, output: combinedOutput };
    }
  }

  async processInput(input: string): Promise<void> {
    this.history.push({ role: "user", content: input });
    
    let isComplete = false;
    let turnCount = 0;
    const maxTurns = 12;

    while (!isComplete && turnCount < maxTurns) {
      turnCount++;
      
      const spinner = ora({
          text: chalk.dim("Thinking..."),
          discardStdin: false
      }).start();

      const planner = this.agents.getAgent<PlannerAgent>("planner");
      const assistantResponse = await planner.run(input, this.history.map(h => `${h.role}: ${h.content}`));
      
      spinner.stop();
      
      const toolCall = PromptManager.parseToolCall(assistantResponse);
      const plainText = assistantResponse.replace(/<tool_call>[\s\S]*?<\/tool_call>/, "").trim();
      
      if (plainText) {
          console.log(chalk.blue.bold("AI: ") + plainText);
      }

      if (toolCall) {
        // Validation
        const validation = this.guard.validateToolCall(toolCall.name, toolCall.parameters);
        if (!validation.safe) {
          const errorMsg = `Error: Tool call rejected. ${validation.reason}`;
          console.log(chalk.red(`\n✖ ${errorMsg}`));
          this.history.push({ role: "system", content: errorMsg });
          continue;
        }

        // Confirmation
        if (toolCall.name === "run_cmd" || toolCall.name === "cache_global_ref" || toolCall.name === "scaffold_project") {
          const prompt = toolCall.name === "run_cmd" ? toolCall.parameters.command : 
                       toolCall.name === "cache_global_ref" ? `Cache URL ${toolCall.parameters.url} as '${toolCall.parameters.name}' globally` :
                       `Scaffold new ${toolCall.parameters.type} project named '${toolCall.parameters.name}'`;
          
          const confirmed = await this.guard.confirmCommand(prompt);
          if (!confirmed) {
            const msg = "User rejected tool execution.";
            console.log(chalk.yellow(`\n⚠ ${msg}`));
            this.history.push({ role: "system", content: msg });
            continue;
          }
        }

        const toolSpinner = ora(chalk.yellow(`Executing Tool: ${chalk.bold(toolCall.name)}...`)).start();
        
        try {
          let result: string;
          
          // Route to Internal or MCP
          if (tools[toolCall.name]) {
            result = await (tools[toolCall.name] as any).execute(toolCall.parameters);
          } else {
            result = await this.mcp.callTool(toolCall.name, toolCall.parameters);
          }

          const formattedResult = PromptManager.formatToolResult(result);
          this.history.push({ role: "system", content: formattedResult });
          
          toolSpinner.succeed(chalk.green(`Tool Completed: ${toolCall.name}`));

          // Verification Loop
          if (toolCall.name === "write_file" || toolCall.name === "patch_file") {
            const verifySpinner = ora(chalk.cyan("Auto-Verifying Changes...")).start();
            const verification = this.runVerification();
            
            if (verification.success) {
              verifySpinner.succeed(chalk.green("Verification Passed."));
            } else {
              verifySpinner.fail(chalk.red("Verification Failed."));
              const debugSpinner = ora(chalk.magenta("Consulting Debugger Agent...")).start();
              const debuggerAgent = this.agents.getAgent<DebugAgent>("debugger");
              const analysis = await debuggerAgent.run(verification.output);
              debugSpinner.stop();
              
              const debugMsg = `Debugger Analysis: ${analysis}\nPlease fix and verify again.`;
              console.log(chalk.magenta.bold("\n🔍 Debugger: ") + analysis);
              this.history.push({ role: "system", content: debugMsg });
            }
          }
        } catch (err: any) {
          const errorMsg = `Error executing tool: ${err.message}`;
          toolSpinner.fail(chalk.red(errorMsg));
          this.history.push({ role: "system", content: errorMsg });
        }
      } else {
        isComplete = true;
      }
    }
  }

  async cleanup() {
      await this.mcp.cleanup();
  }
}
