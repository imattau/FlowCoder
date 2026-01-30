import { getLlama, LlamaChatSession } from "node-llama-cpp";

export class LlamaEngine {
  private model: any = null;
  private context: any = null;
  private session: any = null;
  private lastInferenceTime: number = 0;
  private lastTokenCount: number = 0;

  async loadModel(modelPath: string) {
    const llama = await getLlama();
    this.model = await llama.loadModel({
      modelPath: modelPath,
    });
    this.context = await this.model.createContext();
    this.session = new LlamaChatSession({
      contextSequence: this.context.getSequence(),
    });
  }

  async generateResponse(prompt: string): Promise<string> {
    if (!this.session) {
      throw new Error("Model not loaded");
    }
    const startTime = performance.now();
    const response = await this.session.prompt(prompt);
    this.lastInferenceTime = performance.now() - startTime;
    this.lastTokenCount = this.model.tokenize(response).length;
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

  isLoaded(): boolean {
    return this.model !== null;
  }
}