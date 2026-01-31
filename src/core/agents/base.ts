import { InferenceEngine } from "../inference.js";

export abstract class BaseAgent {
  constructor(protected engine: InferenceEngine) {}
  abstract run(input: string, context?: any): Promise<string>;
}

export class PlannerAgent extends BaseAgent {
  private static PROMPT = "You are the Orchestrator. Your job is to analyze the user request and decide which specialized agents to use.\n" +
"DELEGATION RULES:\n" +
"1. If you need to edit a file, write the SPECIFIC instruction to '.flowcoder/context/scratchpad.md' and call the PatchAgent.\n" +
"2. If you need a whole module, write the structure to '.flowcoder/context/scratchpad.md' and call BoilerplateAgent.\n" +
"3. If starting a new project, use scaffold_project.\n" +
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

export class PatchAgent extends BaseAgent {
  private static PROMPT = "You are the Sniper Coder. Your job is to read the task from '.flowcoder/context/scratchpad.md' and provide a precise 'patch_file' call.\n" +
"STRICT RULE: Only output tool calls. Do not explain yourself.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`
    ${PatchAgent.PROMPT}

Task context is in the scratchpad. Execute now.`);
  }
}

export class BoilerplateAgent extends BaseAgent {
  private static PROMPT = "You are the Builder. Read the structural requirements from '.flowcoder/context/scratchpad.md' and implement them using 'write_file' or 'scaffold_project'.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`
    ${BoilerplateAgent.PROMPT}

Proceed based on scratchpad.`);
  }
}

export class TemplateAgent extends BaseAgent {
  private static PROMPT = "You are the Weaver. Read the variable requirements from '.flowcoder/context/scratchpad.md' and use 'apply_template'.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`
    ${TemplateAgent.PROMPT}

Proceed based on scratchpad.`);
  }
}

export class RefactorAgent extends BaseAgent {
  private static PROMPT = "You are the Semanticist. Read the refactoring plan from '.flowcoder/context/scratchpad.md' and use 'refactor_rename'.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`
    ${RefactorAgent.PROMPT}

Proceed based on scratchpad.`);
  }
}

export class DebugAgent extends BaseAgent {
  private static PROMPT = "You are the Debugger. Analyze the errors provided. Write your fix plan to '.flowcoder/context/scratchpad.md' so the Coder agents can implement it.";

  async run(errorLog: string): Promise<string> {
    const fullPrompt = `
    ${DebugAgent.PROMPT}

Error Log:
${errorLog}

Analysis:`;
    return this.engine.generateResponse(fullPrompt);
  }
}