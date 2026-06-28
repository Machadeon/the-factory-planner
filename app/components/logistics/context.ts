import { createContext, useContext } from "react";

export interface LogisticsCallbacks {
  onNavigateToFactory?: (id: string) => void;
  // When false, every node is drawn at its minimum size and machine footprints are
  // hidden; when true, nodes are sized to the real footprint and machines are drawn.
  actualSize?: boolean;
}

export const LogisticsContext = createContext<LogisticsCallbacks>({
  actualSize: true,
});

export const useLogistics = () => useContext(LogisticsContext);
