import type { MouseEventHandler, ReactNode } from "react";
import {
  bareButtonClasses,
  type InteractiveVariant,
  interactiveClasses,
} from "./interactive-styles";

export interface ActionRowProps {
  children: ReactNode;
  onClick: MouseEventHandler<HTMLButtonElement>;
  variant?: InteractiveVariant;
  /** Reset+focus classes only — for split-rows whose outer div owns the visuals. */
  bare?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
}

// Successor for non-icon Clickable uses: clickable rows/tiles with text or
// composite content. Must not contain other interactive elements — rows that
// need trailing controls use the split-row pattern (outer div carries the
// visual classes, ActionRow wraps only the leading/primary-action content).
export default function ActionRow({
  children,
  onClick,
  variant,
  bare,
  className,
  "aria-label": ariaLabel,
  "aria-expanded": ariaExpanded,
}: ActionRowProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      onClick={onClick}
      className={
        bare
          ? bareButtonClasses(className)
          : interactiveClasses(variant, className)
      }
    >
      {children}
    </button>
  );
}
