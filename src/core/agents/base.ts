import { InferenceEngine } from "../inference.js";

export abstract class BaseAgent {
  constructor(protected engine: InferenceEngine) {}
  abstract run(input: string, context?: any): Promise<string>;
}

export class PlannerAgent extends BaseAgent {
  private static PROMPT = `You are the Orchestrator. Your job is to analyze the user request and decide which tools to use.
If you need more information, use search or read_file.
If you are ready to implement, use patch_file or write_file.
Always verify your work.`;

  async run(input: string, history: string[] = []): Promise<string> {
    const fullPrompt = `${PlannerAgent.PROMPT}

History:
${history.join("\n")}

User: ${input}
Assistant:`
    return this.engine.generateResponse(fullPrompt);
  }
}

export class CoderAgent extends BaseAgent {
  private static PROMPT = `You are the Coder. Your job is to provide precise code patches.
Use the patch_file tool exclusively if possible.`;

  async run(input: string): Promise<string> {
    const fullPrompt = `${CoderAgent.PROMPT}

Task: ${input}
Assistant:`
    return this.engine.generateResponse(fullPrompt);
  }
}

export class DebugAgent extends BaseAgent {
  private static PROMPT = `You are the Debugger. Your job is to analyze error messages, logs, and stack traces.
Identify the root cause of the failure and suggest a specific fix.
Do not write code yourself; instead, provide a concise explanation of what needs to change for the Coder.`;

  async run(errorLog: string): Promise<string> {
    const fullPrompt = `${DebugAgent.PROMPT}

Error Log:
${errorLog}

Analysis and Fix Plan:`
    return this.engine.generateResponse(fullPrompt);
  }
}