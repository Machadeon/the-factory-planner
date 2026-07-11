import { displayNum } from "@/app/lib/format";
import Icon from "../ui/Icon";

interface PowerSummaryProps {
  power: { avg: number; min: number; max: number };
  iconSize?: number;
  iconAlt?: string;
  /** "detailed" (default): two-span text, min–max de-emphasized in gray — matches
   * the overview's Power & Modules row. "compact": single span, no color split —
   * matches AssemblyLineControls' denser sidebar row. */
  variant?: "detailed" | "compact";
}

/** The power-consumption row: an icon plus avg, or avg + min–max when variable.
 * Renders no wrapping element so it drops into either call site's own flex/gap
 * container unchanged. */
export default function PowerSummary({
  power,
  iconSize = 24,
  iconAlt = "Power",
  variant = "detailed",
}: PowerSummaryProps) {
  const variable = power.max - power.min > 0.01;
  const textClassName = variant === "detailed" ? "text-sm" : undefined;
  return (
    <>
      <Icon
        src="/images/items/power_192.png"
        alt={iconAlt}
        size={iconSize}
        className={variant === "compact" ? "shrink-0" : undefined}
      />
      {variable ? (
        variant === "detailed" ? (
          <span className={textClassName}>
            {displayNum(power.avg)} MW avg
            <span className="text-gray-400">
              {" "}
              · {displayNum(power.min)}–{displayNum(power.max)} MW
            </span>
          </span>
        ) : (
          <span>
            {displayNum(power.avg)} MW avg · {displayNum(power.min)}–
            {displayNum(power.max)} MW
          </span>
        )
      ) : (
        <span className={textClassName}>{displayNum(power.avg)} MW</span>
      )}
    </>
  );
}
