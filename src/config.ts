import { join } from "path";
import { homedir } from "os";

export const CONFIG = {
  // Default directory for storing models and persistent state
  FLOWCODER_DIR: join(homedir(), ".flowcoder"),
  
  // Subdirectories
  MODELS_DIR: join(homedir(), ".flowcoder", "models"),
  TASKS_DIR: join(homedir(), ".flowcoder", "tasks"),
  
  // Default configuration
  DEFAULT_MODEL_REPO: "Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF",
  DEFAULT_MODEL_FILE: "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf",
  
  // Context settings
  DEFAULT_CONTEXT_SIZE: 4096,
};
