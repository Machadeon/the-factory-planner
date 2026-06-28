import { createContext, useContext } from "react";

export interface LogisticsCallbacks {
  onNavigateToFactory?: (id: string) => void;
}

export const LogisticsContext = createContext<LogisticsCallbacks>({});

export const useLogistics = () => useContext(LogisticsContext);
