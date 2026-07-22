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
  /** Small unsaved-changes-style dot overlay (e.g. the dirty-save indicator). */
  dotBadge?: boolean;
}

export default function IconButton({
  "aria-label": ariaLabel,
  children,
  onClick,
  title,
  variant,
  className,
  tooltipEnterDelay,
  dotBadge,
}: IconButtonProps) {
  return (
    <Tooltip title={title ?? ariaLabel} enterDelay={tooltipEnterDelay}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        className={`relative ${interactiveClasses(variant, className)}`}
      >
        {children}
        {dotBadge && (
          <span
            aria-hidden
            data-testid="icon-button-dot-badge"
            className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500"
          />
        )}
      </button>
    </Tooltip>
  );
}
