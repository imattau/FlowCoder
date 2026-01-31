import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { CONFIG } from "../config.js";

export class ConfigManager {
  static loadLocalConfig(cwd: string = process.cwd()) {
    const configPath = join(cwd, ".flowcoder.json");
    if (existsSync(configPath)) {
      try {
        const localConfig = JSON.parse(readFileSync(configPath, "utf-8"));
        // Deep merge logic could go here, for now simple merge
        return { ...CONFIG, ...localConfig };
      } catch (err) {
        console.error("Error parsing .flowcoder.json:", err);
      }
    }
    return CONFIG;
  }
}
