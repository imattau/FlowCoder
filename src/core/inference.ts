import { getLlama, LlamaChatSession, LlamaLogLevel, type LlamaModel, type LlamaContext } from "node-llama-cpp";
import ora from "ora";
import chalk from "chalk";
import { BlessedUIManager } from "./ui/blessed-ui-manager.js";

type ModelLoadStatus = "idle" | "loading" | "loaded";

export class InferenceEngine {
  private model: LlamaModel | null = null;
  private context: LlamaContext | null = null;
  private session: LlamaChatSession | null = null;
  private modelPath: string | null = null;
  private loadPromise: Promise<void> | null = null;
  private status: ModelLoadStatus = "idle";
  private ui: BlessedUIManager;
  
  private lastInferenceTime: number = 0;
  private lastTokenCount: number = 0;

  constructor() {
      this.ui = BlessedUIManager.getInstance();
  }

  async init(modelPath: string) {
    this.modelPath = modelPath;
  }

  private async performLoad() {
    if (!this.modelPath) throw new Error("Model path not set.");

    const modelName = this.modelPath.split('/').pop() || 'model';
    this.ui.write(chalk.dim('Loading model: ' + modelName + '...'));
    this.ui.writeStatusBar(chalk.yellow('Loading AI: ' + modelName + '...'));

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
        this.ui.write(chalk.green('✔ Model loaded: ' + modelName));
        this.ui.writeStatusBar(chalk.gray("AI model ready."));
    } catch (err: any) {
        this.status = "idle";
        this.ui.write(chalk.red('✖ Failed to load model ' + this.modelPath + ': ' + err.message));
        throw err;
    } finally {
        this.loadPromise = null;
    }
  }

  async ensureLoaded() {
    if (this.status === "loaded") return;
    if (this.status === "loading" && this.loadPromise) {
        return this.loadPromise;
    }
    this.status = "loading";
    this.loadPromise = this.performLoad();
    return this.loadPromise;
  }

  async loadInBackground() {
    if (this.status !== "idle") return;
    this.status = "loading";
    this.loadPromise = this.performLoad();
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
          const modelName = this.modelPath?.split('/').pop() || 'model';
          this.session = null;
          this.context = null;
          this.model = null;
          this.status = "idle";
          this.ui.write(chalk.dim('Model ' + modelName + ' unloaded from memory.'));
      }
  }

  isLoaded(): boolean {
    return this.status === "loaded";
  }
}