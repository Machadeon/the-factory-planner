import { beforeAll, describe, expect, it } from "vitest";
import Factory from "@/app/models/factory";
import { partSlugLookup, recipeLookup } from "@/app/models/game-data";
import type Part from "@/app/models/part";

let singleRecipePart: Part; // exactly one recipe → auto-add applies
let multiRecipePart: Part; // iron-ingot has multiple recipes

beforeAll(() => {
  singleRecipePart =
    Object.keys(recipeLookup)
      .filter((slug) => recipeLookup[slug].length === 1)
      .map((slug) => partSlugLookup[slug])
      .find(Boolean) ?? partSlugLookup["packaged-rocket-fuel"];
  multiRecipePart = partSlugLookup["iron-ingot"];
});

function freshFactory(): Factory {
  const factory = new Factory();
  return factory;
}

describe("Factory.addProductionLine auto-recipe ownership", () => {
  it("auto-adds the sole recipe when not suppressed (R2.S1)", () => {
    const factory = freshFactory();
    factory.addProductionLine(singleRecipePart);
    const pl = factory.productionLines[0];
    expect(pl.assemblyLines).toHaveLength(1);
    const al = pl.assemblyLines[0];
    expect(al.recipe.slug).toBe(recipeLookup[singleRecipePart.slug][0].slug);
    expect(al.autoCreated).toBe(true);
    const recipe = recipeLookup[singleRecipePart.slug][0];
    expect(al.rate).toBeCloseTo(
      pl.rate / recipe.productLookup[singleRecipePart.slug],
    );
  });

  it("skips the auto-add when suppressed (R2.S2)", () => {
    const factory = freshFactory();
    factory.addProductionLine(singleRecipePart, false, true);
    expect(factory.productionLines[0].assemblyLines).toHaveLength(0);
  });

  it("adds no line for a multi-recipe part (R2.S3)", () => {
    expect(recipeLookup[multiRecipePart.slug].length).toBeGreaterThan(1);
    const factory = freshFactory();
    factory.addProductionLine(multiRecipePart);
    expect(factory.productionLines[0].assemblyLines).toHaveLength(0);
  });
});
