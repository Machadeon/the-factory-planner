import { act, renderHook, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/app/components/ui/toast/ToastProvider";
import useLibrary from "@/app/hooks/useLibrary";
import {
  CURRENT_SCHEMA_VERSION,
  type SerializedFactory,
} from "@/app/models/factory-storage";
import { installLocalStorageMock } from "../../helpers/local-storage-mock";

let localStorageMock: ReturnType<typeof installLocalStorageMock>;

beforeEach(() => {
  localStorageMock = installLocalStorageMock();
});

function toastWrapper({ children }: { children: ReactNode }) {
  return createElement(ToastProvider, null, children);
}

function mount() {
  return renderHook(() => useLibrary(), { wrapper: toastWrapper });
}

function makeFactory(
  overrides: Partial<SerializedFactory> = {},
): SerializedFactory {
  const now = new Date().toISOString();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: "fa-1",
    name: "Factory A",
    folderId: null,
    autoAddProductLines: true,
    productionLines: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("useLibrary", () => {
  it("page-structure R3.S1 — point-override mutator updates state and persists in one call", () => {
    const { result } = mount();
    act(() => result.current.updatePartPointOverrides({ "iron-ingot": 5 }));
    expect(result.current.library.partPointOverrides).toEqual({
      "iron-ingot": 5,
    });
    const persisted = JSON.parse(localStorage.getItem("sfp:library") ?? "{}");
    expect(persisted.partPointOverrides).toEqual({ "iron-ingot": 5 });
  });

  it("replaceLibrary pairs state update with persistence", () => {
    const { result } = mount();
    const next = {
      ...result.current.library,
      folders: [
        {
          id: "fo-1",
          name: "F",
          parentId: null,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    act(() => result.current.replaceLibrary(next));
    expect(result.current.library.folders.length).toBe(1);
    const persisted = JSON.parse(localStorage.getItem("sfp:library") ?? "{}");
    expect(persisted.folders.length).toBe(1);
  });

  it("reload reads storage into state and returns the library, normalizing schemaVersion (storage-migrations R7)", () => {
    const { result } = mount();
    // Deliberately a foreign/legacy value — loadLibrary normalizes unconditionally.
    localStorage.setItem(
      "sfp:library",
      JSON.stringify({ schemaVersion: 5, folders: [], factories: [] }),
    );
    let returned: unknown;
    act(() => {
      returned = result.current.reload();
    });
    expect(returned).toMatchObject({ schemaVersion: CURRENT_SCHEMA_VERSION });
  });

  // component-structure R2.S1 — mutator surface
  it("renameFactory updates the factory's name in state and persists", () => {
    const { result } = mount();
    act(() =>
      result.current.replaceLibrary({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        folders: [],
        factories: [makeFactory()],
      }),
    );
    act(() => result.current.renameFactory("fa-1", "Renamed"));
    expect(result.current.library.factories[0].name).toBe("Renamed");
    const persisted = JSON.parse(localStorage.getItem("sfp:library") ?? "{}");
    expect(persisted.factories[0].name).toBe("Renamed");
  });

  it("renameFolder updates the folder's name in state and persists", () => {
    const { result } = mount();
    act(() =>
      result.current.replaceLibrary({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        folders: [
          {
            id: "fo-1",
            name: "F",
            parentId: null,
            createdAt: new Date().toISOString(),
          },
        ],
        factories: [],
      }),
    );
    act(() => result.current.renameFolder("fo-1", "Renamed Folder"));
    expect(result.current.library.folders[0].name).toBe("Renamed Folder");
    const persisted = JSON.parse(localStorage.getItem("sfp:library") ?? "{}");
    expect(persisted.folders[0].name).toBe("Renamed Folder");
  });

  it("deleteFactory removes the factory from state and persists", () => {
    const { result } = mount();
    act(() =>
      result.current.replaceLibrary({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        folders: [],
        factories: [makeFactory()],
      }),
    );
    act(() => result.current.deleteFactory("fa-1"));
    expect(result.current.library.factories).toHaveLength(0);
    const persisted = JSON.parse(localStorage.getItem("sfp:library") ?? "{}");
    expect(persisted.factories).toHaveLength(0);
  });

  it("deleteFolder removes the folder (and its contents) from state and persists", () => {
    const { result } = mount();
    act(() =>
      result.current.replaceLibrary({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        folders: [
          {
            id: "fo-1",
            name: "F",
            parentId: null,
            createdAt: new Date().toISOString(),
          },
        ],
        factories: [makeFactory({ folderId: "fo-1" })],
      }),
    );
    act(() => result.current.deleteFolder("fo-1"));
    expect(result.current.library.folders).toHaveLength(0);
    expect(result.current.library.factories).toHaveLength(0);
    const persisted = JSON.parse(localStorage.getItem("sfp:library") ?? "{}");
    expect(persisted.folders).toHaveLength(0);
    expect(persisted.factories).toHaveLength(0);
  });

  it("duplicateFactory adds a copy with fresh id, suffixed name, and fresh timestamps", () => {
    const { result } = mount();
    const original = makeFactory({
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
    });
    act(() =>
      result.current.replaceLibrary({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        folders: [],
        factories: [original],
      }),
    );
    act(() => result.current.duplicateFactory(original));
    expect(result.current.library.factories).toHaveLength(2);
    const dupe = result.current.library.factories.find((f) => f.id !== "fa-1");
    expect(dupe).toBeDefined();
    expect(dupe?.name).toBe("Factory A (copy)");
    expect(dupe?.createdAt).not.toBe("2020-01-01T00:00:00.000Z");
    const persisted = JSON.parse(localStorage.getItem("sfp:library") ?? "{}");
    expect(persisted.factories).toHaveLength(2);
  });

  it("addFolder adds the folder to state, persists, and returns the created folder", () => {
    const { result } = mount();
    let returned: { folder: { id: string; name: string } } | undefined;
    act(() => {
      returned = result.current.addFolder("New Folder", null);
    });
    expect(result.current.library.folders).toHaveLength(1);
    expect(returned?.folder.name).toBe("New Folder");
    expect(result.current.library.folders[0].id).toBe(returned?.folder.id);
    const persisted = JSON.parse(localStorage.getItem("sfp:library") ?? "{}");
    expect(persisted.folders).toHaveLength(1);
  });

  it("moveFactory updates the factory's folderId in state and persists", () => {
    const { result } = mount();
    act(() =>
      result.current.replaceLibrary({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        folders: [
          {
            id: "fo-1",
            name: "F",
            parentId: null,
            createdAt: new Date().toISOString(),
          },
        ],
        factories: [makeFactory()],
      }),
    );
    act(() => result.current.moveFactory("fa-1", "fo-1"));
    expect(result.current.library.factories[0].folderId).toBe("fo-1");
    const persisted = JSON.parse(localStorage.getItem("sfp:library") ?? "{}");
    expect(persisted.factories[0].folderId).toBe("fo-1");
  });

  // component-structure R2.S3 — mutation on a missing id is a safe no-op
  it("deleteFactory with a missing id persists the library unchanged and throws no exception", () => {
    const { result } = mount();
    act(() =>
      result.current.replaceLibrary({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        folders: [],
        factories: [makeFactory()],
      }),
    );
    expect(() =>
      act(() => result.current.deleteFactory("does-not-exist")),
    ).not.toThrow();
    expect(result.current.library.factories).toHaveLength(1);
    const persisted = JSON.parse(localStorage.getItem("sfp:library") ?? "{}");
    expect(persisted.factories).toHaveLength(1);
  });

  it("renameFolder with a missing id persists the library unchanged and throws no exception", () => {
    const { result } = mount();
    act(() =>
      result.current.replaceLibrary({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        folders: [
          {
            id: "fo-1",
            name: "F",
            parentId: null,
            createdAt: new Date().toISOString(),
          },
        ],
        factories: [],
      }),
    );
    expect(() =>
      act(() => result.current.renameFolder("does-not-exist", "X")),
    ).not.toThrow();
    expect(result.current.library.folders[0].name).toBe("F");
    const persisted = JSON.parse(localStorage.getItem("sfp:library") ?? "{}");
    expect(persisted.folders[0].name).toBe("F");
  });

  it("a failed save shows an error toast, keeping the optimistic in-memory update (D-C3.2)", async () => {
    const { result } = mount();
    const spy = vi.spyOn(localStorageMock, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });
    try {
      act(() => result.current.addFolder("New Folder", null));
      expect(result.current.library.folders).toHaveLength(1);
      expect(
        await screen.findByText(/Couldn't save your library/),
      ).toBeInTheDocument();
    } finally {
      spy.mockRestore();
    }
  });

  it("a save whose serialized size exceeds the quota-warn threshold shows exactly one info toast across repeated saves (D-C3.3)", async () => {
    const { result } = mount();
    // Force estimateStorageBytes over LOCALSTORAGE_WARN_THRESHOLD_BYTES by
    // giving the first folder a name well past the 4.5MB threshold.
    const bigName = "x".repeat(5_000_000);
    act(() => result.current.addFolder(bigName, null));
    expect(
      await screen.findByText(/approaching the browser storage limit/),
    ).toBeInTheDocument();

    act(() => result.current.addFolder("Second Folder", null));
    expect(
      screen.getAllByText(/approaching the browser storage limit/),
    ).toHaveLength(1);
  });
});
