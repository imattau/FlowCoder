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
    .command("chat")
    .description("Start an interactive chat session")
    .option("-m, --model <path>", "Path to the GGUF model file")
    .action(async (options) => {
      let modelPath = options.model;
      const tinyModelPath = modelManager.getModelPath(CONFIG.TINY_MODEL_FILE);

      if (!modelPath) {
        if (!(await modelManager.isModelDownloaded())) {
            console.log(chalk.yellow("Default model not found. Running init..."));
            await projectInitializer.initializeProject();
            modelPath = modelManager.getModelPath();
        } else {
            modelPath = modelManager.getModelPath();
        }
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
        
        // Start the input loop by drawing the initial prompt
        ui.drawPrompt(chalk.bold.magenta("flowcoder> "));

        // Single 'submit' listener
        ui.inputTextBox.on("submit", async (text: string) => {
          const input = String(text || "").trim();
          
          if (!input) {
              ui.drawPrompt(chalk.bold.magenta("flowcoder> "));
              return;
          }

          if (input.startsWith("/")) {
              const [cmd, ...args] = input.slice(1).split(" ");
              switch (cmd) {
                  case "help":
                      ui.write(`
${chalk.bold("Available Commands:")}`);
                      ui.write(`
${chalk.cyan(" /help")}          Show this help`);
                      ui.write(`
${chalk.cyan(" /config")}        Show current configuration`);
                      ui.write(`
${chalk.cyan(" /init [name]")}   Initialize .flowcoder setup for the current project`);
                      ui.write(`
${chalk.cyan(" /task <desc>")})  Start a new task`);
                      ui.write(`
${chalk.cyan(" /clear")}         Clear chat history`);
                      ui.write(`
${chalk.cyan(" /exit")}          Exit FlowCoder`);
                      ui.write(`
${chalk.cyan(" /quit")}          Exit FlowCoder`);
                      ui.write(`
${chalk.cyan(" ! <cmd>")})       Execute shell command directly\n`);
                      break;
                  case "config":
                      ui.write(`
${chalk.bold("🛠️  FlowCoder Configuration (Merged):")}`);
                      ui.write(`
${chalk.dim(JSON.stringify({
                        FLOWCODER_DIR: currentConfig.FLOWCODER_DIR,
                        MODELS_DIR: currentConfig.MODELS_DIR,
                        DEFAULT_MODEL_FILE: currentConfig.DEFAULT_MODEL_FILE,
                        TINY_MODEL_FILE: currentConfig.TINY_MODEL_FILE
                      }, null, 2))}
`);
                      break;
                  case "init":
                      await projectInitializer.initializeProject(args.join(" ") || undefined);
                      break;
                  case "task":
                      const id = Date.now().toString();
                      const desc = args.join(" ");
                      stateManager.createTask(id, desc);
                      ui.write(`
${chalk.blue("🚀 Task started: ")}${chalk.bold(desc)}
`);
                      break;
                  case "clear":
                      ui.clearScreen();
                      ui.write(`
${chalk.yellow("🧹 History cleared.")}
`);
                      break;
                  case "exit":
                  case "quit":
                      ui.screen.destroy();
                      await chatLoop.cleanup();
                      process.exit(0);
                  default:
                      ui.write(`
${chalk.red("Unknown command: /")}${cmd}
`);
              }
              ui.drawPrompt(chalk.bold.magenta("flowcoder> "));
              return;
          }

          if (input.startsWith("!")) {
              const cmd = input.slice(1).trim();
              if (cmd) {
                  ui.write(chalk.yellow(`
Executing: ${cmd}`));
                  try {
                      const out = execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
                      ui.write(chalk.green(`✔ Executed: ${cmd}`));
                      ui.write(`
${out}`);
                  } catch (e: any) {
                      ui.write(chalk.red(`✖ Failed: ${cmd}`));
                      ui.write(`
${chalk.red("Command failed:")} ${e.message}
${e.stdout}
${e.stderr}`);
                  }
              }
              ui.drawPrompt(chalk.bold.magenta("flowcoder> "));
              return;
          }

          try {
            aiTurnInProgress = true;
            await chatLoop.processInput(input);
          } catch (err: any) {
            ui.write(`
${chalk.red("Error during chat: ")}${err.message}
`);
          } finally {
            aiTurnInProgress = false;
          }
          ui.drawPrompt(chalk.bold.magenta("flowcoder> "));
        });

        ui.screen.key(["escape"], (ch, key) => {
            if (aiTurnInProgress) {
                chatLoop.isInterrupted = true;
                ui.write(chalk.red("\nInterruption signal sent..."));
            }
        });

        ui.screen.key(["C-c"], async (ch, key) => {
            ui.screen.destroy();
            await chatLoop.cleanup();
            process.exit(0);
        });

      } catch (err: any) {
        console.error(chalk.red(`
Failed to initialize chat: ${err.message}`));
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