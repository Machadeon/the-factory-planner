import { fireEvent, screen } from "@testing-library/react";
import { proxy } from "valtio";
import { beforeAll, describe, expect, it, vi } from "vitest";
import ProductionLine from "@/app/components/planning/ProductionLine";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import { partSlugLookup, recipes } from "@/app/models/game-data";
import type Part from "@/app/models/part";
import ProductionLineModel from "@/app/models/production-line";
import type Recipe from "@/app/models/recipe";
import { renderWithProviders } from "../helpers/render-with-providers";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...rest }: { src: string; alt: string }) => (
    // biome-ignore lint/performance/noImgElement: test mock
    <img src={src} alt={alt} {...(rest as object)} />
  ),
}));

let ironPlateRecipe: Recipe;
let ironPlatePart: Part;

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: fixture exists in game data
  ironPlateRecipe = recipes.find((r) => r.slug === "recipe-ironplate-c")!;
  ironPlatePart = partSlugLookup["iron-plate"];
});

function storeWithAssemblyLine() {
  const raw = new Factory();
  const pl = new ProductionLineModel(ironPlatePart, 20, 20, false, false);
  pl.assemblyLines = [
    new AssemblyLine({
      recipe: ironPlateRecipe,
      rate: 20,
      allowRemainder: false,
    }),
  ];
  raw.productionLines.push(pl);
  raw._productionLineLookup[ironPlatePart.slug] = pl;
  raw._updateRates();
  const store = proxy({ factory: raw });
  return { store, pl: store.factory.productionLines[0] };
}

describe("ProductionLine expanded content click isolation (R1 exclusion clause)", () => {
  it("clicking content inside the expanded assembly-line list does not toggle the row closed", () => {
    const { store, pl } = storeWithAssemblyLine();
    const onToggle = vi.fn();
    renderWithProviders(
      <ProductionLine
        productionLine={pl}
        candidateFactories={[]}
        onDeleteClicked={() => {}}
        forceExpanded={true}
        onToggle={onToggle}
      />,
      { store },
    );

    fireEvent.click(screen.getByLabelText("Remove recipe"));

    expect(onToggle).not.toHaveBeenCalled();
  });
});
