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
      const summary = this.stateManager.getProjectSummary();
      this.history.push({
          role: "system", 
          content: `You are resuming work on a project. ${summary}
${PromptManager.getSystemPrompt(this.mcp.getTools())}` 
      });
  }

  private runVerification(): { success: boolean, output: string } {
    let combinedOutput = "";
    try {
      combinedOutput += `[LINTING: ${this.commands.lint}]
`;
      try {
        execSync(this.commands.lint, { encoding: "utf-8", stdio: "pipe" });
      } catch (e: any) {
        combinedOutput += `Lint Failed:
${e.stdout?.toString() || ""}
${e.stderr?.toString() || ""}
`;
      }
      
      combinedOutput += `
[BUILDING: ${this.commands.build}]
`;
      execSync(this.commands.build, { encoding: "utf-8", stdio: "pipe" });
      
      return { success: true, output: combinedOutput };
    } catch (err: any) {
      combinedOutput += `
CRITICAL ERROR:
${err.stdout?.toString() || ""}
${err.stderr?.toString() || ""}`;
      return { success: false, output: combinedOutput };
    }
  }

  private async requestQueueApproval(): Promise<"all" | "step" | "abort"> {
      if (this.commandQueue.length === 0) return "abort";

      this.ui.write(chalk.bold.yellow("\n📋 Proposed Command Queue:"));
      this.commandQueue.forEach((cmd, idx) => {
          this.ui.write(`
${idx + 1}. ${chalk.cyan(cmd.name)}(${chalk.dim(JSON.stringify(cmd.parameters))})`);
      });

      const answer = await this.ui.getInputPrompt(chalk.bold.magenta("\nExecute actions? [(a)ll / (s)tep / (c)ancel]: "));
      const a = answer.toLowerCase();
      if (a === "a" || a === "all") return "all";
      else if (a === "s" || a === "step") return "step";
      else if (a === "c" || a === "cancel") return "abort";
      else return "abort";
  }

  private async askUserPrompt(question: string): Promise<string> {
      return await this.ui.getInputPrompt(chalk.bold.magenta(`
❓ AI Question: ${question}
Your answer: `));
  }

  async processInput(input: string): Promise<void> {
    this.history.push({ role: "user", content: input });
    this.isInterrupted = false;
    
    let turnCount = 0;
    const maxTurns = 15;

    while (turnCount < maxTurns && !this.isInterrupted) {
      turnCount++;
      
      this.ui.writeStatusBar(chalk.gray("Status: Analyzing intent..."));
      const intentAgent = this.agents.getAgent<IntentAgent>("intent");
      const intent = await intentAgent.run(input);
      this.ui.write(chalk.dim(`Intent: ${intent}
`));
      if (this.isInterrupted) throw new Error("User interrupted.");

      this.ui.writeStatusBar(chalk.gray("Status: Gathering context..."));
      const contextAgent = this.agents.getAgent<ContextAgent>("context");
      const contextResults = await contextAgent.run(input, intent);
      if (this.isInterrupted) throw new Error("User interrupted.");
      const contextTools = PromptManager.parseToolCalls(contextResults);
      for (const call of contextTools) {
          this.ui.writeStatusBar(chalk.gray(`Status: Executing context tool ${call.name}`));
          const res = await (tools[call.name] as any).execute(call.parameters);
          this.history.push({ role: "system", content: PromptManager.formatToolResult(res) });
          if (this.isInterrupted) throw new Error("User interrupted.");
      }

      this.ui.writeStatusBar(chalk.gray("Status: Planning execution..."));
      const dispatcher = this.agents.getAgent<DispatcherAgent>("dispatcher");
      const dispatchResponse = await dispatcher.run(input, this.history.map(h => `${h.role}: ${h.content}`));
      if (this.isInterrupted) throw new Error("User interrupted.");

      this.stateManager.writeScratchpad(dispatchResponse);
      await this.defaultEngine.unload();
      if (this.isInterrupted) throw new Error("User interrupted.");

      let finalTurnResponse = dispatchResponse;
      if (dispatchResponse.includes("PatchAgent")) {
          this.ui.writeStatusBar(chalk.cyan("Status: Delegating to PatchAgent (Sniper)..."));
          const patcher = this.agents.getAgent<any>("patcher");
          finalTurnResponse = await patcher.run("Context updated in scratchpad.");
      } else if (dispatchResponse.includes("BoilerplateAgent")) {
          this.ui.writeStatusBar(chalk.cyan("Status: Delegating to BoilerplateAgent (Builder)..."));
          const builder = this.agents.getAgent<any>("boilerplate");
          finalTurnResponse = await builder.run("Context updated in scratchpad.");
      } else if (dispatchResponse.includes("TemplateAgent")) {
          this.ui.writeStatusBar(chalk.cyan("Status: Delegating to TemplateAgent (Weaver)..."));
          const weaver = this.agents.getAgent<any>("template");
          finalTurnResponse = await weaver.run("Context updated in scratchpad.");
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
                  const verification = this.runVerification();
                  if (verification.success) {
                    this.ui.writeStatusBar(chalk.green("Status: Verification Passed."));
                  } else {
                    this.ui.writeStatusBar(chalk.red("Status: Verification Failed. Consulting Debugger..."));
                    
                    const codeMetrics = calculateCodeMetrics(process.cwd());
                    const metricsReport = `
--- Code Metrics Report ---
Total Lines: ${codeMetrics.totalLines}
Largest Files (lines):
${codeMetrics.fileMetrics.sort((a: any,b: any) => b.lines - a.lines).slice(0, 5).map((m: any) => `  - ${m.file}: ${m.lines}`).join('\n')}
--- End Report ---
`;
                    
                    const debuggerAgent = this.agents.getAgent<DebugAgent>("debugger");
                    const analysis = await debuggerAgent.run(verification.output + metricsReport);
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
          this.ui.writeStatusBar(chalk.gray("Status: Idle. Awaiting user input."));
          return;
      }
    }
    this.ui.writeStatusBar(chalk.gray("Status: Idle. Awaiting user input."));
  }

  async cleanup() {
      await this.mcp.cleanup();
      await this.defaultEngine.unload();
      await this.tinyEngine.unload();
  }
}