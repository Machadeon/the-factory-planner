import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import InlineEditText from "@/app/components/ui/InlineEditText";

function setup(value = "Old name") {
  const onCommit = vi.fn();
  const onCancel = vi.fn();
  const user = userEvent.setup();
  render(
    <>
      <InlineEditText
        value={value}
        onCommit={onCommit}
        onCancel={onCancel}
        aria-label="Rename"
      />
      <button type="button">outside</button>
    </>,
  );
  return { onCommit, onCancel, user, input: screen.getByRole("textbox") };
}

describe("InlineEditText", () => {
  it("commits the trimmed value on Enter", async () => {
    const { onCommit, user, input } = setup();
    await user.clear(input);
    await user.type(input, "  New name  {Enter}");
    expect(onCommit).toHaveBeenCalledWith("New name");
  });

  it("commits on Enter even when the value is unchanged", async () => {
    const { onCommit, user, input } = setup("Same");
    input.focus();
    await user.keyboard("{Enter}");
    expect(onCommit).toHaveBeenCalledWith("Same");
  });

  it("cancels on Escape without committing", async () => {
    const { onCommit, onCancel, user, input } = setup();
    await user.clear(input);
    await user.type(input, "Changed{Escape}");
    expect(onCancel).toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("commits on blur", async () => {
    const { onCommit, user, input } = setup();
    await user.clear(input);
    await user.type(input, "Blurred");
    await user.click(screen.getByRole("button", { name: "outside" }));
    expect(onCommit).toHaveBeenCalledWith("Blurred");
  });

  it("does not commit on the blur that follows Escape", async () => {
    const { onCommit, onCancel, user, input } = setup();
    await user.type(input, "x{Escape}");
    await user.click(screen.getByRole("button", { name: "outside" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("cancels instead of committing an empty value", async () => {
    const { onCommit, onCancel, user, input } = setup();
    await user.clear(input);
    await user.type(input, "   {Enter}");
    expect(onCancel).toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });
});
