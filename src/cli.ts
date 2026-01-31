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
        tm.write(chalk.green("✨ FlowCoder ready. Type '/help' for internal commands or 'exit' to quit.\n"));
        tm.write(chalk.dim("----------------------------------------------------------------------\n"));
        tm.showCursor();

        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          prompt: chalk.bold.magenta("flowcoder> "),
        });

        rl.prompt();

        rl.on("line", async (line) => {
          const input = line.trim();
          
          if (!input) {
              rl.prompt();
              return;
          }

          if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
            rl.close();
            return;
          }

          // --- Command Interception ---
          
          if (input.startsWith("/")) {
              const [cmd, ...args] = input.slice(1).split(" ");
              switch (cmd) {
                  case "help":
                      tm.write(`\n${chalk.bold("Available Commands:")}`);
                      tm.write(`\n${chalk.cyan(" /help")}          Show this help`);
                      tm.write(`\n${chalk.cyan(" /config")}        Show current configuration`);
                      tm.write(`\n${chalk.cyan(" /task <desc>")}  Start a new task`);
                      tm.write(`\n${chalk.cyan(" /clear")}         Clear chat history`);
                      tm.write(`\n${chalk.cyan(" ! <cmd>")}       Execute shell command directly\n`);
                      break;
                  case "config":
                      tm.write(`\n${chalk.bold("🛠️  FlowCoder Configuration (Merged):")}`);
                      tm.write(`\n${chalk.dim(JSON.stringify(currentConfig, null, 2))}`);
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
                  default:
                      tm.write(`\n${chalk.red(`Unknown command: /${cmd}`)}\n`);
              }
              rl.prompt();
              return;
          }

          if (input.startsWith("!")) {
              const cmd = input.slice(1).trim();
              if (cmd) {
                  tm.write(`\n${chalk.yellow(`Executing: ${cmd}`)}\n`);
                  try {
                      execSync(cmd, { stdio: "inherit" });
                  } catch (e: any) {
                      tm.write(`\n${chalk.red(`Command failed: ${e.message}`)}\n`);
                  }
              }
              rl.prompt();
              return;
          }

          try {
            await chatLoop.processInput(input);
          } catch (err: any) {
            tm.write(`\n${chalk.red(`Error during chat: ${err.message}`)}\n`);
          }
          
          rl.prompt();
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