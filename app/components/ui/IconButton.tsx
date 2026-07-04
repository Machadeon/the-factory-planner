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
  disabled?: boolean;
}

export default function IconButton({
  "aria-label": ariaLabel,
  children,
  onClick,
  title,
  variant,
  className,
  disabled,
}: IconButtonProps) {
  return (
    <Tooltip title={title ?? ariaLabel}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        disabled={disabled}
        className={interactiveClasses(variant, className)}
      >
        {children}
      </button>
    </Tooltip>
  );
}
