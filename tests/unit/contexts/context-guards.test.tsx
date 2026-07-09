import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFactory, useFactorySnapshot } from "@/app/contexts/FactoryContext";
import { useLibraryContext } from "@/app/contexts/LibraryContext";
import { useNavigation } from "@/app/contexts/NavigationContext";

// R1.S3 — hooks throw fail-fast when used outside their provider.
describe("context hooks outside provider (R1.S3)", () => {
  it("useFactory throws without a FactoryProvider", () => {
    expect(() => renderHook(() => useFactory())).toThrow();
  });

  it("useFactorySnapshot throws without a FactoryProvider", () => {
    expect(() => renderHook(() => useFactorySnapshot())).toThrow();
  });

  it("useLibraryContext throws without a LibraryProvider", () => {
    expect(() => renderHook(() => useLibraryContext())).toThrow();
  });

  it("useNavigation throws without a NavigationProvider", () => {
    expect(() => renderHook(() => useNavigation())).toThrow();
  });
});
