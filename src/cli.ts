import { Command } from "commander";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { CONFIG } from "./config.js";
import { ModelManager } from "./core/model-manager.js";
import { InferenceEngine } from "./core/inference.js";
import { ChatLoop } from "./core/chat-loop.js";
import { StateManager } from "./core/state.js";
import { LlamaLogLevel } from "node-llama-cpp";
import readline from "readline";
import ora from "ora";
import chalk from "chalk";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8"));

export function createCli() {
  const program = new Command();
  const modelManager = new ModelManager();
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

        spinner.succeed(chalk.green("FlowCoder ready. Type 'exit' to quit."));
        console.log(chalk.dim("------------------------------------------"));

        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          prompt: chalk.bold.magenta("flowcoder> "),
        });

        rl.prompt();

        rl.on("line", async (line) => {
          const input = line.trim();
          if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
            rl.close();
            return;
          }

          if (input) {
            try {
              await chatLoop.processInput(input);
            } catch (err: any) {
              console.error(chalk.red(`\nError during chat: ${err.message}`));
            }
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
        console.log(chalk.bold("\n🛠️  FlowCoder Configuration:"));
        console.log(chalk.dim(JSON.stringify({
            FLOWCODER_DIR: CONFIG.FLOWCODER_DIR,
            MODELS: {
                default: CONFIG.DEFAULT_MODEL_FILE,
                tiny: CONFIG.TINY_MODEL_FILE
            }
        }, null, 2)));

        console.log(chalk.bold("\n🔌 MCP Servers:"));
        const servers = { ...CONFIG.MCP_CONFIG.defaults, ...CONFIG.MCP_CONFIG.custom_servers };
        for (const [name, cfg] of Object.entries(servers)) {
            const status = (cfg as any).enabled !== false ? chalk.green("enabled") : chalk.red("disabled");
            console.log(`- \${chalk.cyan(name)}: \${status}`);
        }
    });

  return program;
}
