import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Guards C2: alert() was replaced by the toast primitive. A re-introduced
// blocking alert() in a hook (even on a path the flow tests don't exercise)
// fails here.
describe("no alert() in app/hooks", () => {
  const dir = join(process.cwd(), "app/hooks");
  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".ts") || f.endsWith(".tsx"),
  );

  it.each(files)("%s has no alert( call", (file) => {
    const src = readFileSync(join(dir, file), "utf8");
    expect(src).not.toMatch(/\balert\s*\(/);
  });
});
