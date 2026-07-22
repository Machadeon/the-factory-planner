import MuiTooltip from "@mui/material/Tooltip";
import type { ReactElement } from "react";

export interface TooltipProps {
  title: React.ReactNode;
  children: ReactElement;
  enterDelay?: number;
}

// Thin wrap-and-hide for standalone (non-IconButton/Icon) tooltip use —
// Tooltip is allowlisted (ADR-0001) but must still live behind ui/.
export default function Tooltip({ title, children, enterDelay }: TooltipProps) {
  return (
    <MuiTooltip title={title} enterDelay={enterDelay}>
      {children}
    </MuiTooltip>
  );
}
