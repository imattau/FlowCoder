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
        "tiny": tinyEngine
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

  private async askUserPrompt(question: string): Promise<string> {
      const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
      });
      return new Promise((res) => {
          rl.question(chalk.bold.magenta(`\n❓ AI Question: ${question}\nYour answer: `), (ans) => {
              rl.close();
              res(ans);
          });
      });
  }

  async processInput(input: string): Promise<void> {
    this.history.push({ role: "user", content: input });
    
    let turnCount = 0;
    const maxTurns = 15;

    while (turnCount < maxTurns) {
      turnCount++;
      
      const intentSpinner = ora(chalk.dim("Analyzing intent...")).start();
      const intentAgent = this.agents.getAgent<IntentAgent>("intent");
      const intent = await intentAgent.run(input);
      intentSpinner.stop();
      console.log(chalk.dim(`Intent: ${intent}`));

      const contextSpinner = ora(chalk.dim("Gathering context...")).start();
      const contextAgent = this.agents.getAgent<ContextAgent>("context");
      const contextResults = await contextAgent.run(input, intent);
      contextSpinner.stop();
      const contextTools = PromptManager.parseToolCalls(contextResults);
      for (const call of contextTools) {
          const res = await (tools[call.name] as any).execute(call.parameters);
          this.history.push({ role: "system", content: PromptManager.formatToolResult(res) });
      }

      const dispatchSpinner = ora(chalk.dim("Planning execution...")).start();
      const dispatcher = this.agents.getAgent<DispatcherAgent>("dispatcher");
      const dispatchResponse = await dispatcher.run(input, this.history.map(h => `${h.role}: ${h.content}`));
      dispatchSpinner.stop();

      this.stateManager.writeScratchpad(dispatchResponse);
      await this.defaultEngine.unload();

      let finalTurnResponse = dispatchResponse;
      if (dispatchResponse.includes("PatchAgent")) {
          const patcher = this.agents.getAgent<any>("patcher");
          finalTurnResponse = await patcher.run("Context updated in scratchpad.");
      } else if (dispatchResponse.includes("BoilerplateAgent")) {
          const builder = this.agents.getAgent<any>("boilerplate");
          finalTurnResponse = await builder.run("Context updated in scratchpad.");
      } else if (dispatchResponse.includes("TemplateAgent")) {
          const weaver = this.agents.getAgent<any>("template");
          finalTurnResponse = await weaver.run("Context updated in scratchpad.");
      }

      this.commandQueue = PromptManager.parseToolCalls(finalTurnResponse);
      const plainText = finalTurnResponse.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "").trim();
      
      if (plainText && !plainText.includes("patch_file")) {
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
              }

              const validation = this.guard.validateToolCall(toolCall.name, toolCall.parameters);
              if (!validation.safe) {
                const errorMsg = `Error: Tool call rejected. ${validation.reason}`;
                console.log(chalk.red(`\n✖ ${errorMsg}`));
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

                if (result.startsWith("PAUSE_FOR_USER:")) {
                    toolSpinner.stop();
                    const question = result.replace("PAUSE_FOR_USER:", "").trim();
                    const answer = await this.askUserPrompt(question);
                    this.history.push({ role: "system", content: `User Answer: ${answer}` });
                    continue;
                }

                const formattedResult = PromptManager.formatToolResult(result);
                this.history.push({ role: "system", content: formattedResult });
                toolSpinner.succeed(chalk.green(`Done: ${toolCall.name}`));

                if (toolCall.name === "write_file" || toolCall.name === "patch_file") {
                  const verifySpinner = ora(chalk.cyan("Verifying...")).start();
                  const verification = this.runVerification();
                  if (verification.success) {
                    verifySpinner.succeed(chalk.green("OK."));
                  } else {
                    verifySpinner.fail(chalk.red("Fail."));
                    const debuggerAgent = this.agents.getAgent<DebugAgent>("debugger");
                    const analysis = await debuggerAgent.run(verification.output);
                    this.stateManager.writeScratchpad(analysis);
                    console.log(chalk.magenta.bold("\n🔍 Debugger: ") + analysis);
                    this.history.push({ role: "system", content: `Debugger: ${analysis}` });
                    this.commandQueue = [];
                  }
                }
              } catch (err: any) {
                toolSpinner.fail(chalk.red(err.message));
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
