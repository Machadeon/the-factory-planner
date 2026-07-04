import DeleteIcon from "@mui/icons-material/Delete";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import IconButton from "@/app/components/ui/IconButton";

describe("IconButton", () => {
  it("renders a real button with the required aria-label", () => {
    render(
      <IconButton aria-label="Delete factory" onClick={() => {}}>
        <DeleteIcon fontSize="small" />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Delete factory" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
  });

  it("shows a tooltip defaulting to the aria-label on hover", async () => {
    const user = userEvent.setup();
    render(
      <IconButton aria-label="Delete factory" onClick={() => {}}>
        <DeleteIcon fontSize="small" />
      </IconButton>,
    );
    await user.hover(screen.getByRole("button", { name: "Delete factory" }));
    expect(
      await screen.findByRole("tooltip", { name: "Delete factory" }),
    ).toBeInTheDocument();
  });

  it("activates on Enter and Space", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Delete factory" onClick={onClick}>
        <DeleteIcon fontSize="small" />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Delete factory" });
    button.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("applies danger and warning variant classes", () => {
    const { rerender } = render(
      <IconButton aria-label="Delete" onClick={() => {}} variant="danger">
        <DeleteIcon fontSize="small" />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Delete" }).className).toContain(
      "border-[rgba(255,0,0,0.75)]",
    );
    rerender(
      <IconButton aria-label="Delete" onClick={() => {}} variant="warning">
        <DeleteIcon fontSize="small" />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Delete" }).className).toContain(
      "border-[rgba(255,128,0,0.75)]",
    );
  });
});
