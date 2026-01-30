import { downloadFile } from "@huggingface/hub";
import { CONFIG } from "../config.js";
import { existsSync, mkdirSync, createWriteStream } from "fs";
import { join } from "path";
import { getLlama } from "node-llama-cpp";

export class ModelManager {
  private modelsDir: string;

  constructor(modelsDir: string = CONFIG.MODELS_DIR) {
    this.modelsDir = modelsDir;
    if (!existsSync(this.modelsDir)) {
      mkdirSync(this.modelsDir, { recursive: true });
    }
  }

  async isModelDownloaded(fileName: string = CONFIG.DEFAULT_MODEL_FILE): Promise<boolean> {
    return existsSync(join(this.modelsDir, fileName));
  }

  async downloadDefaultModel(
    repo: string = CONFIG.DEFAULT_MODEL_REPO,
    fileName: string = CONFIG.DEFAULT_MODEL_FILE
  ): Promise<string> {
    const targetPath = join(this.modelsDir, fileName);
    
    if (await this.isModelDownloaded(fileName)) {
      return targetPath;
    }

    console.log(`Downloading model \${fileName} from \${repo}...`);
    
    const response = await downloadFile({
      repo: repo as any,
      path: fileName,
    }) as any;

    if (!response || !response.body) {
      throw new Error("Failed to download model: No response body");
    }

    const writer = createWriteStream(targetPath);
    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      writer.write(value);
    }

    writer.end();
    
    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(targetPath));
      writer.on("error", reject);
    });
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