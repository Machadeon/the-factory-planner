import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FactorySidebar from "@/app/components/factory/FactorySidebar";
import { installLocalStorageMock } from "../helpers/local-storage-mock";
import { renderWithProviders } from "../helpers/render-with-providers";

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

beforeEach(() => {
  installLocalStorageMock();
});

describe("FactorySidebar splitter", () => {
  it("exposes role=separator with vertical orientation and current width as aria-valuenow", () => {
    renderWithProviders(<FactorySidebar />);
    const splitter = screen.getByRole("separator");
    expect(splitter).toHaveAttribute("aria-orientation", "vertical");
    expect(splitter).toHaveAttribute("aria-valuenow", "380");
    expect(splitter).toHaveAttribute("aria-valuemin", "200");
    expect(splitter).toHaveAttribute("aria-valuemax", "700");
  });

  it("ArrowLeft/ArrowRight on the focused splitter changes aria-valuenow and clamps at the bounds", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FactorySidebar />);
    const splitter = screen.getByRole("separator");
    splitter.focus();

    // Sidebar is anchored on the right; ArrowLeft widens it (increases width).
    await user.keyboard("{ArrowLeft}");
    expect(splitter).toHaveAttribute("aria-valuenow", "390");
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{ArrowRight}");
    expect(splitter).toHaveAttribute("aria-valuenow", "370");

    // Clamp at MIN_WIDTH (200) after many decrements past the bound.
    for (let i = 0; i < 40; i++) {
      await user.keyboard("{ArrowRight}");
    }
    expect(splitter).toHaveAttribute("aria-valuenow", "200");
  });
});
