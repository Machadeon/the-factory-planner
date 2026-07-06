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
});
