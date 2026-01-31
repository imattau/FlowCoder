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
import { TerminalManager } from "./core/ui/terminal-manager.js";
import { ProjectInitializer } from "./core/project-initializer.js";
import { LlamaLogLevel } from "node-llama-cpp";
import { execSync } from "child_process";
import readline from "readline";
import ora from "ora";
import chalk from "chalk";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8"));

export function createCli() {
  const program = new Command();
  const currentConfig = ConfigManager.loadLocalConfig();
  const modelManager = new ModelManager(currentConfig.MODELS_DIR);
  const stateManager = new StateManager();
  const tm = TerminalManager.getInstance();
  const projectInitializer = new ProjectInitializer();

  let aiTurnInProgress = false;

  program
    .name("flowcoder")
    .description("Run local AI Coding assistant")
    .version(pkg.version);

  program
    .command("init")
    .description("Initialize FlowCoder environment and download models")
    .action(async () => {
      const spinner = ora(chalk.cyan("Initializing FlowCoder...")).start();
      try {
        spinner.text = chalk.cyan("Downloading default model (1.5B)...");
        await modelManager.downloadDefaultModel();
        spinner.text = chalk.cyan("Downloading tiny model (0.5B)...");
        await modelManager.downloadTinyModel();
        spinner.succeed(chalk.green("Environment ready."));
      } catch (err: any) {
        spinner.fail(chalk.red(`Failed to initialize: ${err.message}`));
        process.exit(1);
      }
    });

  program
    .command("task <description>")
    .description("Start a new task")
    .action((description) => {
      const id = Date.now().toString();
      const task = stateManager.createTask(id, description);
      tm.write(`\n${chalk.blue(`🚀 Task started: ${chalk.bold(task.description)} (ID: ${task.id})`)}\n`);
    });

  program
    .command("chat")
    .description("Start an interactive chat session")
    .option("-m, --model <path>", "Path to the GGUF model file")
    .action(async (options) => {
      let modelPath = options.model;
      const tinyModelPath = modelManager.getModelPath(CONFIG.TINY_MODEL_FILE);

      tm.hideCursor();

      if (!modelPath) {
        if (!(await modelManager.isModelDownloaded())) {
            const spinner = ora(chalk.yellow("Default model not found. Downloading...")).start();
            modelPath = await modelManager.downloadDefaultModel();
            spinner.succeed();
        } else {
            modelPath = modelManager.getModelPath();
        }
      }

      if (!(await modelManager.isModelDownloaded(CONFIG.TINY_MODEL_FILE))) {
          const spinner = ora(chalk.yellow("Tiny model not found. Downloading...")).start();
          await modelManager.downloadTinyModel();
          spinner.succeed();
      }

      try {
        const engine = new InferenceEngine();
        await engine.init(modelPath);

        const tinyEngine = new InferenceEngine();
        await tinyEngine.init(tinyModelPath);

        const chatLoop = new ChatLoop(engine, tinyEngine);
        await chatLoop.init();

        tm.clearScreen();
        tm.write(chalk.green("✨ FlowCoder ready. Type '/help' for internal commands or '/exit' to quit.\n"));
        tm.write(chalk.dim("----------------------------------------------------------------------\n"));
        tm.showCursor();

        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          prompt: "", // No default prompt
          terminal: true,
        });

        tm.writeStatusBar(chalk.gray(` CWD: ${process.cwd()} | Default: ${currentConfig.DEFAULT_MODEL_FILE} | Tiny: ${currentConfig.TINY_MODEL_FILE} `));
        tm.render(); // Initial render to draw the box and position cursor
        tm.drawPrompt(chalk.bold.magenta("flowcoder> "));

        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
            process.stdin.on('data', (key) => {
                if (key.toString() === '\x03') { // Ctrl+C
                    tm.showCursor();
                    tm.write(chalk.cyan("\n👋 Happy coding!\n"));
                    process.exit(0);
                }
                if (key.toString() === '\x1b') { // Esc
                    if (aiTurnInProgress) {
                        chatLoop.isInterrupted = true;
                        tm.write(chalk.red("\nAI turn interrupted by user. Returning control...\n"));
                        tm.render();
                        tm.drawPrompt(chalk.bold.magenta("flowcoder> "));
                    }
                }
            });
        }


        rl.on("line", async (line) => {
          const input = line.trim();
          
          if (!input) {
              tm.drawPrompt(chalk.bold.magenta("flowcoder> "));
              return;
          }

          if (input.startsWith("/")) {
              const [cmd, ...args] = input.slice(1).split(" ");
              switch (cmd) {
                  case "help":
                      tm.write(`\n${chalk.bold("Available Commands:")}`);
                      tm.write(`\n${chalk.cyan(" /help")}          Show this help`);
                      tm.write(`\n${chalk.cyan(" /config")}        Show current configuration`);
                      tm.write(`\n${chalk.cyan(" /init [name]")}   Initialize .flowcoder setup for the current project`);
                      tm.write(`\n${chalk.cyan(" /task <desc>")})  Start a new task`);
                      tm.write(`\n${chalk.cyan(" /clear")}         Clear chat history`);
                      tm.write(`\n${chalk.cyan(" /exit")}          Exit FlowCoder`);
                      tm.write(`\n${chalk.cyan(" /quit")}          Exit FlowCoder`);
                      tm.write(`\n${chalk.cyan(" ! <cmd>")})       Execute shell command directly\n`);
                      break;
                  case "config":
                      tm.write(`\n${chalk.bold("🛠️  FlowCoder Configuration (Merged):")}`);
                      tm.write(`\n${chalk.dim(JSON.stringify({
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
                      tm.write(`\n${chalk.blue(`🚀 Task started: ${chalk.bold(desc)}`)}\n`);
                      break;
                  case "clear":
                      tm.clearScreen();
                      tm.write(`\n${chalk.yellow("🧹 History cleared.")}\n`);
                      break;
                  case "exit":
                  case "quit":
                      rl.close();
                      return;
                  default:
                      tm.write(`\n${chalk.red("Unknown command: /${cmd}")}\n`);
              }
              tm.render();
              tm.drawPrompt(chalk.bold.magenta("flowcoder> "));
              return;
          }

          if (input.startsWith("!")) {
              const cmd = input.slice(1).trim();
              if (cmd) {
                  const commandSpinner = ora(chalk.yellow(`Executing: ${cmd}`)).start();
                  try {
                      const out = execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
                      commandSpinner.succeed(chalk.green(`Executed: ${cmd}`));
                      tm.write(`\n${out}`);
                  } catch (e: any) {
                      commandSpinner.fail(chalk.red(`Failed: ${cmd}`));
                      tm.write(`\n${chalk.red("Command failed:")} ${e.message}\n${e.stdout}\n${e.stderr}`);
                  }
              }
              tm.render();
              tm.drawPrompt(chalk.bold.magenta("flowcoder> "));
              return;
          }

          try {
            aiTurnInProgress = true;
            await chatLoop.processInput(input);
          } catch (err: any) {
            tm.write(`\n${chalk.red(`Error during chat: ${err.message}`)}\n`);
          } finally {
            aiTurnInProgress = false;
          }
          tm.render();
          tm.drawPrompt(chalk.bold.magenta("flowcoder> "));
        }).on("close", async () => {
          await chatLoop.cleanup();
          tm.showCursor();
          tm.write(chalk.cyan("\n👋 Happy coding!\n"));
          process.exit(0);
        });
      } catch (err: any) {
        tm.write(`\n${chalk.red(`Failed to initialize chat: ${err.message}`)}\n`);
        process.exit(1);
      }
    });

  program
    .command("config")
    .description("View current configuration")
    .action(() => {
        tm.write(`\n${chalk.bold("🛠️  FlowCoder Configuration:")}`);
        tm.write(`\n${chalk.dim(JSON.stringify(CONFIG, null, 2))}\n`);
    });

  return program;
}
