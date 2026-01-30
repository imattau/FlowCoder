import { getLlama, LlamaChatSession, LlamaLogLevel, type LlamaModel, type LlamaContext } from "node-llama-cpp";

export class InferenceEngine {
  private model: LlamaModel | null = null;
  private context: LlamaContext | null = null;
  private session: LlamaChatSession | null = null;
  
  private lastInferenceTime: number = 0;
  private lastTokenCount: number = 0;

  async init(model: LlamaModel) {
    // This is called globally once but ensure we are using disabled log level
    await getLlama({
        logLevel: LlamaLogLevel.disabled
    });
    
    this.model = model;
    this.context = await this.model.createContext();
    this.session = new LlamaChatSession({
      contextSequence: this.context.getSequence(),
    });
  }

  async generateResponse(prompt: string, onToken?: (token: string) => void): Promise<string> {
    if (!this.session) {
      throw new Error("Inference engine not initialized. Call init(model) first.");
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
    return this.session !== null;
  }
}