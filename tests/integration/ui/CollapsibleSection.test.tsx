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
    const body = screen.getByText("body content").parentElement as HTMLElement;
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(body.style.contentVisibility).toBe("visible");
    expect(
      header.querySelector('[data-testid="ExpandMoreIcon"]'),
    ).not.toBeNull();

    await user.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
    // Body stays mounted; content-visibility hides it (matches overview behavior)
    expect(body.style.contentVisibility).toBe("hidden");
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
    const body = screen.getByText("hidden body").parentElement as HTMLElement;
    expect(body.style.contentVisibility).toBe("hidden");
  });
});
