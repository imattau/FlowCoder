import { InferenceEngine } from "../inference.js";
import { PlannerAgent, CoderAgent, DebugAgent } from "./base.js";

export type AgentType = "planner" | "coder" | "debugger";

export class AgentFactory {
  private agents: Map<AgentType, any> = new Map();

  constructor(engineMap: Record<string, InferenceEngine>) {
    this.agents.set("planner", new PlannerAgent((engineMap["planner"] || engineMap["default"])!));
    this.agents.set("coder", new CoderAgent((engineMap["coder"] || engineMap["default"])!));
    this.agents.set("debugger", new DebugAgent((engineMap["debugger"] || engineMap["tiny"] || engineMap["default"])!));
  }

  getAgent<T>(type: AgentType): T {
    return this.agents.get(type) as T;
  }
}
