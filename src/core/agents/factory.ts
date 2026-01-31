import { InferenceEngine } from "../inference.js";
import { 
    PlannerAgent, 
    PatchAgent, 
    BoilerplateAgent, 
    TemplateAgent, 
    RefactorAgent, 
    DebugAgent 
} from "./base.js";

export type AgentType = "planner" | "patcher" | "boilerplate" | "template" | "refactor" | "debugger";

export class AgentFactory {
  private agents: Map<AgentType, any> = new Map();

  constructor(engineMap: Record<string, InferenceEngine>) {
    const defaultEng = (engineMap["planner"] || engineMap["default"])!;
    const tinyEng = (engineMap["tiny"] || engineMap["default"])!;

    this.agents.set("planner", new PlannerAgent(defaultEng));
    this.agents.set("patcher", new PatchAgent(tinyEng)); // Sniper runs on tiny model
    this.agents.set("boilerplate", new BoilerplateAgent(defaultEng));
    this.agents.set("template", new TemplateAgent(tinyEng)); // Weaver runs on tiny model
    this.agents.set("refactor", new RefactorAgent(defaultEng));
    this.agents.set("debugger", new DebugAgent(tinyEng));
  }

  getAgent<T>(type: AgentType): T {
    return this.agents.get(type) as T;
  }
}