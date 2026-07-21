import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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

function renderRow(
  pl: ProductionLine,
  overrides: Partial<{
    isExpanded: boolean;
    onToggleExpand: () => void;
    onRemoveSelf: (e: unknown) => void;
    onToggleAutoCalculateRate: (e: unknown) => void;
    onToggleMaximizeOutput: (e: unknown) => void;
  }> = {},
) {
  const onToggleExpand = overrides.onToggleExpand ?? (() => {});
  return {
    onToggleExpand,
    ...renderWithProviders(
      <ProductionLineRow
        productionLine={pl}
        part={pl.part}
        isExpanded={overrides.isExpanded ?? true}
        productionRateDiff={0}
        outputRateDisplay={pl.outputRate}
        actualProductionRate={0}
        onToggleExpand={onToggleExpand}
        onUpdateOutputRate={() => {}}
        onUpdateProductionRate={() => {}}
        onToggleAutoCalculateRate={
          overrides.onToggleAutoCalculateRate ?? (() => {})
        }
        onToggleMaximizeOutput={overrides.onToggleMaximizeOutput ?? (() => {})}
        onAcceptLine={() => {}}
        onRejectLine={() => {}}
        onRemoveSelf={overrides.onRemoveSelf ?? (() => {})}
      />,
    ),
  };
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

describe("ProductionLineRow toggle click area (R1)", () => {
  it("R1.S1 — clicking the part icon/name toggles expand", () => {
    const pl = new ProductionLine(ironIngotPart, 30, 30, false, false);
    const onToggleExpand = vi.fn();
    renderRow(pl, { onToggleExpand });
    fireEvent.click(screen.getByText(ironIngotPart.name));
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('R1.S2 — clicking the "Actual: rate" text toggles expand', () => {
    const pl = new ProductionLine(ironIngotPart, 30, 30, false, false);
    const onToggleExpand = vi.fn();
    renderRow(pl, { onToggleExpand });
    fireEvent.click(screen.getByText(/Actual:/));
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it("R1.S3 — clicking header whitespace toggles expand", () => {
    const pl = new ProductionLine(ironIngotPart, 30, 30, false, false);
    const onToggleExpand = vi.fn();
    renderRow(pl, { onToggleExpand });
    const toggleControl = screen.getByRole("button", {
      name: `${ironIngotPart.name} production line`,
    });
    fireEvent.click(toggleControl);
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it("R1.S4 — repeated clicks alternate expanded/collapsed/expanded/collapsed", () => {
    const pl = new ProductionLine(ironIngotPart, 30, 30, false, false);
    const states: boolean[] = [];
    let expanded = false;
    const onToggleExpand = vi.fn(() => {
      expanded = !expanded;
      states.push(expanded);
    });
    renderRow(pl, { onToggleExpand });
    const toggleControl = screen.getByRole("button", {
      name: `${ironIngotPart.name} production line`,
    });
    fireEvent.click(toggleControl);
    fireEvent.click(toggleControl);
    fireEvent.click(toggleControl);
    fireEvent.click(toggleControl);
    expect(states).toEqual([true, false, true, false]);
  });

  it("R1.S5 — mousedown/mouseup without a click on rate text does not toggle", () => {
    const pl = new ProductionLine(ironIngotPart, 30, 30, false, false);
    const onToggleExpand = vi.fn();
    renderRow(pl, { onToggleExpand });
    const actualText = screen.getByText(/Actual:/);
    fireEvent.mouseDown(actualText);
    fireEvent.mouseUp(actualText);
    expect(onToggleExpand).not.toHaveBeenCalled();
  });
});

describe("ProductionLineRow interactive controls do not toggle (R2)", () => {
  it("R2.S1 — clicking the Output Rate field does not toggle", () => {
    const pl = new ProductionLine(ironIngotPart, 30, 30, false, false);
    const onToggleExpand = vi.fn();
    renderRow(pl, { onToggleExpand });
    fireEvent.click(screen.getByLabelText("Factory Output Rate"));
    expect(onToggleExpand).not.toHaveBeenCalled();
  });

  it("R2.S2 — clicking Delete does not toggle and fires remove-product", () => {
    const pl = new ProductionLine(ironIngotPart, 30, 30, false, false);
    const onToggleExpand = vi.fn();
    const onRemoveSelf = vi.fn();
    renderRow(pl, { onToggleExpand, onRemoveSelf });
    fireEvent.click(screen.getByLabelText("Remove product"));
    expect(onToggleExpand).not.toHaveBeenCalled();
    expect(onRemoveSelf).toHaveBeenCalledTimes(1);
  });

  it("R2.S3 — clicking Autocalculate/Maximize does not toggle and fires own action", () => {
    const pl = new ProductionLine(ironIngotPart, 30, 30, false, false);
    const onToggleExpand = vi.fn();
    const onToggleAutoCalculateRate = vi.fn();
    const onToggleMaximizeOutput = vi.fn();
    renderRow(pl, {
      onToggleExpand,
      onToggleAutoCalculateRate,
      onToggleMaximizeOutput,
    });
    fireEvent.click(screen.getByLabelText("Autocalculate rate"));
    fireEvent.click(
      screen.getByLabelText("Maximize output (limited by constraints)"),
    );
    expect(onToggleExpand).not.toHaveBeenCalled();
    expect(onToggleAutoCalculateRate).toHaveBeenCalledTimes(1);
    expect(onToggleMaximizeOutput).toHaveBeenCalledTimes(1);
  });
});

describe("ProductionLineRow keyboard operability (R3)", () => {
  it("R3.S1/S2 — Enter and Space toggle when the row has focus", async () => {
    const user = userEvent.setup();
    const pl = new ProductionLine(ironIngotPart, 30, 30, false, false);
    const onToggleExpand = vi.fn();
    renderRow(pl, { onToggleExpand });
    const toggleControl = screen.getByRole("button", {
      name: `${ironIngotPart.name} production line`,
    });
    toggleControl.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onToggleExpand).toHaveBeenCalledTimes(2);
  });

  it("R3.S3/S4 — tabbing into and activating a nested control does not toggle", () => {
    const pl = new ProductionLine(ironIngotPart, 30, 30, false, false);
    const onToggleExpand = vi.fn();
    const onRemoveSelf = vi.fn();
    renderRow(pl, { onToggleExpand, onRemoveSelf });
    const deleteButton = screen.getByLabelText("Remove product");
    deleteButton.focus();
    expect(document.activeElement).toBe(deleteButton);
    fireEvent.keyDown(deleteButton, { key: "Enter", code: "Enter" });
    fireEvent.click(deleteButton);
    expect(onToggleExpand).not.toHaveBeenCalled();
    expect(onRemoveSelf).toHaveBeenCalled();
  });

  it("R3.S5 — aria-expanded reflects state after toggling", () => {
    const pl = new ProductionLine(ironIngotPart, 30, 30, false, false);

    function Wrapper() {
      const [expanded, setExpanded] = useState(false);
      return (
        <ProductionLineRow
          productionLine={pl}
          part={pl.part}
          isExpanded={expanded}
          productionRateDiff={0}
          outputRateDisplay={pl.outputRate}
          actualProductionRate={0}
          onToggleExpand={() => setExpanded((e) => !e)}
          onUpdateOutputRate={() => {}}
          onUpdateProductionRate={() => {}}
          onToggleAutoCalculateRate={() => {}}
          onToggleMaximizeOutput={() => {}}
          onAcceptLine={() => {}}
          onRejectLine={() => {}}
          onRemoveSelf={() => {}}
        />
      );
    }

    renderWithProviders(<Wrapper />);
    const toggleControl = screen.getByRole("button", {
      name: `${ironIngotPart.name} production line`,
    });
    expect(toggleControl).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggleControl);
    expect(toggleControl).toHaveAttribute("aria-expanded", "true");
  });

  it("R3 — toggle element exposes role=button and is keyboard-focusable", () => {
    const pl = new ProductionLine(ironIngotPart, 30, 30, false, false);
    renderRow(pl);
    const toggleControl = screen.getByRole("button", {
      name: `${ironIngotPart.name} production line`,
    });
    expect(toggleControl.tagName).toBe("BUTTON");
    toggleControl.focus();
    expect(document.activeElement).toBe(toggleControl);
  });
});
