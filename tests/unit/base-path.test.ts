import { afterEach, describe, expect, it, vi } from "vitest";
import { withBasePath } from "@/app/utils";

describe("withBasePath()", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefixes root-relative paths when NEXT_PUBLIC_BASE_PATH is set", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/the-factory-planner");
    expect(withBasePath("/images/items/foo_64.png")).toBe(
      "/the-factory-planner/images/items/foo_64.png",
    );
  });

  it("applies the base path exactly once", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/the-factory-planner");
    const result = withBasePath("/images/items/foo_64.png");
    expect(result.match(/\/the-factory-planner/g)).toHaveLength(1);
  });

  it("returns input unchanged when NEXT_PUBLIC_BASE_PATH is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", undefined);
    expect(withBasePath("/images/items/foo_64.png")).toBe(
      "/images/items/foo_64.png",
    );
  });

  it("returns input unchanged when NEXT_PUBLIC_BASE_PATH is empty", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
    expect(withBasePath("/images/items/foo_64.png")).toBe(
      "/images/items/foo_64.png",
    );
  });
});
