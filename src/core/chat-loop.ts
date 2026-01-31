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
import readline from "readline";

export class ChatLoop {
  private history: { role: "user" | "assistant" | "system", content: string }[] = [];
  private stateManager: StateManager;
  private guard: CommandGuard;
  private agents: AgentFactory;
  private commands: ProjectCommands;
  private mcp: McpHost;
  private commandQueue: { name: string, parameters: any }[] = [];

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
        execSync(this.commands.lint, { encoding: "utf-8", stdio: "pipe" });
      } catch (e: any) {
        combinedOutput += `Lint Failed:\n${e.stdout?.toString() || ""}\n${e.stderr?.toString() || ""}\n`;
      }
      
      combinedOutput += `\n[BUILDING: ${this.commands.build}]\n`;
      execSync(this.commands.build, { encoding: "utf-8", stdio: "pipe" });
      
      return { success: true, output: combinedOutput };
    } catch (err: any) {
      combinedOutput += `\nCRITICAL ERROR:\n${err.stdout?.toString() || ""}\n${err.stderr?.toString() || ""}`;
      return { success: false, output: combinedOutput };
    }
  }

  private async requestQueueApproval(): Promise<"all" | "step" | "abort"> {
      if (this.commandQueue.length === 0) return "abort";

      console.log(chalk.bold.yellow("\n📋 Proposed Command Queue:"));
      this.commandQueue.forEach((cmd, idx) => {
          console.log(`${idx + 1}. ${chalk.cyan(cmd.name)}(${chalk.dim(JSON.stringify(cmd.parameters))})`);
      });

      const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
      });

      return new Promise((res) => {
          rl.question(chalk.bold.magenta("\nExecute actions? [(a)ll / (s)tep / (c)ancel]: "), (ans) => {
              rl.close();
              const a = ans.toLowerCase();
              if (a === "a" || a === "all") res("all");
              else if (a === "s" || a === "step") res("step");
              else res("abort");
          });
      });
  }

  async processInput(input: string): Promise<void> {
    this.history.push({ role: "user", content: input });
    
    let turnCount = 0;
    const maxTurns = 12;

    while (turnCount < maxTurns) {
      turnCount++;
      
      const spinner = ora({
          text: chalk.dim("Thinking..."),
          discardStdin: false
      }).start();

      const planner = this.agents.getAgent<PlannerAgent>("planner");
      const assistantResponse = await planner.run(input, this.history.map(h => `${h.role}: ${h.content}`));
      
      spinner.stop();
      
      this.commandQueue = PromptManager.parseToolCalls(assistantResponse);
      const plainText = assistantResponse.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "").trim();
      
      if (plainText) {
          console.log(chalk.blue.bold("AI: ") + plainText);
      }

      if (this.commandQueue.length > 0) {
          const mode = await this.requestQueueApproval();
          
          if (mode === "abort") {
              console.log(chalk.red("✖ Batch cancelled."));
              this.commandQueue = [];
              return;
          }

          let autoApprove = (mode === "all");

          while (this.commandQueue.length > 0) {
              const toolCall = this.commandQueue.shift()!;
              
              if (!autoApprove) {
                  console.log(chalk.yellow(`\nNext action: ${toolCall.name}`));
                  // We could ask again for each step here if desired
              }

              // Validation
              const validation = this.guard.validateToolCall(toolCall.name, toolCall.parameters);
              if (!validation.safe) {
                const errorMsg = `Error: Tool call rejected. ${validation.reason}`;
                console.log(chalk.red(`\n✖ ${errorMsg}`));
                this.history.push({ role: "system", content: errorMsg });
                continue;
              }

              // Special confirmation for dangerous tools if not already in 'all' mode
              if (!autoApprove && (toolCall.name === "run_cmd" || toolCall.name === "cache_global_ref" || toolCall.name === "scaffold_project")) {
                  const confirmed = await this.guard.confirmCommand(toolCall.name);
                  if (!confirmed) {
                      console.log(chalk.yellow("⚠ Skipped."));
                      continue;
                  }
              }

              const toolSpinner = ora(chalk.yellow(`Executing: ${chalk.bold(toolCall.name)}...`)).start();
              
              try {
                let result: string;
                if (tools[toolCall.name]) {
                  result = await (tools[toolCall.name] as any).execute(toolCall.parameters);
                } else {
                  result = await this.mcp.callTool(toolCall.name, toolCall.parameters);
                }

                const formattedResult = PromptManager.formatToolResult(result);
                this.history.push({ role: "system", content: formattedResult });
                toolSpinner.succeed(chalk.green(`Done: ${toolCall.name}`));

                // Auto-verify on change
                if (toolCall.name === "write_file" || toolCall.name === "patch_file") {
                  const verifySpinner = ora(chalk.cyan("Verifying...")).start();
                  const verification = this.runVerification();
                  if (verification.success) {
                    verifySpinner.succeed(chalk.green("OK."));
                  } else {
                    verifySpinner.fail(chalk.red("Fail."));
                    const debuggerAgent = this.agents.getAgent<DebugAgent>("debugger");
                    const analysis = await debuggerAgent.run(verification.output);
                    console.log(chalk.magenta.bold("\n🔍 Debugger: ") + analysis);
                    this.history.push({ role: "system", content: `Debugger: ${analysis}` });
                    // On failure, we abort the rest of the queue to allow fix
                    this.commandQueue = [];
                  }
                }
              } catch (err: any) {
                toolSpinner.fail(chalk.red(err.message));
                this.history.push({ role: "system", content: `Error: ${err.message}` });
              }
          }
      } else {
          // No more tools, we are likely done
          return;
      }
    }
  }

  async cleanup() {
      await this.mcp.cleanup();
  }
}