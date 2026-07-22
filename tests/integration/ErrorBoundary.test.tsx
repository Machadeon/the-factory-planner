import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "@/app/components/ui/ErrorBoundary";
import * as download from "@/app/lib/download";
import { installLocalStorageMock } from "../helpers/local-storage-mock";

function Boom(): never {
  throw new Error("kaboom");
}

beforeEach(() => {
  installLocalStorageMock();
});

describe("ErrorBoundary", () => {
  it("catches a thrown render error and renders the fallback instead of crashing", () => {
    // Silence React's expected error-boundary console noise for this test.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('"Export your data" downloads a JSON built from the raw stored library', async () => {
    localStorage.setItem(
      "sfp:library",
      JSON.stringify({ schemaVersion: 1, folders: [], factories: [] }),
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const downloadSpy = vi
      .spyOn(download, "downloadJson")
      .mockImplementation(() => {});
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    await user.click(screen.getByRole("button", { name: "Export your data" }));
    expect(downloadSpy).toHaveBeenCalledTimes(1);
    expect(downloadSpy.mock.calls[0][0]).toMatchObject({ schemaVersion: 1 });
    spy.mockRestore();
    downloadSpy.mockRestore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('"Try again" resets the boundary and re-renders children', async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    let shouldThrow = true;
    function MaybeBoom() {
      if (shouldThrow) throw new Error("kaboom");
      return <div>recovered</div>;
    }
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <MaybeBoom />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("recovered")).toBeInTheDocument();
    spy.mockRestore();
  });
});
