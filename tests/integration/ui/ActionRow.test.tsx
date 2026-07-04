import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ActionRow from "@/app/components/ui/ActionRow";

describe("ActionRow", () => {
  it("exposes role button with accessible name from content", () => {
    render(<ActionRow onClick={() => {}}>Iron Plate</ActionRow>);
    const row = screen.getByRole("button", { name: "Iron Plate" });
    expect(row.tagName).toBe("BUTTON");
    expect(row).toHaveAttribute("type", "button");
  });

  it("is reachable by Tab and activates on Enter and Space", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ActionRow onClick={onClick}>Iron Plate</ActionRow>);
    await user.tab();
    expect(screen.getByRole("button", { name: "Iron Plate" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
