import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Icon from "@/app/components/ui/Icon";

describe("Icon", () => {
  it("renders a labeled icon with alt text and a hover tooltip", async () => {
    const user = userEvent.setup();
    render(
      <Icon
        src="/images/items/iron-plate_64.png"
        label="Iron Plate"
        size={24}
      />,
    );
    const img = screen.getByAltText("Iron Plate");
    expect(img).toBeInTheDocument();
    await user.hover(img);
    expect(
      await screen.findByRole("tooltip", { name: "Iron Plate" }),
    ).toBeInTheDocument();
  });

  it("renders an informative icon via alt with no tooltip", async () => {
    const user = userEvent.setup();
    render(
      <Icon src="/images/items/iron-ore_64.png" alt="Iron Ore" size={24} />,
    );
    const img = screen.getByRole("img", { name: "Iron Ore" });
    await user.hover(img);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("renders a decorative icon with empty alt and no tooltip", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Icon src="/images/items/iron-plate_64.png" label="" size={24} />,
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("alt")).toBe("");
    await user.hover(img);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
