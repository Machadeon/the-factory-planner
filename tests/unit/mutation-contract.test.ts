import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Standing enforcement of the factory-mutation-methods contract (spec R4).
// These fail CI if a component or hook reintroduces a direct model mutation
// or a direct recompute/solve call, so the contract survives past M4.

const ROOT = process.cwd();

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...walk(rel));
    else if (/\.tsx?$/.test(entry.name)) files.push(rel);
  }
  return files;
}

function sourceLines(dirs: string[]): { file: string; line: string }[] {
  const out: { file: string; line: string }[] = [];
  for (const dir of dirs) {
    for (const rel of walk(dir)) {
      const text = readFileSync(join(ROOT, rel), "utf8");
      for (const raw of text.split("\n")) {
        const line = raw.trim();
        // Skip comments and obvious non-code lines.
        if (line.startsWith("//") || line.startsWith("*") || line === "") {
          continue;
        }
        out.push({ file: rel, line });
      }
    }
  }
  return out;
}

const globs = ["app/components", "app/hooks"];

describe("R4 — components mutate only through model methods", () => {
  it("R4.S1 — no direct factory field assignments", () => {
    // Also catches nested writes (factory.optimizer.targets =) and indexed
    // writes (factory.graphLayout[id] =), not just top-level field assignment.
    const banned =
      /\bfactory\.(constraints|optimizer|partPointOverrides|graphLayout|icon|solverError|productionLines|supplierFactories)\b(\.[a-zA-Z]+|\[[^\]]*\])*\s*=(?!=)/;
    const offenders = sourceLines(globs).filter((l) => banned.test(l.line));
    expect(offenders.map((o) => `${o.file}: ${o.line}`)).toEqual([]);
  });

  it("R4.S2 — no direct update()/autoCalculateRates()/optimizeRecipes() calls, no update shim", () => {
    const banned =
      /\bfactory\.(update|autoCalculateRates|optimizeRecipes)\s*\(|\.update\s*=\s*(function|\()/;
    const offenders = sourceLines(globs).filter((l) => banned.test(l.line));
    expect(offenders.map((o) => `${o.file}: ${o.line}`)).toEqual([]);
  });
});
