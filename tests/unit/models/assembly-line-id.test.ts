import { beforeAll, describe, expect, it } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import { recipes } from "@/app/models/library";
import type Recipe from "@/app/models/recipe";

// AC1 (R7.2): every AssemblyLine gets a stable, unique, auto-generated id so graph
// layout keys are unique even when two lines share a recipe slug.
let ironIngotRecipe: Recipe;

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: recipe exists in test data
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
});

describe("AssemblyLine.id", () => {
  it("is a non-empty string", () => {
    const al = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    expect(typeof (al as unknown as { id: string }).id).toBe("string");
    expect((al as unknown as { id: string }).id.length).toBeGreaterThan(0);
  });

  it("is unique across two lines with the same recipe", () => {
    const a = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    const b = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    expect((a as unknown as { id: string }).id).not.toBe(
      (b as unknown as { id: string }).id,
    );
  });
});
