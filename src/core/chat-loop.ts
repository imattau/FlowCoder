import { InferenceEngine } from "./inference.js";
import { PromptManager } from "./prompt-manager.js";
import { tools } from "./tools.js";
import { StateManager } from "./state.js";
import { CommandGuard } from "./command-guard.js";
import { AgentFactory, type AgentType } from "./agents/factory.js";
import { IntentAgent, ContextAgent, DispatcherAgent, DebugAgent } from "./agents/base.js";
import { McpHost } from "./mcp/host.js";
import { execSync } from "child_process";
import { discoverProjectCommands, type ProjectCommands } from "./discovery.js";
import { BlessedUIManager } from "./ui/blessed-ui-manager.js";
import { calculateCodeMetrics } from "./utils/code-metrics.js";
import chalk from "chalk";

export class ChatLoop {
  private history: { role: "user" | "assistant" | "system", content: string }[] = [];
  private stateManager: StateManager;
  private guard: CommandGuard;
  private agents: AgentFactory;
  private commands: ProjectCommands;
  private mcp: McpHost;
  private commandQueue: { name: string, parameters: any }[] = [];
  private ui: BlessedUIManager;
  public isInterrupted: boolean = false;

  constructor(
    private defaultEngine: InferenceEngine,
    private tinyEngine: InferenceEngine,
    cwd: string = process.cwd()
  ) {
    this.stateManager = new StateManager(cwd);
    this.guard = new CommandGuard(cwd);
    this.commands = discoverProjectCommands(cwd);
    this.ui = BlessedUIManager.getInstance();
    this.mcp = new McpHost();
    this.agents = new AgentFactory({
        "default": defaultEngine,
        "tiny": tinyEngine
    });
  }

  async init() {
      await this.mcp.init();
  }

  private getSystemContext(): string {
      return PromptManager.getSystemPrompt(this.mcp.getTools());
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

      this.ui.write(chalk.bold.yellow("\n📋 Proposed Command Queue:"));
      this.commandQueue.forEach((cmd, idx) => {
          this.ui.write(`\n${idx + 1}. ${chalk.cyan(cmd.name)}(${chalk.dim(JSON.stringify(cmd.parameters))})`);
      });

      const answer = await this.ui.getInputPrompt(chalk.bold.magenta("\nExecute actions? [(a)ll / (s)tep / (c)ancel]: "));
      const a = answer.toLowerCase();
      if (a === "a" || a === "all") return "all";
      else if (a === "s" || a === "step") return "step";
      else if (a === "c" || a === "cancel") return "abort";
      else return "abort";
  }

  private async askUserPrompt(question: string): Promise<string> {
      return await this.ui.getInputPrompt(chalk.bold.magenta(`\n❓ AI Question: ${question}\nYour answer: `));
  }

  async processInput(input: string): Promise<void> {
    this.history.push({ role: "user", content: input });
    this.isInterrupted = false;
    
    let turnCount = 0;
    const maxTurns = 15;

    while (turnCount < maxTurns && !this.isInterrupted) {
      turnCount++;
      
      const systemPrompt = this.getSystemContext();

      // 1. INTENT ANALYSIS
      this.ui.writeStatusBar(chalk.gray("Status: Analyzing intent..."));
      this.tinyEngine.loadInBackground(); 
      const intentAgent = this.agents.getAgent<IntentAgent>("intent");
      const intent = await intentAgent.run(`${systemPrompt}\n\nUser Request: ${input}`);
      this.ui.write(chalk.dim(`Intent: ${intent}\n`));
      if (this.isInterrupted) throw new Error("User interrupted.");

      // 2. CONTEXT GATHERING
      this.ui.writeStatusBar(chalk.gray("Status: Gathering context..."));
      this.defaultEngine.loadInBackground();
      const contextAgent = this.agents.getAgent<ContextAgent>("context");
      const contextResults = await contextAgent.run(`${systemPrompt}\n\nTask: ${input}`, intent);
      if (this.isInterrupted) throw new Error("User interrupted.");
      
      const contextTools = PromptManager.parseToolCalls(contextResults);
      for (const call of contextTools) {
          this.ui.writeStatusBar(chalk.gray(`Status: Executing ${call.name}`));
          const res = await (tools[call.name] || { execute: () => this.mcp.callTool(call.name, call.parameters) } as any).execute(call.parameters);
          this.history.push({ role: "system", content: PromptManager.formatToolResult(res) });
          if (this.isInterrupted) throw new Error("User interrupted.");
      }

      // 3. DISPATCH & PLAN
      this.ui.writeStatusBar(chalk.gray("Status: Planning execution..."));
      const dispatcher = this.agents.getAgent<DispatcherAgent>("dispatcher");
      const dispatchResponse = await dispatcher.run(`${systemPrompt}\n\n${this.stateManager.getProjectSummary()}\n${input}`, this.history.map(h => `${h.role}: ${h.content}`));
      if (this.isInterrupted) throw new Error("User interrupted.");

      this.stateManager.writeScratchpad(dispatchResponse);
      
      if (!dispatchResponse.includes("BoilerplateAgent") && !dispatchResponse.includes("RefactorAgent")) {
        await this.defaultEngine.unload();
      }

      let finalTurnResponse = dispatchResponse;
      if (dispatchResponse.includes("PatchAgent")) {
          this.ui.writeStatusBar(chalk.cyan("Status: Delegating to PatchAgent..."));
          const patcher = this.agents.getAgent<any>("patcher");
          finalTurnResponse = await patcher.run(`${systemPrompt}\n\nContext updated in scratchpad. Execute.`);
      } else if (dispatchResponse.includes("BoilerplateAgent")) {
          this.ui.writeStatusBar(chalk.cyan("Status: Delegating to BoilerplateAgent..."));
          const builder = this.agents.getAgent<any>("boilerplate");
          finalTurnResponse = await builder.run(`${systemPrompt}\n\nContext updated in scratchpad. Build.`);
      } else if (dispatchResponse.includes("TemplateAgent")) {
          this.ui.writeStatusBar(chalk.cyan("Status: Delegating to TemplateAgent..."));
          const weaver = this.agents.getAgent<any>("template");
          finalTurnResponse = await weaver.run(`${systemPrompt}\n\nContext updated in scratchpad. Map.`);
      }
      if (this.isInterrupted) throw new Error("User interrupted.");

      this.commandQueue = PromptManager.parseToolCalls(finalTurnResponse);
      const plainText = finalTurnResponse.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "").trim();
      
      if (plainText && !plainText.includes("patch_file")) {
          this.ui.write(chalk.blue.bold("AI: ") + plainText + "\n");
      }

      if (this.commandQueue.length > 0) {
          this.ui.writeStatusBar(chalk.gray("Status: Awaiting user approval..."));
          const mode = await this.requestQueueApproval();
          if (mode === "abort") {
              this.ui.write(chalk.red("✖ Batch cancelled.\n"));
              this.commandQueue = [];
              return;
          }

          let autoApprove = (mode === "all");

          while (this.commandQueue.length > 0 && !this.isInterrupted) {
              const toolCall = this.commandQueue.shift()!;
              
              if (!autoApprove) {
                  this.ui.write(chalk.yellow(`\nNext action: ${toolCall.name}\n`));
              }

              const validation = this.guard.validateToolCall(toolCall.name, toolCall.parameters);
              if (!validation.safe) {
                const errorMsg = `Error: Tool call rejected. ${validation.reason}`;
                this.ui.write(chalk.red(`\n✖ ${errorMsg}\n`));
                this.history.push({ role: "system", content: errorMsg });
                continue;
              }

              const dangerousTools = ["run_cmd", "cache_global_ref", "scaffold_project", "git_manager", "package_manager"];
              if (!autoApprove && dangerousTools.includes(toolCall.name)) {
                  let prompt = `Execute ${toolCall.name}?`;
                  if (toolCall.name === "git_manager") prompt = `Perform git ${toolCall.parameters.action}?`;
                  if (toolCall.name === "package_manager") prompt = `${toolCall.parameters.action} package ${toolCall.parameters.package}?`;
                  
                  const confirmed = await this.guard.confirmCommand(prompt);
                  if (!confirmed) {
                      this.ui.write(chalk.yellow("⚠ Skipped.\n"));
                      continue;
                  }
              }

              this.ui.writeStatusBar(chalk.yellow(`Status: Executing ${toolCall.name}...`));
              try {
                let result: string;
                if (tools[toolCall.name]) {
                  result = await (tools[toolCall.name] as any).execute(toolCall.parameters);
                } else {
                  result = await this.mcp.callTool(toolCall.name, toolCall.parameters);
                }

                if (result.startsWith("PAUSE_FOR_USER:")) {
                    this.ui.writeStatusBar(chalk.blue("Status: AI awaiting user input..."));
                    const question = result.replace("PAUSE_FOR_USER:", "").trim();
                    const answer = await this.askUserPrompt(question);
                    this.history.push({ role: "system", content: `User Answer: ${answer}` });
                    continue;
                }

                const formattedResult = PromptManager.formatToolResult(result);
                this.history.push({ role: "system", content: formattedResult });
                this.ui.writeStatusBar(chalk.green(`Status: ${toolCall.name} completed.`));

                if (toolCall.name === "write_file" || toolCall.name === "patch_file") {
                  this.ui.writeStatusBar(chalk.cyan("Status: Auto-Verifying Changes..."));
                  this.tinyEngine.loadInBackground();
                  const verification = this.runVerification();
                  if (verification.success) {
                    this.ui.stopSpinner(chalk.green("✔ Verification Passed."));
                  } else {
                    this.ui.stopSpinner(chalk.red("✖ Verification Failed."));
                    
                    const codeMetrics = calculateCodeMetrics(process.cwd());
                    const metricsReport = `\n--- Code Metrics Report ---\nTotal Lines: ${codeMetrics.totalLines}\nLargest Files (lines):\n${codeMetrics.fileMetrics.sort((a: any,b: any) => b.lines - a.lines).slice(0, 5).map((m: any) => `  - ${m.file}: ${m.lines}`).join('\n')}\n--- End Report ---\n`;
                    
                    const debuggerAgent = this.agents.getAgent<DebugAgent>("debugger");
                    const analysis = await debuggerAgent.run(`${systemPrompt}\n\n${verification.output}\n${metricsReport}`);
                    this.stateManager.writeScratchpad(analysis);
                    this.ui.write(chalk.magenta.bold("\n🔍 Debugger: ") + analysis + "\n");
                    this.history.push({ role: "system", content: `Debugger: ${analysis}` });
                    this.commandQueue = [];
                  }
                }
              } catch (err: any) {
                this.ui.writeStatusBar(chalk.red(`Status: Error executing ${toolCall.name}: ${err.message}`));
                this.history.push({ role: "system", content: `Error: ${err.message}` });
              }
          }
      } else {
          return;
      }
    }
  }

  async cleanup() {
      await this.mcp.cleanup();
      await this.defaultEngine.unload();
      await this.tinyEngine.unload();
  }
}