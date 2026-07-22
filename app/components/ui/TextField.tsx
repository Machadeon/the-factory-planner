import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";

export interface TextFieldProps {
  value: string | number;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: "small" | "medium";
  endAdornment?: ReactNode;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  error?: boolean;
  fullWidth?: boolean;
  /** "outlined" (default) always shows a border, matching the MUI outlined
   * variant this replaces. "borderless" stays transparent until
   * hover/focus — FactoryHeader's title-bar look. */
  variant?: "outlined" | "borderless";
  "aria-label"?: string;
  onFocus?: (e: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onClick?: (e: MouseEvent<HTMLInputElement>) => void;
}

const wrapperSize: Record<"small" | "medium", string> = {
  small: "px-2 py-1 text-sm",
  medium: "px-3 py-1.5 text-sm",
};

// Native input + stacked (non-floating) label — functional parity with the
// MUI outlined TextField this replaces (label, placeholder, disabled,
// adornment, error state), not pixel parity with its floating-label
// animation (ADR-0001 driver is developer clarity, not visual polish).
export default function TextField({
  value,
  onChange,
  label,
  placeholder,
  disabled,
  size = "medium",
  endAdornment,
  className,
  inputClassName,
  autoFocus,
  error,
  fullWidth,
  variant = "outlined",
  "aria-label": ariaLabel,
  onFocus,
  onBlur,
  onKeyDown,
  onClick,
}: TextFieldProps) {
  const id = useId();
  // Imperative focus in an effect instead of the native autofocus attribute
  // (biome lint/a11y/noAutofocus) — this only fires for this field's own
  // mount (e.g. a revealed inline-edit/add-item input), not a page-load jump.
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);
  const borderClass =
    variant === "borderless"
      ? "border-transparent hover:border-[rgba(128,128,128,0.4)] focus-within:border-[rgba(128,128,128,0.6)]"
      : "border-[rgba(128,128,128,0.4)] hover:border-[rgba(128,128,128,0.5)] focus-within:border-[rgba(128,128,128,0.7)]";
  return (
    <div
      className={`inline-flex flex-col gap-y-0.5 ${fullWidth ? "w-full" : ""} ${className ?? ""}`}
    >
      {label && (
        <label htmlFor={id} className="text-xs text-gray-400">
          {label}
        </label>
      )}
      <div
        className={
          "flex items-center rounded-sm border bg-transparent transition-colors " +
          `${error ? "border-red-500" : borderClass} ` +
          `${disabled ? "opacity-50" : ""} ${wrapperSize[size]}`
        }
      >
        <input
          ref={inputRef}
          id={id}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error || undefined}
          aria-label={ariaLabel ?? (label ? undefined : placeholder)}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          onClick={onClick}
          className={`grow min-w-0 bg-transparent outline-none ${inputClassName ?? ""}`}
        />
        {endAdornment}
      </div>
    </div>
  );
}
