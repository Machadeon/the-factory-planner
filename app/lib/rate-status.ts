export interface RateStatusOptions {
  // true: surplus is desirable (green); false: surplus needs attention (amber).
  surplusIsGood: boolean;
}

// Rate is compared after rounding to one decimal, so |rate| < 0.05 counts as
// balanced. Balanced renders green in attention mode and unstyled otherwise.
export function rateStatusColor(
  rate: number,
  { surplusIsGood }: RateStatusOptions,
): string {
  const calcRate = parseFloat(rate.toFixed(1));
  if (calcRate > 0) {
    return surplusIsGood ? "text-green-500" : "text-amber-500";
  }
  if (calcRate < 0) {
    return "text-red-500";
  }
  return surplusIsGood ? "" : "text-green-500";
}
