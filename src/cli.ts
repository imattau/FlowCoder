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

      const spinner = ora({
        text: chalk.cyan("Loading AI Models..."),
        discardStdin: false
      }).start();

      try {
        const engine = new InferenceEngine();
        const model = await modelManager.loadModel(modelPath);
        await engine.init(model);

        const tinyModel = await modelManager.loadModel(tinyModelPath);
        const tinyEngine = new InferenceEngine();
        await tinyEngine.init(tinyModel);

        const chatLoop = new ChatLoop(engine, tinyEngine);
        await chatLoop.init();

        spinner.succeed(chalk.green("FlowCoder ready. Type '/help' for internal commands or 'exit' to quit."));
        console.log(chalk.dim("------------------------------------------"));

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
          
          // 1. Slash Commands (Internal)
          if (input.startsWith("/")) {
              const [cmd, ...args] = input.slice(1).split(" ");
              switch (cmd) {
                  case "help":
                      console.log(chalk.bold("\nAvailable Commands:"));
                      console.log(chalk.cyan(" /help") + "          Show this help");
                      console.log(chalk.cyan(" /config") + "        Show current configuration");
                      console.log(chalk.cyan(" /task <desc>") + "  Start a new task");
                      console.log(chalk.cyan(" /clear") + "         Clear chat history");
                      console.log(chalk.cyan(" ! <cmd>") + "       Execute shell command directly\n");
                      break;
                  case "config":
                      console.log(chalk.bold("\n🛠️  FlowCoder Configuration (Merged):"));
                      console.log(chalk.dim(JSON.stringify(currentConfig, null, 2)));
                      break;
                  case "task":
                      const id = Date.now().toString();
                      const desc = args.join(" ");
                      stateManager.createTask(id, desc);
                      console.log(chalk.blue(`\n🚀 Task started: ${chalk.bold(desc)}`));
                      break;
                  case "clear":
                      console.log(chalk.yellow("\n🧹 History cleared."));
                      // Note: We'd need to add a clearHistory method to ChatLoop
                      break;
                  default:
                      console.log(chalk.red(`Unknown command: ${cmd}`));
              }
              rl.prompt();
              return;
          }

          // 2. Bang Commands (External Shell)
          if (input.startsWith("!")) {
              const cmd = input.slice(1).trim();
              if (cmd) {
                  console.log(chalk.yellow(`\nExecuting: ${cmd}`));
                  try {
                      const out = execSync(cmd, { stdio: "inherit" });
                  } catch (e: any) {
                      console.error(chalk.red(`\nCommand failed: ${e.message}`));
                  }
              }
              rl.prompt();
              return;
          }

          // 3. Normal AI Interaction
          try {
            await chatLoop.processInput(input);
          } catch (err: any) {
            console.error(chalk.red(`\nError during chat: ${err.message}`));
          }
          
          rl.prompt();
        }).on("close", async () => {
          await chatLoop.cleanup();
          console.log(chalk.cyan("\n👋 Happy coding!"));
          process.exit(0);
        });
      } catch (err: any) {
        spinner.fail(chalk.red(`Failed to load models: ${err.message}`));
        process.exit(1);
      }
    });

  program
    .command("config")
    .description("View current configuration")
    .action(() => {
        // reuse the logic or move to a helper
        console.log(chalk.bold("\n🛠️  FlowCoder Configuration:"));
        console.log(chalk.dim(JSON.stringify(CONFIG, null, 2)));
    });

  return program;
}