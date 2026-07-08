import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import useLibrary from "@/app/hooks/useLibrary";
import { installLocalStorageMock } from "../../helpers/local-storage-mock";

beforeEach(() => {
  installLocalStorageMock();
});

describe("useLibrary", () => {
  it("page-structure R3.S1 — point-override mutator updates state and persists in one call", () => {
    const { result } = renderHook(() => useLibrary());
    act(() => result.current.updatePartPointOverrides({ "iron-ingot": 5 }));
    expect(result.current.library.partPointOverrides).toEqual({
      "iron-ingot": 5,
    });
    const persisted = JSON.parse(localStorage.getItem("sfp:library") ?? "{}");
    expect(persisted.partPointOverrides).toEqual({ "iron-ingot": 5 });
  });

  it("replaceLibrary pairs state update with persistence", () => {
    const { result } = renderHook(() => useLibrary());
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

  it("reload reads storage into state and returns the library", () => {
    const { result } = renderHook(() => useLibrary());
    localStorage.setItem(
      "sfp:library",
      JSON.stringify({ schemaVersion: 5, folders: [], factories: [] }),
    );
    let returned: unknown;
    act(() => {
      returned = result.current.reload();
    });
    expect(returned).toMatchObject({ schemaVersion: 5 });
  });
});
