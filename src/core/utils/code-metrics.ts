import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

export function calculateCodeMetrics(cwd: string): { totalLines: number, fileMetrics: Array<{ file: string, lines: number }> } {
    let totalLines = 0;
    const fileMetrics: Array<{ file: string, lines: number }> = [];

    const walkDir = (currentPath: string) => {
        const files = readdirSync(currentPath);
        for (const file of files) {
            const filePath = join(currentPath, file);
            const stats = statSync(filePath);

            if (stats.isDirectory()) {
                if (file !== "node_modules" && file !== ".git" && file !== ".flowcoder") { // Skip common ignored dirs
                    walkDir(filePath);
                }
            } else if (filePath.endsWith(".ts") || filePath.endsWith(".js") || filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) {
                const content = readFileSync(filePath, "utf-8");
                const lines = content.split('\n').length;
                totalLines += lines;
                fileMetrics.push({ file: filePath, lines });
            }
        }
    };

    walkDir(cwd);

    return { totalLines, fileMetrics };
}
