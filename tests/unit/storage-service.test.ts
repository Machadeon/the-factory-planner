import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getLibraryPinned,
  getSidebarWidth,
  setLibraryPinned,
  setSidebarWidth,
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
