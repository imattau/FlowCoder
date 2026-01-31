import { CONFIG } from "../config.js";
import { existsSync, mkdirSync, createWriteStream } from "fs";
import { join } from "path";
import { getLlama } from "node-llama-cpp";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { BlessedUIManager } from "./ui/blessed-ui-manager.js";
import chalk from "chalk";

export class ModelManager {
  private modelsDir: string;
  private ui: BlessedUIManager;

  constructor(modelsDir: string = CONFIG.MODELS_DIR) {
    this.modelsDir = modelsDir;
    this.ui = BlessedUIManager.getInstance();
    if (!existsSync(this.modelsDir)) {
      mkdirSync(this.modelsDir, { recursive: true });
    }
  }

  async isModelDownloaded(fileName: string = CONFIG.DEFAULT_MODEL_FILE): Promise<boolean> {
    return existsSync(join(this.modelsDir, fileName));
  }

  async downloadModel(
    repo: string,
    fileName: string
  ): Promise<string> {
    const targetPath = join(this.modelsDir, fileName);
    
    if (await this.isModelDownloaded(fileName)) {
      return targetPath;
    }

    const url = `https://huggingface.co/${repo}/resolve/main/${fileName}`;
    this.ui.write(chalk.cyan(`Downloading model ${fileName} from ${repo}...`));
    this.ui.write(chalk.dim(`URL: ${url}`));
    
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download model: ${response.statusText} (${response.status})`);
    }

    if (!response.body) {
      throw new Error("Failed to download model: No response body");
    }

    const writer = createWriteStream(targetPath);
    const nodeReadable = Readable.fromWeb(response.body as any);
    
    nodeReadable.pipe(writer);

    await finished(writer);
    
    this.ui.write(chalk.green(`\nSuccessfully downloaded ${fileName}`));
    return targetPath;
  }

  async downloadDefaultModel(): Promise<string> {
    return this.downloadModel(CONFIG.DEFAULT_MODEL_REPO, CONFIG.DEFAULT_MODEL_FILE);
  }

  async downloadTinyModel(): Promise<string> {
    return this.downloadModel(CONFIG.TINY_MODEL_REPO, CONFIG.TINY_MODEL_FILE);
  }

  async loadModel(modelPath: string) {
    const llama = await getLlama();
    return await llama.loadModel({
      modelPath: modelPath,
    });
  }

  getModelPath(fileName: string = CONFIG.DEFAULT_MODEL_FILE): string {
    return join(this.modelsDir, fileName);
  }
}