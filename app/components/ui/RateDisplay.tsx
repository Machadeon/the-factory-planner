import { formatRate, type RatePart } from "@/app/lib/format";

export interface RateDisplayProps {
  part: RatePart;
  rate: number;
  /** Status color from lib/rate-status — the call site picks the variant. */
  colorClass?: string;
  className?: string;
}

export default function RateDisplay({
  part,
  rate,
  colorClass,
  className,
}: RateDisplayProps) {
  const classes = [className, colorClass].filter(Boolean).join(" ");
  return <span className={classes || undefined}>{formatRate(part, rate)}</span>;
}
