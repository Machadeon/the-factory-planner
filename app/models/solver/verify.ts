import type { ConstraintBound } from "javascript-lp-solver";
import type { Rate } from "../factory";
import { partSlugLookup, RATE_EPSILON } from "../game-data";
import type { ConstraintViolation } from "./errors";

/**
 * Compare a solved model's constraints against the recomputed rateLookup and
 * return every violated bound. Synchronous and pure — replaces the deferred
 * timer-based check that previously lived in Factory.autoCalculateRates.
 */
export function verifyConstraints(
  constraints: Record<string, ConstraintBound>,
  rateLookup: { [partSlug: string]: Rate },
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  for (const [constraintSlug, constraint] of Object.entries(constraints)) {
    // A `_raw_` constraint bounds net consumption of a raw resource, so its
    // net is measured consumption-first. Compute it into a local — never
    // mutate the shared rateLookup entry, or the part's net flips sign and
    // raw inputs get misclassified as byproducts on the next render.
    const isRaw = constraintSlug.startsWith("_raw_");
    const partSlug = isRaw ? constraintSlug.substring(5) : constraintSlug;
    const rate = rateLookup[partSlug];
    if (!rate) continue;
    if (!partSlugLookup[partSlug]) {
      console.warn("Unable to find part for constraint", constraintSlug);
      continue;
    }

    const netRate = isRaw
      ? rate.consumptionRate - rate.productionRate
      : rate.productionRate - rate.consumptionRate;

    // A part with a `_raw_` sibling is supply-augmented: its LP balance row
    // includes the raw-supply variable, which rateLookup cannot see, so its
    // net production is legitimately negative by up to the raw draw. Its
    // `min` bound is an LP-internal device, not verifiable against rateLookup.
    const supplyAugmented =
      !isRaw && constraints[`_raw_${partSlug}`] !== undefined;

    if (
      constraint.min !== undefined &&
      !supplyAugmented &&
      constraint.min - netRate > RATE_EPSILON
    ) {
      violations.push({
        partSlug,
        bound: "min",
        limit: constraint.min,
        actual: netRate,
      });
    } else if (
      constraint.max !== undefined &&
      constraint.max - netRate < -RATE_EPSILON
    ) {
      violations.push({
        partSlug,
        bound: "max",
        limit: constraint.max,
        actual: netRate,
      });
    } else if (
      constraint.equal !== undefined &&
      Math.abs(constraint.equal - netRate) > RATE_EPSILON
    ) {
      violations.push({
        partSlug,
        bound: "equal",
        limit: constraint.equal,
        actual: netRate,
      });
    }
  }

  return violations;
}
