import { getLlama, LlamaChatSession, LlamaLogLevel, type LlamaModel, type LlamaContext } from "node-llama-cpp";
import ora from "ora";
import chalk from "chalk";

export class InferenceEngine {
  private model: LlamaModel | null = null;
  private context: LlamaContext | null = null;
  private session: LlamaChatSession | null = null;
  private modelPath: string | null = null;
  
  private lastInferenceTime: number = 0;
  private lastTokenCount: number = 0;

  async init(modelPath: string) {
    this.modelPath = modelPath;
  }

  private async ensureLoaded() {
    if (this.session) return;
    if (!this.modelPath) throw new Error("Model path not set. Call init(modelPath) first.");

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
        spinner.succeed(chalk.dim(`Model loaded: \${this.modelPath.split('/').pop()}`));
    } catch (err: any) {
        spinner.fail(chalk.red(`Failed to load model \${this.modelPath}: \${err.message}`));
        throw err;
    }
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
      if (this.session) {
          // In node-llama-cpp, references need to be cleared for GC
          this.session = null;
          this.context = null;
          this.model = null;
          console.log(chalk.dim(`Model unloaded from memory.`));
      }
  }

  getMetrics() {
    const seconds = this.lastInferenceTime / 1000;
    const tps = seconds > 0 ? this.lastTokenCount / seconds : 0;
    return {
      tokensPerSecond: tps,
      durationMs: this.lastInferenceTime,
      tokenCount: this.lastTokenCount
    };
  }

  isInitialized(): boolean {
    return this.modelPath !== null;
  }
}
