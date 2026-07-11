import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FactoryPickerDialog from "@/app/components/FactoryPickerDialog";
import Factory from "@/app/models/factory";
import { emptyLibrary } from "@/app/models/factory-storage";
import { renderWithProviders } from "../helpers/render-with-providers";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...rest }: { src: string; alt: string }) => (
    // biome-ignore lint/performance/noImgElement: test mock
    <img src={src} alt={alt} {...(rest as object)} />
  ),
}));

describe("FactoryPickerDialog mode (R4.S1)", () => {
  it('mode="recipe" titles "Use Factory as Recipe"', () => {
    renderWithProviders(
      <FactoryPickerDialog
        open
        mode="recipe"
        targetPartSlug="iron-plate"
        onPick={() => {}}
        onClose={() => {}}
      />,
      { factory: new Factory(), library: emptyLibrary() },
    );
    expect(screen.getByText("Use Factory as Recipe")).toBeInTheDocument();
    expect(screen.queryByText("Supply from Factory")).not.toBeInTheDocument();
  });

  it('mode="supplier" titles "Supply from Factory"', () => {
    renderWithProviders(
      <FactoryPickerDialog
        open
        mode="supplier"
        targetPartSlug="iron-plate"
        onPick={() => {}}
        onClose={() => {}}
      />,
      { factory: new Factory(), library: emptyLibrary() },
    );
    expect(screen.getByText("Supply from Factory")).toBeInTheDocument();
    expect(screen.queryByText("Use Factory as Recipe")).not.toBeInTheDocument();
  });
});
