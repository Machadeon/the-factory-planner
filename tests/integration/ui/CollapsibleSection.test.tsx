import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import CollapsibleSection from "@/app/components/ui/CollapsibleSection";

describe("CollapsibleSection", () => {
  it("toggles body visibility and swaps the chevron icon", async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSection label="Outputs" defaultExpanded>
        <div>body content</div>
      </CollapsibleSection>,
    );
    const header = screen.getByRole("button", { name: "Outputs" });
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("body content")).toBeInTheDocument();
    expect(
      header.querySelector('[data-testid="ExpandMoreIcon"]'),
    ).not.toBeNull();

    await user.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("body content")).not.toBeInTheDocument();
    expect(
      header.querySelector('[data-testid="ChevronRightIcon"]'),
    ).not.toBeNull();
  });

  it("honors defaultExpanded false", () => {
    render(
      <CollapsibleSection label="Intermediates" defaultExpanded={false}>
        <div>hidden body</div>
      </CollapsibleSection>,
    );
    expect(
      screen.getByRole("button", { name: "Intermediates" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("hidden body")).not.toBeInTheDocument();
  });
});
