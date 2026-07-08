"use client";

import { createContext, type ReactNode, useContext } from "react";
import { useSnapshot } from "valtio";
import type Factory from "@/app/models/factory";

// The stable valtio store container created once in useFactorySession. Distributing
// the container (not `store.factory`) keeps context identity stable across factory
// swaps: `store.factory = loaded` is a tracked mutation, so snapshot consumers
// re-render on swap without the context value ref churning.
export interface FactoryStore {
  factory: Factory;
}

const FactoryContext = createContext<FactoryStore | undefined>(undefined);

export function FactoryProvider({
  store,
  children,
}: {
  store: FactoryStore;
  children: ReactNode;
}) {
  return (
    <FactoryContext.Provider value={store}>{children}</FactoryContext.Provider>
  );
}

function useStore(): FactoryStore {
  const store = useContext(FactoryContext);
  if (store === undefined) {
    throw new Error("useFactory must be used within a FactoryProvider");
  }
  return store;
}

// Mutable proxy — use for writes and model-method calls. Never render off this.
export function useFactory(): Factory {
  return useStore().factory;
}

// Render-time snapshot — reads here scope re-renders to the fields actually read.
export function useFactorySnapshot(): Factory {
  const store = useStore();
  return useSnapshot(store).factory as Factory;
}
