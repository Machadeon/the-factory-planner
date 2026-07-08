import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { proxy } from "valtio";
import {
  FactoryProvider,
  type FactoryStore,
} from "@/app/contexts/FactoryContext";
import { LibraryProvider } from "@/app/contexts/LibraryContext";
import { NavigationProvider } from "@/app/contexts/NavigationContext";
import Factory from "@/app/models/factory";
import {
  emptyLibrary,
  type StorageLibrary,
} from "@/app/models/factory-storage";

// Test helper: wrap a component tree in the three app contexts. valtio writes
// through to the underlying Factory instance, so tests may keep asserting on the
// raw `factory` they passed in.
export interface ProviderOptions {
  factory?: Factory;
  store?: FactoryStore;
  library?: StorageLibrary;
  currentFactoryId?: string | null;
  navigateToFactory?: (id: string) => void;
  updatePartPointOverrides?: (overrides: Record<string, number>) => void;
}

export function AppProviders({
  children,
  factory,
  store,
  library,
  currentFactoryId = null,
  navigateToFactory = () => {},
  updatePartPointOverrides = () => {},
}: ProviderOptions & { children: ReactNode }) {
  const resolvedStore = store ?? proxy({ factory: factory ?? new Factory() });
  return (
    <FactoryProvider store={resolvedStore}>
      <LibraryProvider
        library={library ?? emptyLibrary()}
        currentFactoryId={currentFactoryId}
        updatePartPointOverrides={updatePartPointOverrides}
      >
        <NavigationProvider navigateToFactory={navigateToFactory}>
          {children}
        </NavigationProvider>
      </LibraryProvider>
    </FactoryProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options: ProviderOptions = {},
  renderOptions?: RenderOptions,
) {
  return render(<AppProviders {...options}>{ui}</AppProviders>, renderOptions);
}
