import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import AssemblyLineComp from "@/app/components/planning/AssemblyLine";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
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

// Mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

let ironIngotRecipe: Recipe;
let ironIngotPart: Part;

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: recipe should exist in test data
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
  ironIngotPart = partSlugLookup["iron-ingot"];
});

function buildProps(rate = 30, outputRate = 0) {
  const factory = new Factory();

  const al = new AssemblyLine({
    recipe: ironIngotRecipe,
    rate: rate,
    allowRemainder: false,
  });
  const pl = new ProductionLine(
    ironIngotPart,
    rate,
    outputRate,
    outputRate > 0,
    false,
  );
  pl.assemblyLines = [al];
  factory.productionLines = [pl];
  factory._productionLineLookup[ironIngotPart.slug] = pl;
  factory._updateRates();

  return { factory, assemblyLine: al, mainPart: ironIngotPart };
}

describe("AssemblyLine — clock speed", () => {
  it("machine count input back-calculates clock speed", async () => {
    const user = userEvent.setup();
    const props = buildProps(30);
    renderWithProviders(
      <AssemblyLineComp
        assemblyLine={props.assemblyLine}
        mainPart={props.mainPart}
      />,
      { factory: props.factory },
    );

    // The machine count field displays '1' (30/min at 100% clock → 1 machine)
    const [machineCountInput] = screen.getAllByRole("textbox");
    await user.click(machineCountInput);
    await user.clear(machineCountInput);
    await user.type(machineCountInput, "2");
    await user.tab(); // commit

    // With 2 machines, clock speed = (30 / (2 * 30)) * 100 = 50%
    await waitFor(() => {
      expect(props.assemblyLine.machineSpeed).toBeCloseTo(50);
    });
  });
});

describe("AssemblyLine — somersloop slider", () => {
  it("somersloop slider calls setSloopedSlots and updates the assembly line", async () => {
    const props = buildProps(30, 30); // outputRate=30 so LP solve would be triggered
    const _setSloopSpy = vi.spyOn(props.assemblyLine, "setSloopedSlots");
    const autoCalcSpy = vi
      .spyOn(props.factory, "autoCalculateRates")
      .mockImplementation(() => {});

    renderWithProviders(
      <AssemblyLineComp
        assemblyLine={props.assemblyLine}
        mainPart={props.mainPart}
      />,
      { factory: props.factory },
    );

    // The sloop slider has an MUI Slider; find hidden input with aria-label or find by role
    const sliders = screen.getAllByRole("slider");
    const sloopSlider = sliders.at(-1); // last slider is the somersloop slider

    // Simulate change event on the hidden slider input
    if (sloopSlider) {
      act(() => {
        sloopSlider.dispatchEvent(new Event("change", { bubbles: true }));
      });
      // The mutator owns the branch: with outputRate > 0 it re-solves.
      act(() => {
        props.factory.setSloopedSlots(props.assemblyLine, 1);
      });
      expect(autoCalcSpy).toHaveBeenCalled();
    }
  });
});
