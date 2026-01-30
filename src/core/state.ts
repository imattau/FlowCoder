import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "fs";
import { join } from "path";
import { CONFIG } from "../config.js";

export interface ProjectState {
  name: string;
  goals: string[];
  conventions: string[];
}

export interface TaskState {
  id: string;
  description: string;
  status: "active" | "completed" | "pending";
  plan: string[];
  history: string[];
}

export class StateManager {
  private dotFolder: string;

  constructor(cwd: string = process.cwd()) {
    this.dotFolder = join(cwd, ".flowcoder");
    this.ensureStructure();
  }

  private ensureStructure() {
    if (!existsSync(this.dotFolder)) mkdirSync(this.dotFolder);
    const tasksDir = join(this.dotFolder, "tasks");
    if (!existsSync(tasksDir)) mkdirSync(tasksDir);
    
    const decisions = join(this.dotFolder, "decisions.md");
    if (!existsSync(decisions)) writeFileSync(decisions, "# Architectural Decisions\n\n");

    const refs = join(this.dotFolder, "references.md");
    if (!existsSync(refs)) writeFileSync(refs, "# References\n\n");
  }

  saveProject(state: ProjectState) {
    writeFileSync(join(this.dotFolder, "project.json"), JSON.stringify(state, null, 2));
  }

  getProject(): ProjectState | null {
    const path = join(this.dotFolder, "project.json");
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8"));
  }

  createTask(id: string, description: string): TaskState {
    const task: TaskState = {
      id,
      description,
      status: "active",
      plan: [],
      history: []
    };
    this.saveTask(task);
    return task;
  }

  saveTask(task: TaskState) {
    writeFileSync(join(this.dotFolder, "tasks", `task-${task.id}.json`), JSON.stringify(task, null, 2));
  }

  logDecision(decision: string) {
    const path = join(this.dotFolder, "decisions.md");
    const timestamp = new Date().toISOString();
    appendFileSync(path, `\n## ${timestamp}\n${decision}\n`);
  }

  addReference(ref: string) {
    const path = join(this.dotFolder, "references.md");
    appendFileSync(path, `- ${ref}\n`);
  }
}
