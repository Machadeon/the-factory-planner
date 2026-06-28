import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LogisticsSection from "@/app/components/LogisticsSection";
import Factory from "@/app/models/factory";

// T8 (AC7): placeholder renders, no controls.
describe("LogisticsSection", () => {
  it("renders a placeholder and no interactive controls", () => {
    const factory = new Factory();
    factory.update = () => {};
    render(<LogisticsSection factory={factory} />);

    expect(screen.getByText("Logistics")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
