import { act, renderHook, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { subscribe } from "valtio/vanilla";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/app/components/ui/toast/ToastProvider";
import useFactorySession from "@/app/hooks/useFactorySession";
import {
  CURRENT_SCHEMA_VERSION,
  emptyLibrary,
  type SerializedFactory,
  type StorageLibrary,
} from "@/app/models/factory-storage";
import { partSlugLookup } from "@/app/models/game-data";
import { installLocalStorageMock } from "../../helpers/local-storage-mock";

const NOW = "2026-01-01T00:00:00.000Z";

function sf(overrides: Partial<SerializedFactory> = {}): SerializedFactory {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: "f-1",
    slug: "test-factory",
    name: "Test Factory",
    folderId: null,
    autoAddProductLines: false,
    productionLines: [
      {
        partSlug: "iron-ingot",
        rate: 30,
        outputRate: 30,
        autoCalculateRate: false,
        autoCreated: false,
        assemblyLines: [],
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function libWith(...factories: SerializedFactory[]): StorageLibrary {
  const lib = emptyLibrary();
  lib.factories.push(...factories);
  return lib;
}

function toastWrapper({ children }: { children: ReactNode }) {
  return createElement(ToastProvider, null, children);
}

function mount(lib: StorageLibrary = emptyLibrary()) {
  const setLibrary = vi.fn();
  const view = renderHook(
    () => useFactorySession({ library: lib, setLibrary }),
    { wrapper: toastWrapper },
  );
  return { ...view, setLibrary };
}

async function settle() {
  // let valtio's batched notification + the muting microtask run
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

let localStorageMock: ReturnType<typeof installLocalStorageMock>;

beforeEach(() => {
  localStorageMock = installLocalStorageMock();
  localStorage.setItem("sfp:consent", "true");
});

describe("useFactorySession", () => {
  it("R1.S1 — factory is proxied; mutations and swaps observable via container subscribe", async () => {
    const { result } = mount();
    let fired = 0;
    const unsub = subscribe(result.current.store, () => {
      fired += 1;
    });
    act(() => {
      result.current.factory.addProductionLine(
        partSlugLookup["iron-ingot"],
        false,
        false,
      );
    });
    await settle();
    expect(fired).toBeGreaterThan(0);
    unsub();
  });

  it("R4.S1 — fresh session defaults", () => {
    const { result } = mount();
    expect(result.current.factoryName).not.toBe("");
    expect(result.current.currentFactoryId).toBeNull();
    expect(result.current.currentSlug).toBeNull();
    expect(result.current.currentFolderId).toBeNull();
    expect(result.current.isDirty).toBe(false);
  });

  it("R4.S2 — first render has a deterministic empty name (SSR-safe); random name arrives via effect", () => {
    // Regression: generating the random name during render made the SSR HTML
    // carry a different name than the client's first render — a hydration
    // mismatch that let text typed during the hydration window get merged
    // with a stale name (CI-only e2e corruption). The first render must be
    // deterministic; the random name may only be assigned in an effect.
    const renderNames: string[] = [];
    const setLibrary = vi.fn();
    renderHook(
      () => {
        const session = useFactorySession({
          library: emptyLibrary(),
          setLibrary,
        });
        renderNames.push(session.factoryName);
        return session;
      },
      { wrapper: toastWrapper },
    );
    expect(renderNames[0]).toBe("");
    expect(renderNames[renderNames.length - 1]).not.toBe("");
  });

  it("R5.S1 — loadSerialized success sets identity, clean, persists id", async () => {
    const entry = sf();
    const lib = libWith(entry);
    const { result } = mount(lib);
    act(() => {
      expect(result.current.loadSerialized(entry, lib)).toBe(true);
    });
    await settle();
    expect(result.current.factoryName).toBe("Test Factory");
    expect(result.current.currentFactoryId).toBe("f-1");
    expect(result.current.currentSlug).toBe("test-factory");
    expect(result.current.createdAt).toBe(NOW);
    expect(result.current.isDirty).toBe(false);
    expect(localStorage.getItem("sfp:current")).toBe("f-1");
    expect(result.current.factory.productionLines.length).toBe(1);
  });

  it("R5.S2 — slug backfill generates, persists, and sets a unique slug", async () => {
    const entry = sf({ slug: undefined });
    const lib = libWith(entry);
    const { result, setLibrary } = mount(lib);
    act(() => {
      result.current.loadSerialized(entry, lib);
    });
    await settle();
    expect(result.current.currentSlug).toBeTruthy();
    expect(setLibrary).toHaveBeenCalled();
    const persisted = JSON.parse(localStorage.getItem("sfp:library") ?? "{}");
    expect(persisted.factories?.[0]?.slug).toBe(result.current.currentSlug);
  });

  it("R5.S3 — autosave-restore opts: dirty, no backfill, no id persist", async () => {
    const entry = sf({ slug: undefined });
    const lib = libWith(entry);
    const { result, setLibrary } = mount(lib);
    act(() => {
      result.current.loadSerialized(entry, lib, {
        markDirty: true,
        backfillSlug: false,
        persistCurrentId: false,
      });
    });
    await settle();
    expect(result.current.isDirty).toBe(true);
    expect(result.current.currentSlug).toBeNull();
    expect(setLibrary).not.toHaveBeenCalled();
    expect(localStorage.getItem("sfp:current")).toBeNull();
  });

  it("R5.S4 — failed deserialization leaves session unchanged", async () => {
    const bad = sf({
      id: "f-bad",
      productionLines: [
        {
          partSlug: "no-such-part",
          rate: 1,
          outputRate: 1,
          autoCalculateRate: false,
          autoCreated: false,
          assemblyLines: [],
        },
      ],
    });
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const { result } = mount(libWith(bad));
    const nameBefore = result.current.factoryName;
    act(() => {
      expect(result.current.loadSerialized(bad, libWith(bad))).toBe(false);
    });
    await settle();
    expect(result.current.factoryName).toBe(nameBefore);
    expect(result.current.currentFactoryId).toBeNull();
    // Surfaced as an error toast, not a blocking alert().
    expect(alertSpy).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "Could not restore factory — some recipe or part data may be missing.",
      ),
    ).toBeInTheDocument();
    alertSpy.mockRestore();
  });

  it("R6.S1 — model edit marks dirty via subscription", async () => {
    const { result } = mount();
    act(() => {
      result.current.factory.addProductionLine(
        partSlugLookup["iron-ingot"],
        false,
        false,
      );
    });
    await settle();
    expect(result.current.isDirty).toBe(true);
  });

  it("R6.S2 — doSave clears dirty and persists to library", async () => {
    const { result } = mount();
    act(() => {
      result.current.factory.addProductionLine(
        partSlugLookup["iron-ingot"],
        false,
        false,
      );
    });
    await settle();
    let firstSave = false;
    act(() => {
      firstSave = result.current.doSave().firstSave;
    });
    expect(firstSave).toBe(true);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.currentFactoryId).toBeTruthy();
    expect(result.current.currentSlug).toBeTruthy();
    const persisted = JSON.parse(localStorage.getItem("sfp:library") ?? "{}");
    expect(persisted.factories?.length).toBe(1);
  });

  it("R6.S4 — doSave leaves isDirty true when the underlying save fails (D-C3.2)", async () => {
    const { result } = mount();
    act(() => {
      result.current.factory.addProductionLine(
        partSlugLookup["iron-ingot"],
        false,
        false,
      );
    });
    await settle();
    const spy = vi
      .spyOn(localStorageMock, "setItem")
      .mockImplementation((key: string) => {
        if (key === "sfp:library") {
          throw new DOMException("quota exceeded", "QuotaExceededError");
        }
      });
    try {
      act(() => {
        result.current.doSave();
      });
      expect(result.current.isDirty).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  it("R6.S3 — restore-time writes don't dirty; next edit does", async () => {
    const entry = sf();
    const lib = libWith(entry);
    const { result } = mount(lib);
    act(() => {
      result.current.loadSerialized(entry, lib);
    });
    await settle();
    expect(result.current.isDirty).toBe(false);
    act(() => {
      result.current.factory.productionLines[0].outputRate = 60;
      result.current.factory._updateRates();
    });
    await settle();
    expect(result.current.isDirty).toBe(true);
  });

  it("R7.S1 — clearTo resets session into target folder", async () => {
    const entry = sf();
    const lib = libWith(entry);
    const { result } = mount(lib);
    act(() => {
      result.current.loadSerialized(entry, lib);
    });
    await settle();
    act(() => {
      result.current.clearTo("folder-9");
    });
    await settle();
    expect(result.current.currentFactoryId).toBeNull();
    expect(result.current.currentSlug).toBeNull();
    expect(result.current.currentFolderId).toBe("folder-9");
    expect(result.current.createdAt).toBe("");
    expect(result.current.isDirty).toBe(false);
    expect(result.current.factory.productionLines.length).toBe(0);
    expect(localStorage.getItem("sfp:current")).toBeNull();
  });

  it("R3.S1 — update shim recomputes rates only", async () => {
    const { result } = mount();
    act(() => {
      result.current.factory.addProductionLine(
        partSlugLookup["iron-ingot"],
        false,
        false,
      );
    });
    await settle();
    const lookupBefore = result.current.factory.rateLookup;
    act(() => {
      result.current.factory._updateRates();
    });
    await settle();
    // _updateRates rebuilds rateLookup from scratch — a tracked write on the
    // proxy, which is what makes dependent components re-render.
    expect(result.current.factory.rateLookup).not.toBe(lookupBefore);
  });
});
