import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { CONFIG } from "../config.js";
import { findExternalContext } from "./discovery.js";

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
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.dotFolder = join(cwd, ".flowcoder");
    this.ensureStructure();
  }

  private ensureStructure() {
    if (!existsSync(this.dotFolder)) return; // Don't force create on discovery
    const tasksDir = join(this.dotFolder, "tasks");
    if (!existsSync(tasksDir)) mkdirSync(tasksDir);
    const contextDir = join(this.dotFolder, "context");
    if (!existsSync(contextDir)) mkdirSync(contextDir);
  }

  getProjectSummary(): string {
    let summary = "PROJECT CONTEXT:\n";
    
    // 1. FlowCoder Internal State
    const project = this.getProject();
    if (project) {
        summary += `- Name: ${project.name}\n`;
        summary += `- Goals: ${project.goals.join(", ")}\n`;
        summary += `- Conventions: ${project.conventions.join(", ")}\n`;
    }

    // 2. External Context Discovery (Cursor, Claude, README)
    const external = findExternalContext(this.cwd);
    if (external.length > 0) {
        summary += "\nDISCOVERED EXTERNAL CONTEXT:\n";
        for (const ctx of external) {
            summary += `### From ${ctx.source}:\n${ctx.content}\n`;
        }
    }

    const activeTask = this.getLatestTask();
    if (activeTask) {
        summary += `\nLATEST TASK (${activeTask.status}):\n${activeTask.description}\n`;
    }

    const decisionsPath = join(this.dotFolder, "decisions.md");
    if (existsSync(decisionsPath)) {
        const decisions = readFileSync(decisionsPath, "utf-8");
        const lines = decisions.split("\n").filter(l => l.trim()).slice(-5);
        summary += `\nRECENT DECISIONS:\n${lines.join("\n")}\n`;
    }

    return summary;
  }

  private getLatestTask(): TaskState | null {
    const tasksDir = join(this.dotFolder, "tasks");
    if (!existsSync(tasksDir)) return null;
    const files = readdirSync(tasksDir).filter(f => f.endsWith(".json"));
    if (files.length === 0) return null;

    const latest = files
        .map(f => ({ name: f, time: statSync(join(tasksDir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time)[0];

    if (!latest) return null;
    return JSON.parse(readFileSync(join(tasksDir, latest.name), "utf-8"));
  }

  writeScratchpad(content: string) {
    if (!existsSync(this.dotFolder)) mkdirSync(this.dotFolder, { recursive: true });
    this.ensureStructure();
    writeFileSync(join(this.dotFolder, "context", "scratchpad.md"), content);
  }

  readScratchpad(): string {
    const path = join(this.dotFolder, "context", "scratchpad.md");
    if (!existsSync(path)) return "";
    return readFileSync(path, "utf-8");
  }

  saveProject(state: ProjectState) {
    if (!existsSync(this.dotFolder)) mkdirSync(this.dotFolder, { recursive: true });
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
    if (!existsSync(this.dotFolder)) mkdirSync(this.dotFolder, { recursive: true });
    this.ensureStructure();
    writeFileSync(join(this.dotFolder, "tasks", `task-${task.id}.json`), JSON.stringify(task, null, 2));
  }

  logDecision(decision: string) {
    if (!existsSync(this.dotFolder)) mkdirSync(this.dotFolder, { recursive: true });
    const path = join(this.dotFolder, "decisions.md");
    const timestamp = new Date().toISOString();
    appendFileSync(path, `\n## ${timestamp}\n${decision}\n`);
  }

  addReference(ref: string) {
    if (!existsSync(this.dotFolder)) mkdirSync(this.dotFolder, { recursive: true });
    const path = join(this.dotFolder, "references.md");
    appendFileSync(path, `- ${ref}\n`);
  }
}
