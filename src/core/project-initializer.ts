import { join } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import chalk from "chalk";
import ora from "ora";
import { ConfigManager } from "./config-manager.js";
import { ModelManager } from "./model-manager.js";
import { StateManager } from "./state.js"; // This import is necessary to trigger StateManager's constructor

export class ProjectInitializer {
  private cwd: string;
  private modelManager: ModelManager;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    const currentConfig = ConfigManager.loadLocalConfig(this.cwd);
    this.modelManager = new ModelManager(currentConfig.MODELS_DIR);
  }

  async initializeProject(name?: string) {
    const spinner = ora(chalk.cyan("Initializing FlowCoder environment...")).start();
    try {
      const dotFlowcoderPath = join(this.cwd, ".flowcoder");
      if (!existsSync(dotFlowcoderPath)) {
        mkdirSync(dotFlowcoderPath, { recursive: true });
        spinner.text = chalk.cyan("Created .flowcoder directory.");
      }

      const sm = new StateManager(this.cwd); 
      if (name) {
          const project = sm.getProject();
          if (project) {
              project.name = name;
              sm.saveProject(project);
              spinner.text = chalk.cyan(`Project name updated to: \${name}`);
          }
      } else if (!sm.getProject()?.name) { 
          sm.saveProject({
              name: this.cwd.split('/').pop() || "my-flowcoder-project",
              goals: ["Be a helpful AI assistant for this project."],
              conventions: ["Adhere to existing code style."]
          });
          spinner.text = chalk.cyan("Default project.json created.");
      }


      spinner.text = chalk.cyan("Downloading default model (1.5B)...");
      await this.modelManager.downloadDefaultModel();
      spinner.text = chalk.cyan("Downloading tiny model (0.5B)...");
      await this.modelManager.downloadTinyModel();
      
      spinner.succeed(chalk.green("FlowCoder environment ready."));
    } catch (err: any) {
      spinner.fail(chalk.red(`Failed to initialize: \${err.message}`));
      throw err;
    }
  }
}
