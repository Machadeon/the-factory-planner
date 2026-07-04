import { Tooltip } from "@mui/material";
import type { MouseEventHandler, ReactNode } from "react";
import {
  type InteractiveVariant,
  interactiveClasses,
} from "./interactive-styles";

export interface IconButtonProps {
  "aria-label": string;
  children: ReactNode;
  onClick: MouseEventHandler<HTMLButtonElement>;
  /** Tooltip text; defaults to the aria-label. */
  title?: string;
  variant?: InteractiveVariant;
  className?: string;
  /** Passed to the MUI Tooltip (e.g. delayed hint tooltips). */
  tooltipEnterDelay?: number;
}

export default function IconButton({
  "aria-label": ariaLabel,
  children,
  onClick,
  title,
  variant,
  className,
  tooltipEnterDelay,
}: IconButtonProps) {
  return (
    <Tooltip title={title ?? ariaLabel} enterDelay={tooltipEnterDelay}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        className={interactiveClasses(variant, className)}
      >
        {children}
      </button>
    </Tooltip>
  );
}
