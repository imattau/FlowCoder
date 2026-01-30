import { Command } from "commander";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

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

program.parse();
