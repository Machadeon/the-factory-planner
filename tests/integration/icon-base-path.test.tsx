import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Icon from "@/app/components/Icon";

describe("Icon base path handling", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders src containing the base path exactly once when NEXT_PUBLIC_BASE_PATH is set", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/the-factory-planner");
    render(<Icon src="/images/items/foo_64.png" label="Foo" size={20} />);
    const img = screen.getByRole("img", { name: "Foo" });
    const src = img.getAttribute("src") ?? "";
    expect(src).toBe("/the-factory-planner/images/items/foo_64.png");
    expect(src.match(/\/the-factory-planner/g)).toHaveLength(1);
  });

  it("renders unprefixed root-relative src when NEXT_PUBLIC_BASE_PATH is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", undefined);
    render(<Icon src="/images/items/foo_64.png" label="Foo" size={20} />);
    const img = screen.getByRole("img", { name: "Foo" });
    expect(img.getAttribute("src")).toBe("/images/items/foo_64.png");
  });
});
