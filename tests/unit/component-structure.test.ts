import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Standing enforcement of the component-structure contract (spec R1.S4, R4, R5).
const ROOT = process.cwd();
const COMPONENTS_DIR = join(ROOT, "app/components");

const ALLOWED_ROOT_ENTRIES = new Set([
  "ui",
  "factory",
  "planning",
  "optimization",
  "overview",
  "library",
  "logistics",
  "ThemeRegistry.tsx",
]);

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.tsx?$/.test(entry.name)) files.push(full);
  }
  return files;
}

describe("component-structure — R1.S4: no flat files at app/components root", () => {
  it("every root entry is a feature directory or ThemeRegistry.tsx", () => {
    const entries = readdirSync(COMPONENTS_DIR);
    const offenders = entries.filter((e) => !ALLOWED_ROOT_ENTRIES.has(e));
    expect(offenders).toEqual([]);
  });
});

describe("component-structure — R4: no Component suffix", () => {
  it("R4.S1: no filename under app/components/** matches *Component.tsx", () => {
    const offenders = walk(COMPONENTS_DIR).filter((f) =>
      f.endsWith("Component.tsx"),
    );
    expect(offenders.map((f) => f.replace(`${ROOT}/`, ""))).toEqual([]);
  });

  it("R4.S2: factory.ts does not reference the removed AssemblyLineComponent name", () => {
    const text = readFileSync(join(ROOT, "app/models/factory.ts"), "utf8");
    expect(text.includes("AssemblyLineComponent")).toBe(false);
  });
});

describe("component-structure — R5: hook-only files live in app/hooks/", () => {
  it("R5.S1: useFactoryPageFlows.ts is relocated to app/hooks/", () => {
    expect(existsSync(join(ROOT, "app/hooks/useFactoryPageFlows.ts"))).toBe(
      true,
    );
    expect(
      existsSync(join(ROOT, "app/components/factory/useFactoryPageFlows.ts")),
    ).toBe(false);
  });
});
