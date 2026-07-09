"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

export interface NavigationContextValue {
  navigateToFactory: (id: string) => void;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(
  undefined,
);

export function NavigationProvider({
  navigateToFactory,
  children,
}: NavigationContextValue & { children: ReactNode }) {
  const value = useMemo(() => ({ navigateToFactory }), [navigateToFactory]);
  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextValue {
  const value = useContext(NavigationContext);
  if (value === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return value;
}
