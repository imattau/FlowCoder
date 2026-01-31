import { InferenceEngine } from "../inference.js";
import { 
    IntentAgent,
    ContextAgent,
    DispatcherAgent, 
    PatchAgent, 
    BoilerplateAgent, 
    TemplateAgent, 
    RefactorAgent, 
    DebugAgent 
} from "./base.js";

export type AgentType = "intent" | "context" | "dispatcher" | "patcher" | "boilerplate" | "template" | "refactor" | "debugger";

export class AgentFactory {
  private agents: Map<AgentType, any> = new Map();

  constructor(engineMap: Record<string, InferenceEngine>) {
    const defaultEng = (engineMap["planner"] || engineMap["default"])!;
    const tinyEng = (engineMap["tiny"] || engineMap["default"])!;

    this.agents.set("intent", new IntentAgent(tinyEng));
    this.agents.set("context", new ContextAgent(tinyEng));
    this.agents.set("dispatcher", new DispatcherAgent(defaultEng));
    
    this.agents.set("patcher", new PatchAgent(tinyEng));
    this.agents.set("boilerplate", new BoilerplateAgent(defaultEng));
    this.agents.set("template", new TemplateAgent(tinyEng));
    this.agents.set("refactor", new RefactorAgent(defaultEng));
    this.agents.set("debugger", new DebugAgent(tinyEng));
  }

  getAgent<T>(type: AgentType): T {
    return this.agents.get(type) as T;
  }
}
