export interface ChipProps {
  label: string;
  size?: "small" | "medium";
  color?: "default" | "info";
  className?: string;
}

const colorClasses: Record<"default" | "info", string> = {
  default: "bg-white/10 text-gray-200",
  info: "bg-sky-500/20 text-sky-300",
};

const sizeClasses: Record<"small" | "medium", string> = {
  small: "text-xs px-2 py-0.5",
  medium: "text-sm px-2.5 py-1",
};

export default function Chip({
  label,
  size = "medium",
  color = "default",
  className,
}: ChipProps) {
  const classes = [
    "inline-flex items-center rounded-full font-medium leading-none",
    sizeClasses[size],
    colorClasses[color],
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return <span className={classes}>{label}</span>;
}
