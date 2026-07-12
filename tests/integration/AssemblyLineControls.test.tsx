import { screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import AssemblyLineControls from "@/app/components/AssemblyLineControls";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import { emptyLibrary } from "@/app/models/factory-storage";
import { recipes } from "@/app/models/game-data";
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

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: recipe fixture exists
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
});

describe("AssemblyLineControls power row (overview-sidebar-structure R3.S2)", () => {
  it("renders the power row through the shared PowerSummary formatting", () => {
    const factory = new Factory();
    const assemblyLine = new AssemblyLine({
      recipe: ironIngotRecipe,
      rate: 30,
      allowRemainder: false,
    });

    renderWithProviders(
      <AssemblyLineControls assemblyLine={assemblyLine} factory={factory} />,
      { factory, library: emptyLibrary() },
    );

    // Fixed clock speed → non-variable power → single "{avg} MW" span, matching
    // PowerSummary's non-variable branch.
    expect(screen.getByText(/^\d+(\.\d+)? MW$/)).toBeInTheDocument();
  });
});
