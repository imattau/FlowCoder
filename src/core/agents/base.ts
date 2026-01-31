import { InferenceEngine } from "../inference.js";

export abstract class BaseAgent {
  constructor(protected engine: InferenceEngine) {}
  abstract run(input: string, context?: any): Promise<string>;
}

export class IntentAgent extends BaseAgent {
  private static PROMPT = "You are the Intent Analyst. Categorize the user request into one of: [FEATURE, BUGFIX, REFACTOR, QUESTION, SCAFFOLD].\n" +
"Output ONLY the category and a one-sentence summary.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`${IntentAgent.PROMPT}\n\nUser: ${input}`);
  }
}

export class ContextAgent extends BaseAgent {
  private static PROMPT = "You are the Context Gatherer. Your job is to find the relevant files and code symbols needed to fulfill the user's intent.\n" +
"Additionally, analyze the existing codebase for architectural patterns, modularity, and object-oriented structures.\n" +
"Use 'search', 'list_symbols', or 'read_file' tools.\n" +
"Output your findings clearly to the scratchpad, summarizing the detected architectural style and modularity. When you have enough context, say 'CONTEXT_COMPLETE'.";

  async run(input: string, intent: string): Promise<string> {
    return this.engine.generateResponse(`${ContextAgent.PROMPT}\n\nIntent: ${intent}\nTask: ${input}\nAssistant:`);
  }
}

export class DispatcherAgent extends BaseAgent {
  private static PROMPT = "You are the Lead Dispatcher. Based on the gathered context (including architectural analysis from the scratchpad), write a detailed Execution Plan to '.flowcoder/context/scratchpad.md'.\n" +
"STRICT RULE: Prioritize modular, object-oriented design. Break down tasks into small, cohesive units.\n" +
"Then, delegate to the correct Coder agent by mentioning its name: [PatchAgent, BoilerplateAgent, TemplateAgent, RefactorAgent].\n" +
"RESUMPTION RULE: If you detect a previous task or goals in the context, start by summarizing where you are and proposing the immediate next step.";

  async run(input: string, history: string[] = []): Promise<string> {
    const fullPrompt = `${DispatcherAgent.PROMPT}\n\nHistory:\n${history.join("\n")}\n\nUser: ${input}\nAssistant:`;
    return this.engine.generateResponse(fullPrompt);
  }
}

export class PatchAgent extends BaseAgent {
  private static PROMPT = "You are the Sniper Coder. Your job is to read the task from '.flowcoder/context/scratchpad.md' and provide a precise 'patch_file' call.\n" +
"STRICT RULE: Only output tool calls. Do not explain yourself.\n" +
"Ensure patches are small and adhere to the project's modularity principles.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`${PatchAgent.PROMPT}\n\nTask context is in the scratchpad. Execute now.`);
  }
}

export class BoilerplateAgent extends BaseAgent {
  private static PROMPT = "You are the Builder. Read the structural requirements from '.flowcoder/context/scratchpad.md' and implement them using 'write_file' or 'scaffold_project'.\n" +
"STRICT RULE: Generate modular and object-oriented code, creating well-defined classes, functions, or modules.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`${BoilerplateAgent.PROMPT}\n\nProceed based on scratchpad.`);
  }
}

export class TemplateAgent extends BaseAgent {
  private static PROMPT = "You are the Weaver. Read the variable requirements from '.flowcoder/context/scratchpad.md' and use 'apply_template'.\n" +
"Prioritize templates that promote modularity and object-oriented design, such as 'service-class' or 'repository-interface'.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`${TemplateAgent.PROMPT}\n\nProceed based on scratchpad.`);
  }
}

export class RefactorAgent extends BaseAgent {
  private static PROMPT = "You are the Semanticist. Read the refactoring plan from '.flowcoder/context/scratchpad.md' and use 'refactor_rename'.\n" +
"Focus on improving modularity and adhering to object-oriented principles.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`${RefactorAgent.PROMPT}\n\nProceed based on scratchpad.`);
  }
}

export class DebugAgent extends BaseAgent {
  private static PROMPT = "You are the Debugger. Analyze the errors provided. Write your fix plan to '.flowcoder/context/scratchpad.md' so the Coder agents can implement it.\n" +
"Identify if failures are due to poor modularity or architectural inconsistencies.";

  async run(errorLog: string): Promise<string> {
    const fullPrompt = `${DebugAgent.PROMPT}\n\nError Log:\n${errorLog}\n\nAnalysis:`;
    return this.engine.generateResponse(fullPrompt);
  }
}