import { screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import ProductionLineRow from "@/app/components/planning/ProductionLineRow";
import { partSlugLookup } from "@/app/models/game-data";
import type Part from "@/app/models/part";
import ProductionLine from "@/app/models/production-line";
import { renderWithProviders } from "../helpers/render-with-providers";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...rest }: { src: string; alt: string }) => (
    // biome-ignore lint/performance/noImgElement: test mock
    <img src={src} alt={alt} {...(rest as object)} />
  ),
}));

let ironIngotPart: Part;

beforeAll(() => {
  ironIngotPart = partSlugLookup["iron-ingot"];
});

function renderRow(pl: ProductionLine) {
  return renderWithProviders(
    <ProductionLineRow
      productionLine={pl}
      part={pl.part}
      isExpanded={true}
      productionRateDiff={0}
      outputRateDisplay={pl.outputRate}
      actualProductionRate={0}
      onToggleExpand={() => {}}
      onUpdateOutputRate={() => {}}
      onUpdateProductionRate={() => {}}
      onToggleAutoCalculateRate={() => {}}
      onToggleMaximizeOutput={() => {}}
      onAcceptLine={() => {}}
      onRejectLine={() => {}}
      onRemoveSelf={() => {}}
    />,
  );
}

describe("ProductionLineRow header (R1)", () => {
  it("renders the part name and stable control handles", () => {
    const pl = new ProductionLine(ironIngotPart, 30, 30, false, false);
    renderRow(pl);
    expect(screen.getByText(ironIngotPart.name)).toBeInTheDocument();
    expect(screen.getByLabelText("Remove product")).toBeInTheDocument();
    expect(screen.getByLabelText("Autocalculate rate")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Maximize output (limited by constraints)"),
    ).toBeInTheDocument();
  });

  it("shows the Override handle when the rate is auto-calculated", () => {
    const pl = new ProductionLine(ironIngotPart, 30, 30, true, false);
    renderRow(pl);
    expect(screen.getByLabelText("Override rate")).toBeInTheDocument();
  });
});
