import { jest } from "@jest/globals";
// Define the mock outside so it can be used in unstable_mockModule
const mockPrompt = jest.fn().mockResolvedValue("AI response");
const mockLlamaChatSession = jest.fn().mockImplementation(() => ({
    prompt: mockPrompt,
}));
const mockTokenize = jest.fn().mockReturnValue(new Array(10)); // Mock 10 tokens
const mockLoadModel = jest.fn().mockResolvedValue({
    createContext: jest.fn().mockResolvedValue({
        getSequence: jest.fn().mockReturnValue({}),
    }),
    tokenize: mockTokenize,
});
const mockGetLlama = jest.fn().mockResolvedValue({
    loadModel: mockLoadModel,
});
jest.unstable_mockModule("node-llama-cpp", () => ({
    getLlama: mockGetLlama,
    LlamaChatSession: mockLlamaChatSession,
    LlamaContext: jest.fn(),
    LlamaModel: jest.fn(),
}));
const { LlamaEngine } = await import("../src/inference.js");
describe("LlamaEngine", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
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
    it("should generate a response for a given prompt", async () => {
        const engine = new LlamaEngine();
        await engine.loadModel("path/to/model.gguf");
        const response = await engine.generateResponse("Hello");
        expect(response).toBe("AI response");
        expect(mockPrompt).toHaveBeenCalledWith("Hello");
    });
    it("should return performance metrics after generation", async () => {
        const engine = new LlamaEngine();
        await engine.loadModel("path/to/model.gguf");
        await engine.generateResponse("Hello");
        const metrics = engine.getMetrics();
        expect(metrics).toBeDefined();
        expect(metrics).toHaveProperty("tokensPerSecond");
        expect(metrics.tokenCount).toBe(10);
    });
});
//# sourceMappingURL=inference.test.js.map