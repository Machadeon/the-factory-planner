import { type ReactNode, useId } from "react";
import Tooltip from "./Tooltip";

export interface SwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  size?: "small" | "medium";
  disabled?: boolean;
  label?: ReactNode;
  labelPlacement?: "start" | "end";
  tooltip?: ReactNode;
  readOnly?: boolean;
  tabIndex?: number;
  "aria-label"?: string;
  className?: string;
}

const trackSize: Record<"small" | "medium", string> = {
  small: "w-7 h-4",
  medium: "w-9 h-5",
};

const thumbSize: Record<"small" | "medium", string> = {
  small: "w-3 h-3 peer-checked:translate-x-3",
  medium: "w-4 h-4 peer-checked:translate-x-4",
};

// Native checkbox with role="switch" — announces as a toggle switch to AT
// while keeping full native keyboard/focus behavior. Absorbs the
// FormControlLabel+Switch(+Tooltip) trio MUI callers used.
export default function Switch({
  checked,
  onChange,
  size = "medium",
  disabled,
  label,
  labelPlacement = "end",
  tooltip,
  readOnly,
  tabIndex,
  "aria-label": ariaLabel,
  className,
}: SwitchProps) {
  const id = useId();
  const control = (
    <span className={`relative inline-flex ${trackSize[size]} shrink-0`}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        disabled={disabled}
        readOnly={readOnly}
        tabIndex={tabIndex}
        aria-label={
          ariaLabel ?? (typeof label === "string" ? label : undefined)
        }
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer absolute inset-0 m-0 cursor-pointer appearance-none opacity-0 disabled:cursor-default"
      />
      <span
        aria-hidden
        className={
          "pointer-events-none absolute inset-0 rounded-full bg-[rgba(128,128,128,0.4)] transition-colors " +
          "peer-checked:bg-amber-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-amber-500"
        }
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute left-0.5 top-0.5 rounded-full bg-white transition-transform ${thumbSize[size]}`}
      />
    </span>
  );

  const body =
    label !== undefined ? (
      <label
        htmlFor={id}
        className={`inline-flex items-center gap-x-1.5 ${disabled ? "opacity-50" : "cursor-pointer"} ${className ?? ""}`}
      >
        {labelPlacement === "start" && label}
        {control}
        {labelPlacement === "end" && label}
      </label>
    ) : (
      <span className={className}>{control}</span>
    );

  return tooltip ? <Tooltip title={tooltip}>{body}</Tooltip> : body;
}
