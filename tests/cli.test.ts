import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8"));

describe("FlowCoder CLI", () => {
  it("should display version when --version is passed", () => {
    const output = execSync("npx ts-node --esm src/index.ts --version").toString().trim();
    expect(output).toBe(pkg.version);
  });

  it("should display greeting when hello command is run", () => {
    const output = execSync("npx ts-node --esm src/index.ts hello").toString().trim();
    expect(output).toBe("Hello from FlowCoder!");
  });

  it("should error if chat is run without --model", () => {
    try {
      execSync("npx ts-node --esm src/index.ts chat", { stdio: "pipe" });
      throw new Error("Should have thrown");
    } catch (err: any) {
      if (err.message === "Should have thrown") throw err;
      expect(err.stderr.toString()).toContain("error: required option '-m, --model <path>' not specified");
    }
  });
});