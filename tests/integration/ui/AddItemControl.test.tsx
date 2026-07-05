import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import AddItemControl from "@/app/components/ui/AddItemControl";

function setup(closeOnBlur?: boolean) {
  const user = userEvent.setup();
  render(
    <>
      <AddItemControl label="Add constraint" closeOnBlur={closeOnBlur}>
        {(close) => (
          <div>
            <input aria-label="Part filter" />
            <button type="button" onClick={close}>
              pick
            </button>
          </div>
        )}
      </AddItemControl>
      <button type="button">outside</button>
    </>,
  );
  return { user };
}

describe("AddItemControl", () => {
  it("reveals the child on trigger and collapses on completion", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Add constraint" }));
    expect(screen.getByLabelText("Part filter")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "pick" }));
    expect(screen.queryByLabelText("Part filter")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add constraint" }),
    ).toBeInTheDocument();
  });

  it("collapses when focus leaves the wrapper (closeOnBlur default)", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Add constraint" }));
    screen.getByLabelText("Part filter").focus();
    await user.click(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByLabelText("Part filter")).not.toBeInTheDocument();
  });

  it("stays open on blur when closeOnBlur is false", async () => {
    const { user } = setup(false);
    await user.click(screen.getByRole("button", { name: "Add constraint" }));
    screen.getByLabelText("Part filter").focus();
    await user.click(screen.getByRole("button", { name: "outside" }));
    expect(screen.getByLabelText("Part filter")).toBeInTheDocument();
  });

  it("discards partial input and reopens with a fresh child", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Add constraint" }));
    await user.type(screen.getByLabelText("Part filter"), "iro");
    await user.click(screen.getByRole("button", { name: "outside" }));
    await user.click(screen.getByRole("button", { name: "Add constraint" }));
    expect(screen.getByLabelText("Part filter")).toHaveValue("");
  });
});
