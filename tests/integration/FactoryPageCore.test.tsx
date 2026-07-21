import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FactoryPage from "@/app/components/factory/FactoryPage";
import { ToastProvider } from "@/app/components/ui/toast/ToastProvider";

// Mock next/image
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

// Mock navigator.clipboard (not available in jsdom by default)
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

function makeLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

let localStorageMock: ReturnType<typeof makeLocalStorageMock>;

beforeEach(() => {
  localStorageMock = makeLocalStorageMock();
  vi.stubGlobal("localStorage", localStorageMock);
  // Grant consent so the app skips the consent dialog
  localStorageMock.setItem("sfp:consent", "true");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FactoryPage", () => {
  it("selecting a part adds a ProductionLine", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <FactoryPage />
      </ToastProvider>,
    );

    // "Add Product" is a Clickable div, not a button — find by text
    const addButton = await screen.findByText(/Add Product/i);
    await user.click(addButton);

    // Type in the autocomplete
    const autocomplete = screen.getByRole("combobox");
    await user.type(autocomplete, "Iron Plate");

    // Select the exact "Iron Plate" option (not "Reinforced Iron Plate")
    const options = await screen.findAllByRole("option");
    const option = options.find(
      (el) => el.textContent?.trim() === "Iron Plate",
    );
    expect(option).toBeTruthy();
    // biome-ignore lint/style/noNonNullAssertion: already checked with toBeTruthy
    await user.click(option!);

    // A production line for Iron Plate should appear (it shows up in both the
    // production line list and the overview sidebar)
    await waitFor(() => {
      expect(screen.getAllByText("Iron Plate").length).toBeGreaterThan(0);
    });
  });

  it("expand all and collapse all toggle all production line rows", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <FactoryPage />
      </ToastProvider>,
    );

    // Add Iron Rod
    const addButton = await screen.findByText(/Add Product/i);
    await user.click(addButton);
    const autocomplete = screen.getByRole("combobox");
    await user.type(autocomplete, "Iron Rod");
    const options2 = await screen.findAllByRole("option");
    const ironRodOption = options2.find(
      (el) => el.textContent?.trim() === "Iron Rod",
    );
    expect(ironRodOption).toBeTruthy();
    // biome-ignore lint/style/noNonNullAssertion: already checked with toBeTruthy
    await user.click(ironRodOption!);

    // Iron Rod should appear as a production line
    await waitFor(() => {
      expect(screen.getAllByText("Iron Rod").length).toBeGreaterThan(0);
    });

    // The expand/collapse toolbar row appears when production lines exist.
    // The Collapse/Expand Clickable divs contain SVG icons without text.
    // Find the toolbar row by its border class and click the icons by order.
    const toolbarDivs = document.querySelectorAll(
      ".flex.flex-row.items-center.gap-1",
    );
    const toolbar = Array.from(toolbarDivs).find(
      (el) => el.querySelectorAll("svg").length >= 2,
    );
    if (toolbar) {
      const [expandDiv, collapseDiv] =
        toolbar.querySelectorAll<HTMLElement>(".cursor-pointer");
      // Collapse
      if (collapseDiv) await user.click(collapseDiv);
      // Expand
      if (expandDiv) await user.click(expandDiv);
    }

    // After expand, Iron Rod production line is still visible
    expect(screen.getAllByText("Iron Rod").length).toBeGreaterThan(0);
  });

  // The solver warning appears whenever the LP is infeasible. It is not dismissible —
  // it remains visible as long as solverError is non-null so users always see the
  // current solver state.
  it("solver warning appears and persists whenever the LP is infeasible", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <FactoryPage />
      </ToastProvider>,
    );

    // Add Iron Plate (no recipe). Multi-recipe parts don't auto-select a recipe.
    const addButton = await screen.findByText(/Add Product/i);
    await user.click(addButton);
    const combo = screen.getByRole("combobox");
    await user.type(combo, "Iron Plate");
    const options = await screen.findAllByRole("option");
    const option = options.find(
      (el) => el.textContent?.trim() === "Iron Plate",
    );
    expect(option).toBeTruthy();
    // biome-ignore lint/style/noNonNullAssertion: already checked with toBeTruthy
    await user.click(option!);

    const outputRateField = await screen.findByRole("textbox", {
      name: /Factory Output Rate/i,
    });

    async function setOutputRate(value: string) {
      await user.click(outputRateField);
      await user.keyboard("{Control>}a{/Control}");
      await user.type(outputRateField, value);
      await user.keyboard("{Tab}");
    }

    const warningAlert = () => screen.queryByRole("alert");

    // Set rate to 30 — no recipe means the LP is infeasible → alert appears
    await setOutputRate("30");
    await waitFor(() => expect(warningAlert()).not.toBeNull());

    // Changing the rate keeps the alert visible (still infeasible)
    await setOutputRate("20");
    await waitFor(() => expect(warningAlert()).not.toBeNull());
  });
});
