import { Command } from "commander";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { CONFIG } from "./config.ts";
import { ModelManager } from "./core/model-manager.ts";
import { InferenceEngine } from "./core/inference.ts";
import { ChatLoop } from "./core/chat-loop.ts";
import { StateManager } from "./core/state.ts";
import readline from "readline";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8"));

export function createCli() {
  const program = new Command();
  const modelManager = new ModelManager();
  const engine = new InferenceEngine();
  const stateManager = new StateManager();

  program
    .name("flowcoder")
    .description("Run local AI Coding assistant")
    .version(pkg.version);

  program
    .command("init")
    .description("Initialize FlowCoder environment and download default model")
    .action(async () => {
      console.log("Initializing FlowCoder...");
      try {
        const path = await modelManager.downloadDefaultModel();
        console.log(`Model ready at: ${path}`);
      } catch (err: any) {
        console.error("Failed to initialize:", err.message);
        process.exit(1);
      }
    });

  program
    .command("task <description>")
    .description("Start a new task")
    .action((description) => {
      const id = Date.now().toString();
      const task = stateManager.createTask(id, description);
      console.log(`Task started: ${task.description} (ID: ${task.id})`);
    });

  program
    .command("chat")
    .description("Start an interactive chat session")
    .option("-m, --model <path>", "Path to the GGUF model file")
    .action(async (options) => {
      let modelPath = options.model;

      if (!modelPath) {
        const isDownloaded = await modelManager.isModelDownloaded();
        if (!isDownloaded) {
          console.log("Default model not found. Running init...");
          modelPath = await modelManager.downloadDefaultModel();
        } else {
          modelPath = modelManager.getModelPath();
        }
      }

      console.log(`Loading model from ${modelPath}...`);
      try {
        const model = await modelManager.loadModel(modelPath);
        await engine.init(model);
        const chatLoop = new ChatLoop(engine);

        console.log("Model loaded. Type 'exit' to quit.");

        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          prompt: "flowcoder> ",
        });

        rl.prompt();

        rl.on("line", async (line) => {
          const input = line.trim();
          if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
            rl.close();
            return;
          }

          if (input) {
            process.stdout.write("AI: ");
            try {
              await chatLoop.processInput(input, (token) => {
                process.stdout.write(token);
              });
              process.stdout.write("\n");
            } catch (err: any) {
              console.error("\nError during chat:", err.message);
            }
          }
          rl.prompt();
        }).on("close", () => {
          console.log("Exiting chat...");
          process.exit(0);
        });
      } catch (err: any) {
        console.error("Failed to load model:", err.message);
        process.exit(1);
      }
    });

  program
    .command("config")
    .description("View or modify configuration")
    .action(() => {
        console.log("Current Configuration:");
        console.log(JSON.stringify(CONFIG, null, 2));
    });

  return program;
}