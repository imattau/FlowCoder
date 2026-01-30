import { getLlama, LlamaModel } from "node-llama-cpp";

export class LlamaEngine {
  private model: LlamaModel | null = null;

  async loadModel(modelPath: string) {
    const llama = await getLlama();
    this.model = await llama.loadModel({
      modelPath: modelPath,
    });
  }

  isLoaded(): boolean {
    return this.model !== null;
  }
}
