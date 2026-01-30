import { jest } from "@jest/globals";

// Define the mock outside so it can be used in unstable_mockModule
const mockLoadModel = jest.fn().mockResolvedValue({});
const mockGetLlama = jest.fn().mockResolvedValue({
  loadModel: mockLoadModel,
});

jest.unstable_mockModule("node-llama-cpp", () => ({
  getLlama: mockGetLlama,
  LlamaModel: jest.fn(),
}));

const { LlamaEngine } = await import("../src/inference.js");

describe("LlamaEngine", () => {
  it("should attempt to load a model from a given path", async () => {
    const engine = new LlamaEngine();
    const modelPath = "path/to/model.gguf";
    
    await engine.loadModel(modelPath);
    
    expect(mockGetLlama).toHaveBeenCalled();
    expect(mockLoadModel).toHaveBeenCalledWith(expect.objectContaining({
      modelPath: modelPath
    }));
    expect(engine.isLoaded()).toBe(true);
  });
});