import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adjectives,
  generateFactoryName,
  nouns,
} from "../../app/models/factory-names";

describe("generateFactoryName", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an <adjective> <noun> pair from the banks", () => {
    const name = generateFactoryName();
    const lastSpace = name.lastIndexOf(" ");
    expect(lastSpace).toBeGreaterThan(0);
    const adj = name.slice(0, lastSpace);
    const noun = name.slice(lastSpace + 1);
    expect(adjectives).toContain(adj);
    expect(nouns).toContain(noun);
  });

  it("is deterministic when Math.random is stubbed (first entries)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(generateFactoryName()).toBe(`${adjectives[0]} ${nouns[0]}`);
  });

  it("selects the last entry when Math.random approaches 1", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999999);
    expect(generateFactoryName()).toBe(
      `${adjectives[adjectives.length - 1]} ${nouns[nouns.length - 1]}`,
    );
  });

  it("draws the adjective first, then the noun (call order)", () => {
    // Distinct values lock order: a low adjective index, a high noun index.
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.999999);
    expect(generateFactoryName()).toBe(
      `${adjectives[0]} ${nouns[nouns.length - 1]}`,
    );
  });

  it("separates exactly two non-empty tokens with a single space", () => {
    const name = generateFactoryName();
    expect(name).not.toBe("");
    expect(name).toMatch(/^[A-Za-z-]+ [A-Za-z]+$/);
  });
});
