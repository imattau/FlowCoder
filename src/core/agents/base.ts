import { InferenceEngine } from "../inference.js";

export abstract class BaseAgent {
  constructor(protected engine: InferenceEngine) {}
  abstract run(input: string, context?: any): Promise<string>;
}

export class PlannerAgent extends BaseAgent {
  private static PROMPT = "You are the Orchestrator. Your job is to analyze the user request and decide which tools to use.\n" +
"If the task involves a library you don't know perfectly, use inspect_library first.\n" +
"If you find useful documentation, you can use cache_global_ref to save it for future use across all projects.\n" +
"Check for existing global documentation using use_global_ref.\n" +
"If you need more information, use search, read_file, or fetch_url.\n" +
"If you are ready to implement, use patch_file or write_file.\n" +
"Always verify your work.";

  async run(input: string, history: string[] = []): Promise<string> {
    const fullPrompt = `
    ${PlannerAgent.PROMPT}

History:
${history.join("\n")} 

User: ${input}
Assistant:`
    return this.engine.generateResponse(fullPrompt);
  }
}

export class CoderAgent extends BaseAgent {
  private static PROMPT = "You are the Coder. Your job is to provide precise code patches.\n" +
"STRICT RULE: Do not guess APIs. If you are modifying code that uses an external library, ensure you have seen its definition via read_file or inspect_library.\n" +
"Use the patch_file tool exclusively if possible.";

  async run(input: string): Promise<string> {
    const fullPrompt = `
    ${CoderAgent.PROMPT}

Task: ${input}
Assistant:`
    return this.engine.generateResponse(fullPrompt);
  }
}

export class DebugAgent extends BaseAgent {
  private static PROMPT = "You are the Debugger. Your job is to analyze error messages, logs, and stack traces.\n" +
"Identify if the failure is caused by an API mismatch or hallucinated function call.\n" +
"If it is, use inspect_library or search to find the correct API signature.\n" +
"Provide a concise explanation of the fix for the Coder.";

  async run(errorLog: string): Promise<string> {
    const fullPrompt = `
    ${DebugAgent.PROMPT}

Error Log:
${errorLog}

Analysis and Fix Plan:`
    return this.engine.generateResponse(fullPrompt);
  }
}