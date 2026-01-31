import { Project, type Node } from "ts-morph";
import { join } from "path";

export class RefactorEngine {
  private project: Project;

  constructor(cwd: string = process.cwd()) {
    this.project = new Project({
      tsConfigFilePath: join(cwd, "tsconfig.json"),
      skipAddingFilesFromTsConfig: true,
    });
  }

  async renameSymbol(filePath: string, oldName: string, newName: string): Promise<string> {
    try {
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      const symbol = sourceFile.getDescendants().find((node: Node) => node.getText() === oldName);

      if (!symbol) {
        return `Error: Symbol '\${oldName}' not found in \${filePath}`;
      }

      // @ts-ignore - simplified for prototype
      symbol.rename(newName);
      await this.project.save();
      
      return `Successfully renamed '\${oldName}' to '\${newName}' in \${filePath} and its references.`;
    } catch (err: any) {
      return `Error refactoring: \${err.message}`;
    }
  }
}