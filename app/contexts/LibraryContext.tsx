"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { StorageLibrary } from "@/app/models/factory-storage";

export interface LibraryContextValue {
  library: StorageLibrary;
  currentFactoryId: string | null;
  updatePartPointOverrides: (overrides: Record<string, number>) => void;
}

const LibraryContext = createContext<LibraryContextValue | undefined>(
  undefined,
);

export function LibraryProvider({
  library,
  currentFactoryId,
  updatePartPointOverrides,
  children,
}: LibraryContextValue & { children: ReactNode }) {
  // Memoized on reference identity: `library` is replaced by-reference by
  // useLibrary, `currentFactoryId` is a primitive, the mutator is useCallback-stable.
  const value = useMemo(
    () => ({ library, currentFactoryId, updatePartPointOverrides }),
    [library, currentFactoryId, updatePartPointOverrides],
  );
  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}

export function useLibraryContext(): LibraryContextValue {
  const value = useContext(LibraryContext);
  if (value === undefined) {
    throw new Error("useLibraryContext must be used within a LibraryProvider");
  }
  return value;
}
