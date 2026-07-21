import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FactoryPage from "@/app/components/factory/FactoryPage";
import { ToastProvider } from "@/app/components/ui/toast/ToastProvider";

// Mock next/image (same as FactoryPageCore.test.tsx)
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
  localStorageMock.setItem("sfp:consent", "true");
  // Reset jsdom URL between tests (pushState mutates it persistently).
  window.history.replaceState({}, "", "/");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("FactoryPage history base path", () => {
  it("keeps the URL under the base path on mount when NEXT_PUBLIC_BASE_PATH is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/the-factory-planner");
    render(
      <ToastProvider>
        <FactoryPage />
      </ToastProvider>,
    );
    await waitFor(() => {
      expect(window.location.pathname).toBe("/the-factory-planner/");
    });
    expect(window.location.pathname).not.toBe("/");
  });

  it("pushes a root-relative URL on mount when NEXT_PUBLIC_BASE_PATH is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", undefined);
    render(
      <ToastProvider>
        <FactoryPage />
      </ToastProvider>,
    );
    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
    });
  });
});
