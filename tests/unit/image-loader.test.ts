import { afterEach, describe, expect, it, vi } from "vitest";
import imageLoader from "@/image-loader";

describe("imageLoader()", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefixes root-relative src with the base path when NEXT_PUBLIC_BASE_PATH is set", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/the-factory-planner");
    const result = imageLoader({
      src: "/satisfactory_logo_full_color_small.png",
    });
    expect(result).toBe(
      "/the-factory-planner/satisfactory_logo_full_color_small.png",
    );
    expect(result.match(/\/the-factory-planner/g)).toHaveLength(1);
  });

  it("returns root-relative src unchanged when NEXT_PUBLIC_BASE_PATH is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", undefined);
    expect(imageLoader({ src: "/images/items/foo_64.png" })).toBe(
      "/images/items/foo_64.png",
    );
  });

  it("leaves absolute (non-root-relative) URLs untouched", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/the-factory-planner");
    expect(imageLoader({ src: "https://cdn.example.com/x.png" })).toBe(
      "https://cdn.example.com/x.png",
    );
  });
});
