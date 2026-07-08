import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  LibraryProvider,
  useLibraryContext,
} from "@/app/contexts/LibraryContext";
import {
  NavigationProvider,
  useNavigation,
} from "@/app/contexts/NavigationContext";
import type { StorageLibrary } from "@/app/models/factory-storage";

function emptyLibrary(): StorageLibrary {
  return { schemaVersion: 2, folders: [], factories: [] };
}

function LibProbe() {
  const { library, currentFactoryId } = useLibraryContext();
  return (
    <div>
      <span data-testid="factories">{library.factories.length}</span>
      <span data-testid="current">{String(currentFactoryId)}</span>
    </div>
  );
}

describe("LibraryContext (R2.S1, R2.S2)", () => {
  it("consumers read library + currentFactoryId from context", () => {
    render(
      <LibraryProvider
        library={emptyLibrary()}
        currentFactoryId={"abc"}
        updatePartPointOverrides={vi.fn()}
      >
        <LibProbe />
      </LibraryProvider>,
    );
    expect(screen.getByTestId("factories").textContent).toBe("0");
    expect(screen.getByTestId("current").textContent).toBe("abc");
  });

  it("null currentFactoryId flows through unchanged", () => {
    render(
      <LibraryProvider
        library={emptyLibrary()}
        currentFactoryId={null}
        updatePartPointOverrides={vi.fn()}
      >
        <LibProbe />
      </LibraryProvider>,
    );
    expect(screen.getByTestId("current").textContent).toBe("null");
  });
});

function NavProbe() {
  const { navigateToFactory } = useNavigation();
  return (
    <button type="button" onClick={() => navigateToFactory("target-id")}>
      go
    </button>
  );
}

describe("NavigationContext (R3.S1, R3.S3)", () => {
  it("consumer invokes navigateToFactory from context", async () => {
    const user = userEvent.setup();
    const nav = vi.fn();
    render(
      <NavigationProvider navigateToFactory={nav}>
        <NavProbe />
      </NavigationProvider>,
    );
    await user.click(screen.getByRole("button", { name: "go" }));
    expect(nav).toHaveBeenCalledWith("target-id");
  });
});
