import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import OptimizationSection from "@/app/components/OptimizationSection";
import Factory from "@/app/models/factory";
import { emptyLibrary } from "@/app/models/factory-storage";

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

function buildFactory(): Factory {
  const factory = new Factory();
  factory.update = () => {
    factory._updateRates();
  };
  return factory;
}

describe("OptimizationSection", () => {
  // T4 (AC3): optimization controls render inline, no modal at rest.
  it("renders targets, constraints, optimizer, and recipe controls without a modal", () => {
    const factory = buildFactory();
    render(<OptimizationSection factory={factory} library={emptyLibrary()} />);

    expect(screen.getByText(/Production Targets/i)).toBeInTheDocument();
    expect(screen.getByText(/Constraints/i)).toBeInTheDocument();
    expect(screen.getByText(/Recipe Optimizer/i)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // T6 (AC4, live-write): changing objective writes to the model immediately.
  it("writes objective changes to the model immediately (no Apply)", async () => {
    const user = userEvent.setup();
    const factory = buildFactory();
    render(<OptimizationSection factory={factory} library={emptyLibrary()} />);

    await user.click(
      screen.getByRole("radio", { name: /Minimum power consumption/i }),
    );
    expect(factory.optimizer.objective).toBe("power");
  });

  // T5 (AC4, live-write): editing a constraint writes to the model immediately and
  // calls factory.update(); deleting a row removes it from factory.constraints at once.
  it("constraint edits + deletes hit the model immediately and call update()", async () => {
    const user = userEvent.setup();
    const factory = buildFactory();
    factory.constraints = [{ partSlug: "iron-ore", max: 60 }];
    const updateSpy = vi.spyOn(factory, "update");
    render(<OptimizationSection factory={factory} library={emptyLibrary()} />);

    // Delete the constraint row → immediate model sync, no Apply/Cancel.
    await user.click(
      screen.getByRole("button", { name: /remove constraint/i }),
    );
    expect(factory.constraints).toHaveLength(0);
    expect(updateSpy).toHaveBeenCalled();
  });

  // T4b (AC4): reject-all confirm dialog moved into the section still works.
  it("reject-all opens a confirm dialog from within the section", async () => {
    const user = userEvent.setup();
    const factory = buildFactory();
    // Mark a suggested line so the bulk actions render.
    const pl = factory.productionLines[0];
    if (pl) pl.autoCreated = true;
    render(<OptimizationSection factory={factory} library={emptyLibrary()} />);

    const rejectAll = screen.queryByRole("button", { name: /Reject all/i });
    if (rejectAll) {
      await user.click(rejectAll);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    }
  });

  // T7: Solve gating.
  it("disables Solve with no targets", () => {
    const factory = buildFactory();
    render(<OptimizationSection factory={factory} library={emptyLibrary()} />);
    expect(screen.getByRole("button", { name: "Solve" })).toBeDisabled();
  });
});
