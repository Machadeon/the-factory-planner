import {
  type MouseEventHandler,
  type ReactNode,
  useEffect,
  useRef,
} from "react";

type ButtonVariant = "text" | "outlined" | "contained";
type ButtonColor = "primary" | "warning" | "danger";

export interface ButtonProps {
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: "small" | "medium";
  startIcon?: ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  "aria-label"?: string;
}

const colorText: Record<ButtonColor, string> = {
  primary: "text-amber-500",
  warning: "text-orange-400",
  danger: "text-red-400",
};

const colorContained: Record<ButtonColor, string> = {
  primary: "bg-amber-600 hover:bg-amber-500 text-white",
  warning: "bg-orange-600 hover:bg-orange-500 text-white",
  danger: "bg-red-600 hover:bg-red-500 text-white",
};

const colorOutlined: Record<ButtonColor, string> = {
  primary: "border border-amber-500 hover:bg-amber-500/10",
  warning: "border border-orange-400 hover:bg-orange-400/10",
  danger: "border border-red-400 hover:bg-red-400/10",
};

const sizeClasses: Record<"small" | "medium", string> = {
  small: "text-sm px-2 py-1",
  medium: "text-sm px-4 py-1.5",
};

const focusVisibleClass =
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500";

export default function Button({
  children,
  onClick,
  variant = "text",
  color = "primary",
  size = "medium",
  startIcon,
  fullWidth,
  disabled,
  autoFocus,
  className,
  "aria-label": ariaLabel,
}: ButtonProps) {
  // Imperative focus in an effect instead of the native autofocus attribute
  // (biome lint/a11y/noAutofocus) — only fires for this element's own mount,
  // not a page-load autofocus jump.
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const variantClass =
    variant === "contained"
      ? colorContained[color]
      : variant === "outlined"
        ? `bg-transparent ${colorOutlined[color]} ${colorText[color]}`
        : `bg-transparent hover:bg-white/10 ${colorText[color]}`;

  const classes = [
    "inline-flex items-center justify-center gap-x-1 rounded-sm cursor-pointer font-medium disabled:opacity-50 disabled:cursor-default",
    sizeClasses[size],
    variantClass,
    focusVisibleClass,
    fullWidth ? "w-full" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {startIcon}
      {children}
    </button>
  );
}
