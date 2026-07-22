import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RateDisplay from "@/app/components/ui/RateDisplay";
import { partSlugLookup } from "@/app/models/game-data";

const power = partSlugLookup.power;
const ironPlate = partSlugLookup["iron-plate"];

describe("RateDisplay", () => {
  it("renders MW for power and /min for other parts", () => {
    const { rerender } = render(<RateDisplay part={power} rate={63} />);
    expect(screen.getByText(/63\s?MW/)).toBeInTheDocument();
    rerender(<RateDisplay part={ironPlate} rate={63} />);
    expect(screen.getByText(/63\/min/)).toBeInTheDocument();
  });

  it("applies a caller-passed color class verbatim", () => {
    render(
      <RateDisplay part={ironPlate} rate={5} colorClass="text-amber-500" />,
    );
    expect(screen.getByText(/5\/min/).className).toContain("text-amber-500");
  });

  it("applies no color class when none is passed", () => {
    render(<RateDisplay part={ironPlate} rate={5} />);
    const el = screen.getByText(/5\/min/);
    expect(el.className).not.toContain("text-amber-500");
    expect(el.className).not.toContain("text-red-500");
    expect(el.className).not.toContain("text-green-500");
  });

  it("a deficit status renders a distinguishable aria-hidden icon, not just color (#12)", () => {
    render(<RateDisplay part={ironPlate} rate={-5} status="deficit" />);
    const icon = screen.getByTestId("rate-status-icon");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("surplus, balanced, and slooped statuses each render a visually distinct icon", () => {
    const { rerender } = render(
      <RateDisplay part={ironPlate} rate={5} status="surplus" />,
    );
    const surplusIcon = screen.getByTestId("rate-status-icon").innerHTML;

    rerender(<RateDisplay part={ironPlate} rate={0} status="balanced" />);
    const balancedIcon = screen.getByTestId("rate-status-icon").innerHTML;

    rerender(<RateDisplay part={ironPlate} rate={5} status="slooped" />);
    const sloopedIcon = screen.getByTestId("rate-status-icon").innerHTML;

    expect(new Set([surplusIcon, balancedIcon, sloopedIcon]).size).toBe(3);
  });

  it("renders no status icon when the status prop is omitted", () => {
    render(<RateDisplay part={ironPlate} rate={5} />);
    expect(screen.queryByTestId("rate-status-icon")).toBeNull();
  });

  it("ProductionLineRow and Recipe render their status through RateDisplay, not inline color classes (D-C4.1 single home)", () => {
    for (const rel of [
      "app/components/planning/ProductionLineRow.tsx",
      "app/components/planning/Recipe.tsx",
    ]) {
      const src = readFileSync(join(process.cwd(), rel), "utf8");
      expect(src).toMatch(/<RateDisplay/);
    }
  });
});
