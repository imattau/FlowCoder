import { getLlama } from "node-llama-cpp";
import { LlamaChatSession } from "node-llama-cpp";

export class LlamaEngine {
  private model: any = null;
  private context: any = null;
  private session: any = null;

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
    return await this.session.prompt(prompt);
  }

  isLoaded(): boolean {
    return this.model !== null;
  }
}
