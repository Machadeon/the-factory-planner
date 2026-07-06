import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useFactorySession from "@/app/hooks/useFactorySession";
import useFactoryUrlSync from "@/app/hooks/useFactoryUrlSync";
import useLibrary from "@/app/hooks/useLibrary";
import {
  CURRENT_SCHEMA_VERSION,
  emptyLibrary,
  type SerializedFactory,
} from "@/app/models/factory-storage";

const NOW = "2026-01-01T00:00:00.000Z";

function sf(overrides: Partial<SerializedFactory> = {}): SerializedFactory {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: "f-1",
    slug: "iron-works",
    name: "Iron Works",
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

function seedLibrary(...factories: SerializedFactory[]) {
  const lib = emptyLibrary();
  lib.factories.push(...factories);
  localStorage.setItem("sfp:library", JSON.stringify(lib));
  return lib;
}

const disableAutosave = vi.fn();

function useHarness() {
  const libraryApi = useLibrary();
  const session = useFactorySession({
    library: libraryApi.library,
    setLibrary: libraryApi.setLibrary,
  });
  const [activeSection, setActiveSection] = useState<
    "planning" | "optimization" | "logistics"
  >("planning");
  useFactoryUrlSync({
    session,
    libraryApi,
    activeSection,
    setActiveSection,
    onOrphanAutosaveRestore: disableAutosave,
  });
  return { session, activeSection, setActiveSection };
}

async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

function setUrl(url: string) {
  window.history.replaceState(null, "", url);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("sfp:consent", "true");
  disableAutosave.mockClear();
  setUrl("/");
});

describe("useFactoryUrlSync mount restore (R1)", () => {
  it("R1.S1 — URL slug wins over autosave; history state stamped", async () => {
    seedLibrary(sf());
    localStorage.setItem(
      "sfp:autosave",
      JSON.stringify(sf({ id: "f-2", slug: "other", name: "Other" })),
    );
    setUrl("/?factory=iron-works");
    const { result } = renderHook(useHarness);
    await settle();
    expect(result.current.session.currentFactoryId).toBe("f-1");
    expect(result.current.session.isDirty).toBe(false);
    expect(window.history.state?.factoryId).toBe("f-1");
    expect(window.history.state?.slug).toBe("iron-works");
  });

  it("R1.S2 — autosave restore is dirty", async () => {
    seedLibrary(sf());
    localStorage.setItem("sfp:autosave", JSON.stringify(sf()));
    const { result } = renderHook(useHarness);
    await settle();
    expect(result.current.session.currentFactoryId).toBe("f-1");
    expect(result.current.session.isDirty).toBe(true);
  });

  it("autosave R6.S2 — orphan autosave restore disables autosave", async () => {
    seedLibrary();
    localStorage.setItem(
      "sfp:autosave",
      JSON.stringify(sf({ id: "f-orphan" })),
    );
    const { result } = renderHook(useHarness);
    await settle();
    expect(result.current.session.currentFactoryId).toBe("f-orphan");
    expect(disableAutosave).toHaveBeenCalled();
  });

  it("R1.S3 — lastId fallback", async () => {
    seedLibrary(sf());
    localStorage.setItem("sfp:current", "f-1");
    const { result } = renderHook(useHarness);
    await settle();
    expect(result.current.session.currentFactoryId).toBe("f-1");
    expect(result.current.session.isDirty).toBe(false);
  });

  it("R1.S4 — nothing to restore starts fresh with generated name", async () => {
    const { result } = renderHook(useHarness);
    await settle();
    expect(result.current.session.currentFactoryId).toBeNull();
    expect(result.current.session.factoryName).not.toBe("");
  });

  it("R1.S5 — unresolvable URL param falls through to autosave", async () => {
    seedLibrary(sf());
    localStorage.setItem("sfp:autosave", JSON.stringify(sf()));
    setUrl("/?factory=no-such-slug");
    const { result } = renderHook(useHarness);
    await settle();
    expect(result.current.session.currentFactoryId).toBe("f-1");
    expect(result.current.session.isDirty).toBe(true);
  });
});

describe("useFactoryUrlSync hash/section (R2)", () => {
  it("R2.S1 — initial hash selects section", async () => {
    setUrl("/#optimization");
    const { result } = renderHook(useHarness);
    await settle();
    expect(result.current.activeSection).toBe("optimization");
  });

  it("R2.S2 — tab switch updates hash without a new history entry", async () => {
    const { result } = renderHook(useHarness);
    await settle();
    const lengthBefore = window.history.length;
    act(() => result.current.setActiveSection("logistics"));
    await settle();
    expect(window.location.hash).toBe("#logistics");
    expect(window.history.length).toBe(lengthBefore);
  });
});

describe("useFactoryUrlSync pushState (R3)", () => {
  it("R3.S1 — loading a factory pushes a bookmarkable slug URL", async () => {
    const lib = seedLibrary(sf());
    const { result } = renderHook(useHarness);
    await settle();
    act(() => {
      result.current.session.loadSerialized(sf(), lib);
    });
    await settle();
    expect(window.location.search).toContain("factory=iron-works");
    expect(window.history.state?.factoryId).toBe("f-1");
  });
});

describe("useFactoryUrlSync popstate (R4)", () => {
  it("R4.S1 — back restores factory from history state without pushing", async () => {
    seedLibrary(sf());
    const { result } = renderHook(useHarness);
    await settle();
    setUrl("/?factory=iron-works");
    act(() => {
      window.dispatchEvent(
        new PopStateEvent("popstate", {
          state: { factoryId: "f-1", slug: "iron-works" },
        }),
      );
    });
    await settle();
    expect(result.current.session.currentFactoryId).toBe("f-1");
    expect(localStorage.getItem("sfp:current")).toBe("f-1");
  });

  it("R4.S2 — popstate without state falls back to URL params", async () => {
    seedLibrary(sf());
    const { result } = renderHook(useHarness);
    await settle();
    setUrl("/?factory=iron-works#planning");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });
    await settle();
    expect(result.current.session.currentFactoryId).toBe("f-1");
  });

  it("R4.S3 — popstate to clean URL resets to a fresh factory", async () => {
    const lib = seedLibrary(sf());
    const { result } = renderHook(useHarness);
    await settle();
    act(() => {
      result.current.session.loadSerialized(sf(), lib);
    });
    await settle();
    setUrl("/");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });
    await settle();
    expect(result.current.session.currentFactoryId).toBeNull();
    expect(localStorage.getItem("sfp:current")).toBeNull();
  });

  it("R4.S4 — popstate to a deleted factory leaves session untouched", async () => {
    const lib = seedLibrary(sf());
    const { result } = renderHook(useHarness);
    await settle();
    act(() => {
      result.current.session.loadSerialized(sf(), lib);
    });
    await settle();
    act(() => {
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: { factoryId: "f-gone" } }),
      );
    });
    await settle();
    expect(result.current.session.currentFactoryId).toBe("f-1");
  });
});
