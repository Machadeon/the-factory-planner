import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import ProductionLineComp from "@/app/components/planning/ProductionLine";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import {
  partSlugLookup,
  recipeLookup,
  recipeSlugLookup,
} from "@/app/models/game-data";
import type Part from "@/app/models/part";
import ProductionLine from "@/app/models/production-line";
import type Recipe from "@/app/models/recipe";
import { renderWithProviders } from "../helpers/render-with-providers";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...rest }: { src: string; alt: string }) => (
    // biome-ignore lint/performance/noImgElement: test mock
    <img src={src} alt={alt} {...(rest as object)} />
  ),
}));

beforeAll(() => {
  // Each test uses a distinct multi-recipe part so valtio proxying of a shared
  // recipe/part in one test cannot bleed into the next.
  for (const slug of ["iron-ingot", "iron-plate", "iron-rod"]) {
    expect(recipeLookup[slug].length).toBeGreaterThan(1);
  }
});

afterEach(cleanup);

function factoryWithLine(pl: ProductionLine): Factory {
  const factory = new Factory();
  factory.productionLines.push(pl);
  factory._productionLineLookup[pl.part.slug] = pl;
  factory._updateRates();
  return factory;
}

function renderLine(pl: ProductionLine) {
  return renderWithProviders(
    <ProductionLineComp
      productionLine={pl}
      candidateFactories={[]}
      onDeleteClicked={() => {}}
      forceExpanded={null}
      onToggle={() => {}}
    />,
    { factory: factoryWithLine(pl) },
  );
}

// A satisfied production line: one assembly line whose output exactly meets the
// line rate, so needMoreProduction is false and the picker is hidden.
function satisfiedLine(partSlug: string, recipe: Recipe): ProductionLine {
  const part: Part = partSlugLookup[partSlug];
  const al = new AssemblyLine({ recipe, rate: 30 });
  const pl = new ProductionLine(part, 0, 0, false, false);
  pl.assemblyLines = [al];
  pl.rate = al.getPartProductionRate(part);
  return pl;
}

describe("ProductionLine picker visibility (production-line-structure R3)", () => {
  // The "Add Recipe" reveal renders exactly when the picker is hidden
  // (`!showPicker && hasMoreRecipes`), so its presence is the inverse signal of
  // picker visibility. (Counting `.sp-recipe-component` is ambiguous because an
  // assembly line renders its own recipe with that class.)

  it("R3.S1 auto-shows the recipe picker when production is short", () => {
    const pl = new ProductionLine(
      partSlugLookup["iron-ingot"],
      30,
      30,
      false,
      false,
    );
    const { container } = renderLine(pl);
    // No assembly lines → needMoreProduction → recipe options render, and the
    // Add Recipe reveal is suppressed.
    expect(
      container.querySelectorAll(".sp-recipe-component").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Add Recipe")).not.toBeInTheDocument();
  });

  it("hides the picker (shows Add Recipe reveal) when satisfied", () => {
    renderLine(
      satisfiedLine("iron-ingot", recipeSlugLookup["recipe-ingotiron-c"]),
    );
    expect(screen.getByText("Add Recipe")).toBeInTheDocument();
  });

  it("R3.S2 manual Add Recipe opens the picker", () => {
    renderLine(
      satisfiedLine("iron-plate", recipeSlugLookup["recipe-ironplate-c"]),
    );
    expect(screen.getByText("Add Recipe")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Add Recipe"));

    // Picker now open → the reveal is gone.
    expect(screen.queryByText("Add Recipe")).not.toBeInTheDocument();
  });

  it("R3.S3 picker stays open while production remains short", () => {
    renderLine(satisfiedLine("iron-rod", recipeSlugLookup["recipe-ironrod-c"]));

    fireEvent.click(screen.getByText("Add Recipe")); // rescales below target
    // Still short (split reduced the rate below target) → picker stays open,
    // reveal stays hidden.
    expect(screen.queryByText("Add Recipe")).not.toBeInTheDocument();
  });

  it("R3.S4 a rate edit that re-satisfies closes a manually-opened picker", () => {
    const recipe = recipeLookup["rocket-fuel"][0];
    const pl = satisfiedLine("rocket-fuel", recipe);
    renderLine(pl);

    // Manual open: "Add Recipe" rescales the sole line below target → short,
    // picker open (reveal gone).
    fireEvent.click(screen.getByText("Add Recipe"));
    expect(screen.queryByText("Add Recipe")).not.toBeInTheDocument();

    // Edit the production rate down to the (now-reduced) output so the line is
    // satisfied again. The rate handler resets `pickerManuallyOpened`, so the
    // picker must hide — reproducing the old effect that force-closed on a
    // needMoreProduction transition. Without the reset the picker would stay open.
    const target = pl.assemblyLines[0].getPartProductionRate(pl.part);
    const rateInput = screen.getByLabelText("Production Rate");
    fireEvent.change(rateInput, { target: { value: String(target) } });
    fireEvent.blur(rateInput);

    expect(screen.getByText("Add Recipe")).toBeInTheDocument();
  });
});
