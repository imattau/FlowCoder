import { getLlama, LlamaChatSession, LlamaLogLevel, type LlamaModel, type LlamaContext } from "node-llama-cpp";
import ora from "ora";
import chalk from "chalk";

type ModelLoadStatus = "idle" | "loading" | "loaded";

export class InferenceEngine {
  private model: LlamaModel | null = null;
  private context: LlamaContext | null = null;
  private session: LlamaChatSession | null = null;
  private modelPath: string | null = null;
  private loadPromise: Promise<void> | null = null; // To track ongoing loading
  private status: ModelLoadStatus = "idle";
  
  private lastInferenceTime: number = 0;
  private lastTokenCount: number = 0;

  async init(modelPath: string) {
    this.modelPath = modelPath;
  }

  private async performLoad() {
    if (!this.modelPath) throw new Error("Model path not set.");

    const spinner = ora(chalk.dim(`Loading model: \${this.modelPath.split('/').pop()}...`)).start();
    try {
        const llama = await getLlama({
            logLevel: LlamaLogLevel.disabled
        });
        
        this.model = await llama.loadModel({
          modelPath: this.modelPath,
        });
        this.context = await this.model.createContext();
        this.session = new LlamaChatSession({
          contextSequence: this.context.getSequence(),
        });
        this.status = "loaded";
        spinner.succeed(chalk.dim(`Model loaded: \${this.modelPath.split('/').pop()}`));
    } catch (err: any) {
        this.status = "idle"; // Reset status on failure
        spinner.fail(chalk.red(`Failed to load model \${this.modelPath}: \${err.message}`));
        throw err;
    } finally {
        this.loadPromise = null;
    }
  }

  async ensureLoaded() {
    if (this.status === "loaded") return;
    if (this.status === "loading" && this.loadPromise) {
        return this.loadPromise; // Wait for ongoing load
    }
    this.status = "loading";
    this.loadPromise = this.performLoad();
    return this.loadPromise;
  }

  async loadInBackground() {
    if (this.status !== "idle") return; // Already loading or loaded
    this.status = "loading";
    this.loadPromise = this.performLoad();
    // Don't await, let it run in background
  }

  async generateResponse(prompt: string, onToken?: (token: string) => void): Promise<string> {
    await this.ensureLoaded();
    
    if (!this.session) {
      throw new Error("Inference engine failed to load session.");
    }

    const startTime = performance.now();
    let tokenCount = 0;

    const response = await this.session.prompt(prompt, {
      onToken: (tokens) => {
        const text = this.model?.detokenize(tokens);
        if (text && onToken) {
          onToken(text);
        }
        tokenCount += tokens.length;
      }
    });

    this.lastInferenceTime = performance.now() - startTime;
    this.lastTokenCount = tokenCount;

    return response;
  }

  async unload() {
      if (this.status === "loaded") {
          this.session = null;
          this.context = null;
          this.model = null;
          this.status = "idle";
          console.log(chalk.dim(`Model unloaded from memory.`));
      }
  }

  isLoaded(): boolean {
    return this.status === "loaded";
  }
}