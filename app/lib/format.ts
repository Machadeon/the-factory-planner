import type Part from "@/app/models/part";

export function displayNum(num: number): string {
  const result = num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  return result === "-0" ? "0" : result;
}

// Bare unit for standalone unit labels (e.g. a unit span next to an input).
export function rateUnit(part: Part): string {
  return part.slug === "power" ? "MW" : "/min";
}

// Combined value+unit string; power gets a space before the unit, /min does not
// — matches the strings rendered at existing call sites.
export function formatRate(part: Part, rate: number): string {
  return part.slug === "power"
    ? `${displayNum(rate)} MW`
    : `${displayNum(rate)}/min`;
}
