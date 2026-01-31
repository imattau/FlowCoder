import { InferenceEngine } from "../inference.js";

export abstract class BaseAgent {
  constructor(protected engine: InferenceEngine) {}
  abstract run(input: string, context?: any): Promise<string>;
}

export class PlannerAgent extends BaseAgent {
  private static PROMPT = "You are the Orchestrator. Your job is to analyze the user request and decide which specialized agents to use.\n" +
"DELEGATION RULES:\n" +
"1. If you need to edit a small part of an existing file, use the PatchAgent.\n" +
"2. If you need to create a whole new file or project, use the BoilerplateAgent.\n" +
"3. If you want to use a standard pattern (React, CRUD), use the TemplateAgent.\n" +
"4. If you need to rename symbols or safely refactor, use the RefactorAgent.\n" +
"Always check for existing documentation using use_global_ref or inspect_library first.";

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
  private static PROMPT = "You are the Sniper Coder. Your ONLY job is to provide precise search-and-replace patches.\n" +
"STRICT RULE: Only output tool calls for 'patch_file'. Do not explain yourself.\n" +
"Focus on EXACT matching of whitespace and indentation.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`
    ${PatchAgent.PROMPT}

Task: ${input}`);
  }
}

export class BoilerplateAgent extends BaseAgent {
  private static PROMPT = "You are the Builder. Your job is to generate entire file structures or new modules.\n" +
"Use 'write_file' or 'scaffold_project' tools to implement the requested structure.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`
    ${BoilerplateAgent.PROMPT}

Task: ${input}`);
  }
}

export class TemplateAgent extends BaseAgent {
  private static PROMPT = "You are the Weaver. Your job is to map user requirements to existing code templates.\n" +
"Use 'list_templates' to see what's available and 'apply_template' to generate the code.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`
    ${TemplateAgent.PROMPT}

Task: ${input}`);
  }
}

export class RefactorAgent extends BaseAgent {
  private static PROMPT = "You are the Semanticist. Your job is to perform safe, AST-based refactoring.\n" +
"Use the 'refactor_rename' tool to ensure consistency across the codebase.";

  async run(input: string): Promise<string> {
    return this.engine.generateResponse(`
    ${RefactorAgent.PROMPT}

Task: ${input}`);
  }
}

export class DebugAgent extends BaseAgent {
  private static PROMPT = "You are the Debugger. Your job is to analyze error messages, logs, and stack traces.\n" +
"Identify if the failure is caused by an API mismatch or hallucinated function call.\n" +
"If the error is due to a missing or renamed symbol, suggest using refactor_rename.\n" +
"Provide a concise explanation of the fix for the specialized Coder agents.";

  async run(errorLog: string): Promise<string> {
    const fullPrompt = `
    ${DebugAgent.PROMPT}

Error Log:
${errorLog}

Analysis and Fix Plan:`;
    return this.engine.generateResponse(fullPrompt);
  }
}
