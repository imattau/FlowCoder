import { InferenceEngine } from "../inference.js";

export abstract class BaseAgent {
  constructor(protected engine: InferenceEngine) {}
  abstract run(input: string, context?: any): Promise<string>;
}

export class IntentAgent extends BaseAgent {
  private static PROMPT = "You are the Intent Analyst for FlowCoder, a local AI coding assistant.\n" +
"Your job is to categorize the user request into one of: [FEATURE, BUGFIX, REFACTOR, QUESTION, SCAFFOLD).\n" +
"Output ONLY the category and a one-sentence summary.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`${IntentAgent.PROMPT}\n\nUser: ${input}`);
  }
}

export class ContextAgent extends BaseAgent {
  private static PROMPT = "You are the Context Gatherer for FlowCoder.\n" +
"Your job is to find the relevant files and code symbols needed to fulfill the user's intent.\n" +
"Use 'search', 'list_symbols', or 'read_file' tools in the <tool_call> format.\n" +
"Output your findings clearly to the scratchpad. When you have enough context, say 'CONTEXT_COMPLETE'.";

  async run(input: string, intent: string): Promise<string> {
    return this.engine.generateResponse(`${ContextAgent.PROMPT}\n\nIntent: ${intent}\nTask: ${input}\nAssistant:`);
  }
}

export class DispatcherAgent extends BaseAgent {
  private static PROMPT = "You are the Lead Dispatcher for FlowCoder.\n" +
"Based on the gathered context, write a detailed Execution Plan to '.flowcoder/context/scratchpad.md'.\n" +
"Then, delegate to the correct Coder agent by mentioning its name: [PatchAgent, BoilerplateAgent, TemplateAgent, RefactorAgent).\n" +
"STRICT RULE: Use the <tool_call> format for all tool usage. Do not invent APIs.";

  async run(input: string, history: string[] = []): Promise<string> {
    const fullPrompt = `${DispatcherAgent.PROMPT}\n\nHistory:\n${history.join("\n")}\n\nUser: ${input}\nAssistant:`;
    return this.engine.generateResponse(fullPrompt);
  }
}

export class PatchAgent extends BaseAgent {
  private static PROMPT = "You are the Sniper Coder for FlowCoder.\n" +
"Read the task from '.flowcoder/context/scratchpad.md' and provide a precise 'patch_file' call.\n" +
"STRICT RULE: Only output tool calls in <tool_call> format. Do not explain yourself.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`${PatchAgent.PROMPT}\n\nTask context is in the scratchpad. Execute now.`);
  }
}

export class BoilerplateAgent extends BaseAgent {
  private static PROMPT = "You are the Builder for FlowCoder. Read requirements from '.flowcoder/context/scratchpad.md' and implement using 'write_file' or 'scaffold_project'.\n" +
"STRICT RULE: Use <tool_call> format.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`${BoilerplateAgent.PROMPT}\n\nProceed based on scratchpad.`);
  }
}

export class TemplateAgent extends BaseAgent {
  private static PROMPT = "You are the Weaver for FlowCoder. Read variable requirements from '.flowcoder/context/scratchpad.md' and use 'apply_template'.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`${TemplateAgent.PROMPT}\n\nProceed based on scratchpad.`);
  }
}

export class RefactorAgent extends BaseAgent {
  private static PROMPT = "You are the Semanticist for FlowCoder. Read the refactoring plan from '.flowcoder/context/scratchpad.md' and use 'refactor_rename'.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`${RefactorAgent.PROMPT}\n\nProceed based on scratchpad.`);
  }
}

export class DebugAgent extends BaseAgent {
  private static PROMPT = "You are the Debugger for FlowCoder. Analyze the errors provided. Write your fix plan to '.flowcoder/context/scratchpad.md'.";

  async run(errorLog: string): Promise<string> {
    const fullPrompt = `${DebugAgent.PROMPT}\n\nError Log:\n${errorLog}\n\nAnalysis:`;
    return this.engine.generateResponse(fullPrompt);
  }
}
