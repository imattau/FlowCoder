import { Command } from "commander";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { CONFIG } from "./config.js";
import { ConfigManager } from "./core/config-manager.js";
import { ModelManager } from "./core/model-manager.js";
import { InferenceEngine } from "./core/inference.js";
import { ChatLoop } from "./core/chat-loop.js";
import { StateManager } from "./core/state.js";
import { BlessedUIManager } from "./core/ui/blessed-ui-manager.js";
import { ProjectInitializer } from "./core/project-initializer.js";
import { LlamaLogLevel } from "node-llama-cpp";
import { execSync } from "child_process";
import ora from "ora";
import chalk from "chalk";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8"));

export function createCli() {
  const program = new Command();
  const currentConfig = ConfigManager.loadLocalConfig();
  const modelManager = new ModelManager(currentConfig.MODELS_DIR);
  const stateManager = new StateManager();
  const ui = BlessedUIManager.getInstance();
  const projectInitializer = new ProjectInitializer();

  let aiTurnInProgress = false;

  program
    .name("flowcoder")
    .description("Run local AI Coding assistant")
    .version(pkg.version);

  program
    .command("init [name]")
    .description("Initialize FlowCoder environment and download models")
    .action(async (name?: string) => {
        await projectInitializer.initializeProject(name);
    });

  program
    .command("task <description>")
    .description("Start a new task")
    .action((description) => {
      const id = Date.now().toString();
      const task = stateManager.createTask(id, description);
      console.log(chalk.blue(`\n🚀 Task started: ${chalk.bold(task.description)} (ID: ${task.id})`));
    });

  program
    .command("chat")
    .description("Start an interactive chat session")
    .option("-m, --model <path>", "Path to the GGUF model file")
    .action(async (options) => {
      let modelPath = options.model;
      const tinyModelPath = modelManager.getModelPath(CONFIG.TINY_MODEL_FILE);

      if (!modelPath) {
        if (!(await modelManager.isModelDownloaded())) {
            console.log(chalk.yellow("Default model not found. Downloading..."));
            modelPath = await modelManager.downloadDefaultModel();
        } else {
            modelPath = modelManager.getModelPath();
        }
      }

      if (!(await modelManager.isModelDownloaded(CONFIG.TINY_MODEL_FILE))) {
          console.log(chalk.yellow("Tiny model not found. Downloading..."));
          await modelManager.downloadTinyModel();
      }

      try {
        const engine = new InferenceEngine();
        await engine.init(modelPath);

        const tinyEngine = new InferenceEngine();
        await tinyEngine.init(tinyModelPath);

        const chatLoop = new ChatLoop(engine, tinyEngine);
        await chatLoop.init();

        ui.clearScreen();
        ui.write(chalk.green("✨ FlowCoder ready. Type '/help' for internal commands or '/exit' to quit.\n"));
        ui.write(chalk.dim("----------------------------------------------------------------------\n"));
        
        ui.writeStatusBar(chalk.gray(` CWD: ${process.cwd()} | Default: ${modelPath.split('/').pop()} | Tiny: ${tinyModelPath.split('/').pop()} `));
        ui.drawPrompt(chalk.bold.magenta("flowcoder> "));

        ui.inputTextBox.on("submit", async (text: string) => {
          const input = text.trim();
          
          if (!input) {
              ui.drawPrompt(chalk.bold.magenta("flowcoder> "));
              return;
          }

          if (input.startsWith("/")) {
              const [cmd, ...args] = input.slice(1).split(" ");
              switch (cmd) {
                  case "help":
                      ui.write(`\n${chalk.bold("Available Commands:")}`);
                      ui.write(`\n${chalk.cyan(" /help")}          Show this help`);
                      ui.write(`\n${chalk.cyan(" /config")}        Show current configuration`);
                      ui.write(`\n${chalk.cyan(" /init [name]")}   Initialize .flowcoder setup for the current project`);
                      ui.write(`\n${chalk.cyan(" /task <desc>")})  Start a new task`);
                      ui.write(`\n${chalk.cyan(" /clear")}         Clear chat history`);
                      ui.write(`\n${chalk.cyan(" /exit")}          Exit FlowCoder`);
                      ui.write(`\n${chalk.cyan(" /quit")}          Exit FlowCoder`);
                      ui.write(`\n${chalk.cyan(" ! <cmd>")})       Execute shell command directly\n`);
                      break;
                  case "config":
                      ui.write(`\n${chalk.bold("🛠️  FlowCoder Configuration (Merged):")}`);
                      ui.write(`\n${chalk.dim(JSON.stringify({
                        FLOWCODER_DIR: currentConfig.FLOWCODER_DIR,
                        MODELS_DIR: currentConfig.MODELS_DIR,
                        TASKS_DIR: currentConfig.TASKS_DIR,
                        GLOBAL_REFS_DIR: currentConfig.GLOBAL_REFS_DIR,
                        DEFAULT_MODEL_REPO: currentConfig.DEFAULT_MODEL_REPO,
                        DEFAULT_MODEL_FILE: currentConfig.DEFAULT_MODEL_FILE,
                        TINY_MODEL_REPO: currentConfig.TINY_MODEL_REPO,
                        TINY_MODEL_FILE: currentConfig.TINY_MODEL_FILE,
                        DEFAULT_CONTEXT_SIZE: currentConfig.DEFAULT_CONTEXT_SIZE,
                        MCP_CONFIG: {
                            enable_defaults: currentConfig.MCP_CONFIG.enable_defaults,
                            defaults: currentConfig.MCP_CONFIG.defaults,
                            custom_servers: currentConfig.MCP_CONFIG.custom_servers
                        }
                      }, null, 2))}\n`);
                      break;
                  case "init":
                      await projectInitializer.initializeProject(args.join(" ") || undefined);
                      break;
                  case "task":
                      const id = Date.now().toString();
                      const desc = args.join(" ");
                      stateManager.createTask(id, desc);
                      ui.write(`\n${chalk.blue("🚀 Task started: ${chalk.bold(desc)}")}\n`);
                      break;
                  case "clear":
                      ui.clearScreen();
                      ui.write(`\n${chalk.yellow("🧹 History cleared.")}\n`);
                      break;
                  case "exit":
                  case "quit":
                      ui.screen.destroy();
                      await chatLoop.cleanup();
                      process.exit(0);
                  default:
                      ui.write(`\n${chalk.red("Unknown command: /${cmd}")}\n`);
              }
              ui.drawPrompt(chalk.bold.magenta("flowcoder> "));
              return;
          }

          if (input.startsWith("!")) {
              const cmd = input.slice(1).trim();
              if (cmd) {
                  ui.write(chalk.yellow(`\nExecuting: ${cmd}`));
                  try {
                      const out = execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
                      ui.write(chalk.green(`✔ Executed: ${cmd}`));
                      ui.write(`\n${out}`);
                  } catch (e: any) {
                      ui.write(chalk.red(`✖ Failed: ${cmd}`));
                      ui.write(`\n${chalk.red("Command failed:")} ${e.message}\n${e.stdout}\n${e.stderr}`);
                  }
              }
              ui.drawPrompt(chalk.bold.magenta("flowcoder> "));
              return;
          }

          try {
            aiTurnInProgress = true;
            await chatLoop.processInput(input);
          } catch (err: any) {
            ui.write(`\n${chalk.red("Error during chat: ${err.message}")}\n`);
          } finally {
            aiTurnInProgress = false;
          }
          ui.drawPrompt(chalk.bold.magenta("flowcoder> "));
        });

        ui.screen.key(["escape"], (ch: string, key: any) => {
            if (aiTurnInProgress) {
                chatLoop.isInterrupted = true;
                ui.write(chalk.red("\nAI turn interrupted by user. Returning control...\n"));
                ui.drawPrompt(chalk.bold.magenta("flowcoder> "));
            }
        });

        ui.screen.key(["C-c"], async (ch: string, key: any) => {
            ui.screen.destroy();
            await chatLoop.cleanup();
            process.exit(0);
        });

      } catch (err: any) {
        console.error(chalk.red(`\nFailed to initialize chat: ${err.message}`));
        process.exit(1);
      }
    });

  program
    .command("config")
    .description("View current configuration")
    .action(() => {
        console.log(chalk.bold("\n🛠️  FlowCoder Configuration:"));
        console.log(chalk.dim(JSON.stringify(CONFIG, null, 2)) + "\n");
    });

  return program;
}
