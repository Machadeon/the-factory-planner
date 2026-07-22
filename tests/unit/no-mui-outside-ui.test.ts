import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Standing enforcement of the ADR-0001 wrap-and-hide boundary: MUI widgets
// (@mui/material) may only be imported inside app/components/ui/. This is
// the CI-visible regression guard independent of the biome noRestrictedImports
// config (a biome.json edit alone wouldn't fail this test if it drifted).

const ROOT = process.cwd();

// AppRouterCacheProvider / ThemeProvider+createTheme retain the provider
// setup MUI itself requires (ADR-0001 D-C1.1/D-C1.2) — not a widget import.
const ALLOWED_EXCEPTIONS = new Set([
  "app/layout.tsx",
  "app/components/ThemeRegistry.tsx",
]);

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...walk(rel));
    else if (/\.tsx?$/.test(entry.name)) files.push(rel);
  }
  return files;
}

describe("no-mui-outside-ui", () => {
  it("no file outside app/components/ui/ imports from @mui/material", () => {
    const violations: { file: string; line: string }[] = [];
    for (const rel of walk("app")) {
      if (rel.startsWith("app/components/ui/")) continue;
      if (ALLOWED_EXCEPTIONS.has(rel)) continue;
      const text = readFileSync(join(ROOT, rel), "utf8");
      for (const raw of text.split("\n")) {
        const line = raw.trim();
        if (/from ["']@mui\/material(\/|["'])/.test(line)) {
          violations.push({ file: rel, line });
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("no file outside app/components/ui/ authors an sx prop", () => {
    const violations: { file: string; line: string }[] = [];
    for (const rel of walk("app")) {
      if (rel.startsWith("app/components/ui/")) continue;
      const text = readFileSync(join(ROOT, rel), "utf8");
      for (const raw of text.split("\n")) {
        const line = raw.trim();
        if (/\bsx=\{/.test(line)) {
          violations.push({ file: rel, line });
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
