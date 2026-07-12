import { screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import PartRateSummary from "@/app/components/overview/PartRateSummary";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import { emptyLibrary } from "@/app/models/factory-storage";
import { partSlugLookup, recipes } from "@/app/models/game-data";
import type Part from "@/app/models/part";
import ProductionLine from "@/app/models/production-line";
import type Recipe from "@/app/models/recipe";
import { renderWithProviders } from "../helpers/render-with-providers";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...rest
  }: {
    src: string;
    alt: string;
    [k: string]: unknown;
  }) => (
    // biome-ignore lint/performance/noImgElement: test mock
    <img src={src} alt={alt} {...(rest as object)} />
  ),
}));

let ironIngotRecipe: Recipe;
let ironPlateRecipe: Recipe;
let ironIngotPart: Part;
let ironOrePart: Part;
let ironPlatePart: Part;

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: recipes should exist in test data
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
  // biome-ignore lint/style/noNonNullAssertion: recipes should exist in test data
  ironPlateRecipe = recipes.find((r) => r.slug === "recipe-ironplate-c")!;
  ironIngotPart = partSlugLookup["iron-ingot"];
  ironOrePart = partSlugLookup["iron-ore"];
  ironPlatePart = partSlugLookup["iron-plate"];
});

function buildFactory(): Factory {
  const factory = new Factory();

  // Iron Ingot line: 30 ore/min → 30 ingot/min
  const ingotPl = new ProductionLine(ironIngotPart, 0, 0, false, false);
  ingotPl.assemblyLines = [
    new AssemblyLine({
      recipe: ironIngotRecipe,
      rate: 30,
      allowRemainder: false,
    }),
  ];
  factory.productionLines.push(ingotPl);
  factory._productionLineLookup[ironIngotPart.slug] = ingotPl;

  // Iron Plate line: 30 ingot/min → 20 plate/min (consumes all ingots)
  const platePl = new ProductionLine(ironPlatePart, 0, 20, true, false);
  platePl.assemblyLines = [
    new AssemblyLine({
      recipe: ironPlateRecipe,
      rate: 10,
      allowRemainder: false,
    }),
  ];
  factory.productionLines.push(platePl);
  factory._productionLineLookup[ironPlatePart.slug] = platePl;

  factory._updateRates();
  return factory;
}

describe("PartRateSummary", () => {
  it("displays production rate when netRate is ~0 (intermediate part)", () => {
    const factory = buildFactory();
    // Iron Ingot: produced 30/min, consumed 30/min → netRate = 0 → should show 30/min
    const rate = factory.rateLookup[ironIngotPart.slug];
    renderWithProviders(<PartRateSummary part={ironIngotPart} rate={rate} />, {
      factory,
    });
    expect(screen.getByText(/30/)).toBeInTheDocument();
  });

  it("shows action buttons when netRate < 0 and hideActions=false", () => {
    const factory = buildFactory();
    // Iron Ore: consumed 30, produced 0 → netRate = -30
    const rate = factory.rateLookup[ironOrePart.slug];
    const { container } = renderWithProviders(
      <PartRateSummary part={ironOrePart} rate={rate} hideActions={false} />,
      { factory, library: emptyLibrary() },
    );
    // Action buttons render as cursor-pointer Clickable divs
    const clickables = container.querySelectorAll(".cursor-pointer");
    expect(clickables.length).toBeGreaterThan(0);
  });

  it("hides action buttons when hideActions=true", () => {
    const factory = buildFactory();
    const rate = factory.rateLookup[ironOrePart.slug];
    const { container } = renderWithProviders(
      <PartRateSummary part={ironOrePart} rate={rate} hideActions={true} />,
      { factory, library: emptyLibrary() },
    );
    const clickables = container.querySelectorAll(".cursor-pointer");
    expect(clickables.length).toBe(0);
  });

  it("renders Produced by and Consumed by sections when showDetail=true", () => {
    const factory = buildFactory();
    // Iron Ingot is produced by Iron Ingot recipe and consumed by Iron Plate recipe
    const rate = factory.rateLookup[ironIngotPart.slug];
    renderWithProviders(
      <PartRateSummary part={ironIngotPart} rate={rate} showDetail={true} />,
      { factory },
    );
    expect(screen.getByText(/Produced by:/i)).toBeInTheDocument();
    expect(screen.getByText(/Consumed by:/i)).toBeInTheDocument();
    // Recipe name appears in the producer list (as a list item)
    expect(screen.getAllByText(/Iron Ingot/i).length).toBeGreaterThan(0);
  });

  it("does not render producer/consumer detail when showDetail=false", () => {
    const factory = buildFactory();
    const rate = factory.rateLookup[ironIngotPart.slug];
    renderWithProviders(
      <PartRateSummary part={ironIngotPart} rate={rate} showDetail={false} />,
      { factory },
    );
    expect(screen.queryByText(/Produced by:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Consumed by:/i)).not.toBeInTheDocument();
  });
});
