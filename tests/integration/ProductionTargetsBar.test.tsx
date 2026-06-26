import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ProductionTargetsBar from "@/app/components/ProductionTargetsBar";
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

describe("ProductionTargetsBar", () => {
  it("adds a power target with a fixed rate and stores it on the model", async () => {
    const user = userEvent.setup();
    const factory = buildFactory();
    factory.optimizer.targets = [{ partSlug: "power" }];

    render(<ProductionTargetsBar factory={factory} library={emptyLibrary()} />);

    // Unit label for power is MW
    expect(screen.getByText("MW")).toBeInTheDocument();

    const rateField = screen.getByLabelText("Target rate");
    await user.type(rateField, "100000");
    await user.tab();

    expect(factory.optimizer.targets).toEqual([
      { partSlug: "power", rate: 100000, maximize: false },
    ]);
  });

  it("Solve runs the solver", async () => {
    const user = userEvent.setup();
    const factory = buildFactory();
    factory.optimizer.targets = [{ partSlug: "power", rate: 100000 }];
    const solveSpy = vi.spyOn(factory, "autoCalculateRates");

    render(<ProductionTargetsBar factory={factory} library={emptyLibrary()} />);

    await user.click(screen.getByRole("button", { name: "Solve" }));
    expect(solveSpy).toHaveBeenCalled();
  });

  it("disables Solve when there are no targets", () => {
    const factory = buildFactory();
    render(<ProductionTargetsBar factory={factory} library={emptyLibrary()} />);
    expect(screen.getByRole("button", { name: "Solve" })).toBeDisabled();
  });
});
