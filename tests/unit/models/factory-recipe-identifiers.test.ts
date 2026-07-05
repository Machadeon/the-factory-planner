import { describe, expect, it } from "vitest";
import {
  factoryRecipeId,
  factoryRecipeSlug,
} from "@/app/models/factory-recipe";

describe("factory recipe slug helpers (R1)", () => {
  it("round-trips an id through slug and back (R1.S1)", () => {
    expect(factoryRecipeId(factoryRecipeSlug("abc-123"))).toBe("abc-123");
  });

  it("builds the prefixed slug", () => {
    expect(factoryRecipeSlug("abc-123")).toBe("factory:abc-123");
  });

  it("returns input unchanged when prefix is absent (R1.S2)", () => {
    expect(factoryRecipeId("iron-plate")).toBe("iron-plate");
  });
});
