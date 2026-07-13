import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TextCalculatorField from "@/app/components/ui/TextCalculatorField";

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

describe("TextCalculatorField", () => {
  it("evaluates an expression on blur and calls onCalculate", async () => {
    const user = userEvent.setup();
    const onCalculate = vi.fn();
    render(
      <TextCalculatorField
        variant="outlined"
        value={0}
        onCalculate={onCalculate}
      />,
    );

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.clear(input);
    await user.type(input, "60*3+30");
    await user.tab(); // blur

    expect(onCalculate).toHaveBeenCalledWith(210);
    expect(onCalculate).toHaveBeenCalledTimes(1);
  });

  it("shows error state on Enter and does not fire onCalculate for invalid input", async () => {
    const user = userEvent.setup();
    const onCalculate = vi.fn();
    render(
      <TextCalculatorField
        variant="outlined"
        value={0}
        onCalculate={onCalculate}
      />,
    );

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.clear(input);
    await user.type(input, "not a number!!");
    // Use Enter (not blur/tab) so the useEffect doesn't reset the error state
    await user.keyboard("{Enter}");

    expect(onCalculate).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("resets to the original value and calls onCalculate on Escape", async () => {
    const user = userEvent.setup();
    const onCalculate = vi.fn();
    render(
      <TextCalculatorField
        variant="outlined"
        value={42}
        onCalculate={onCalculate}
      />,
    );

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.clear(input);
    await user.type(input, "999");
    await user.keyboard("{Escape}");

    expect(onCalculate).toHaveBeenCalledWith(42);
  });

  it("evaluates on Enter without removing focus", async () => {
    const user = userEvent.setup();
    const onCalculate = vi.fn();
    render(
      <TextCalculatorField
        variant="outlined"
        value={0}
        onCalculate={onCalculate}
      />,
    );

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.clear(input);
    await user.type(input, "60*2");
    await user.keyboard("{Enter}");

    expect(onCalculate).toHaveBeenCalledWith(120);
    // Input is still focused after Enter (no blur)
    expect(document.activeElement).toBe(input);
  });

  it("syncs display value when the external value prop changes while unfocused", async () => {
    const _user = userEvent.setup();
    const { rerender } = render(
      <TextCalculatorField variant="outlined" value={10} />,
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("10");

    rerender(<TextCalculatorField variant="outlined" value={99} />);
    expect(input).toHaveValue("99");
  });

  it("does not sync external value while the field is focused", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <TextCalculatorField variant="outlined" value={10} />,
    );
    const input = screen.getByRole("textbox");
    await user.click(input); // focus
    await user.clear(input);
    await user.type(input, "50");

    // External value changes while focused — should NOT overwrite user input
    rerender(<TextCalculatorField variant="outlined" value={99} />);
    expect(input).toHaveValue("50");
  });
});
