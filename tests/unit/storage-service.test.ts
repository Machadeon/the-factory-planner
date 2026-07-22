import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyLibrary } from "@/app/models/factory-storage";
import {
  estimateStorageBytes,
  getLibraryPinned,
  getSidebarWidth,
  saveLibrary,
  setLibraryPinned,
  setSidebarWidth,
  writeAutosave,
} from "@/app/models/storage-service";

const localStorageMock = (() => {
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
  };
})();

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
  localStorageMock.clear();
});

afterEach(() => {
  localStorageMock.clear();
});

describe("getLibraryPinned()", () => {
  it("defaults to false when key absent", () => {
    expect(getLibraryPinned()).toBe(false);
  });

  it("returns true when stored value is 'true'", () => {
    setLibraryPinned(true);
    expect(getLibraryPinned()).toBe(true);
  });

  it("returns false when stored value is 'false'", () => {
    setLibraryPinned(false);
    expect(getLibraryPinned()).toBe(false);
  });
});

describe("saveLibrary()", () => {
  it("returns true on success", () => {
    expect(saveLibrary(emptyLibrary())).toBe(true);
  });

  it("returns false when localStorage.setItem throws (quota exceeded)", () => {
    const spy = vi.spyOn(localStorageMock, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });
    try {
      expect(saveLibrary(emptyLibrary())).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("writeAutosave()", () => {
  const factory = {
    schemaVersion: 1,
    id: "f1",
    name: "Test Factory",
    folderId: null,
    autoAddProductLines: false,
    productionLines: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("returns true on success", () => {
    expect(writeAutosave(factory)).toBe(true);
  });

  it("returns false when localStorage.setItem throws (quota exceeded)", () => {
    const spy = vi.spyOn(localStorageMock, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });
    try {
      expect(writeAutosave(factory)).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("estimateStorageBytes()", () => {
  it("returns the UTF-8 byte size of the serialized library", () => {
    const lib = emptyLibrary();
    expect(estimateStorageBytes(lib)).toBe(
      new TextEncoder().encode(JSON.stringify(lib)).length,
    );
  });
});

describe("getSidebarWidth()", () => {
  it("defaults to 380 when key absent", () => {
    expect(getSidebarWidth()).toBe(380);
  });

  it("returns stored value within valid range", () => {
    setSidebarWidth(500);
    expect(getSidebarWidth()).toBe(500);
  });

  it("clamps value below 200 to 200", () => {
    localStorageMock.setItem("sfp:sidebar-width", "50");
    expect(getSidebarWidth()).toBe(200);
  });

  it("clamps value above 700 to 700", () => {
    localStorageMock.setItem("sfp:sidebar-width", "999");
    expect(getSidebarWidth()).toBe(700);
  });

  it("defaults to 380 when stored value is NaN", () => {
    localStorageMock.setItem("sfp:sidebar-width", "not-a-number");
    expect(getSidebarWidth()).toBe(380);
  });

  it("accepts boundary values 200 and 700", () => {
    setSidebarWidth(200);
    expect(getSidebarWidth()).toBe(200);
    setSidebarWidth(700);
    expect(getSidebarWidth()).toBe(700);
  });
});
