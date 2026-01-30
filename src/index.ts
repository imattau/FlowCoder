import { Command } from "commander";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { LlamaEngine } from "./inference.ts";
import readline from "readline";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8"));

const program = new Command();

program
  .name("flowcoder")
  .description("Run local AI Coding assistant")
  .version(pkg.version);

program
  .command("hello")
  .description("Display a friendly greeting")
  .action(() => {
    console.log("Hello from FlowCoder!");
  });

program
  .command("chat")
  .description("Start an interactive chat session")
  .requiredOption("-m, --model <path>", "Path to the GGUF model file")
  .action(async (options) => {
    const engine = new LlamaEngine();
    console.log(`Loading model from ${options.model}...`);
    try {
      await engine.loadModel(options.model);
      console.log("Model loaded. Type 'exit' to quit.");

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "> ",
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
            const response = await engine.generateResponse(input);
            console.log(response);
            const metrics = engine.getMetrics();
            console.log(`\x1b[2m(${metrics.tokensPerSecond.toFixed(1)} tokens/sec, ${metrics.durationMs.toFixed(0)}ms)\x1b[0m`);
          } catch (err: any) {
            console.error("Error generating response:", err.message);
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

program.parse();
