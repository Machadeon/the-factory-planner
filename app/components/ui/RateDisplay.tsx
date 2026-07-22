import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckIcon from "@mui/icons-material/Check";
import { formatRate, type RatePart } from "@/app/lib/format";

export type RateStatus = "surplus" | "deficit" | "balanced" | "slooped";

export interface RateDisplayProps {
  part: RatePart;
  rate: number;
  /** Status color from lib/rate-status — the call site picks the variant. */
  colorClass?: string;
  /** Non-color status affordance (#12) — omit to render color-only (legacy call sites). */
  status?: RateStatus;
  className?: string;
}

const STATUS_ICON: Record<RateStatus, typeof ArrowUpwardIcon> = {
  surplus: ArrowUpwardIcon,
  deficit: ArrowDownwardIcon,
  balanced: CheckIcon,
  slooped: AutoAwesomeIcon,
};

export default function RateDisplay({
  part,
  rate,
  colorClass,
  status,
  className,
}: RateDisplayProps) {
  const classes = [className, colorClass].filter(Boolean).join(" ");
  const StatusIcon = status ? STATUS_ICON[status] : null;
  return (
    <span className={classes || undefined}>
      {StatusIcon && (
        <StatusIcon
          data-testid="rate-status-icon"
          aria-hidden
          className="text-[0.9em]! align-text-bottom mr-0.5"
        />
      )}
      {formatRate(part, rate)}
    </span>
  );
}
