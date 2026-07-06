import solver, {
  type ModelDefinition,
  type SolveResult,
} from "javascript-lp-solver";
import type { PartConstraint } from "../factory";
import { defaultResourceLimits } from "../game-data";
import type { RecipeLike } from "../recipe-like";
import { createBaseModel } from "./base-model";

export interface RateSolveInput {
  /** One entry per assembly line, in factory traversal order. */
  recipes: RecipeLike[];
  /** partSlug → desired output rate (equality constraint). */
  rateTargets: Map<string, number>;
  /** Parts whose output the solve maximizes instead of pinning. */
  maxTargets: Set<string>;
  factoryConstraints: PartConstraint[];
}

export type RateSolveResult =
  | {
      feasible: true;
      /** Solved completions/min keyed by recipe slug (the LP variable). */
      ratesBySlug: Map<string, number>;
      /** The solved model, for post-apply constraint verification. */
      model: ModelDefinition;
    }
  | { feasible: false };

export function solveRates(input: RateSolveInput): RateSolveResult {
  const model = createBaseModel(input.recipes, input.factoryConstraints);

  // set rate targets
  for (const [partSlug, rate] of input.rateTargets) {
    model.constraints[partSlug] = { equal: rate };
  }

  // set optimization target
  if (input.maxTargets.size > 0) {
    // goal is to maximize a part
    for (const partSlug of input.maxTargets) {
      for (const coefficients of Object.values(model.variables)) {
        if (coefficients[partSlug] !== 0) {
          coefficients._obj = coefficients[partSlug];
        }
      }
    }

    model.opType = "max";
  } else {
    // goal is to minimize inputs
    for (const partSlug of Object.keys(defaultResourceLimits)) {
      const rawPartSlug = `_raw_${partSlug}`;
      for (const coefficients of Object.values(model.variables)) {
        if (coefficients[rawPartSlug] && coefficients[rawPartSlug] !== 0) {
          coefficients._obj =
            (coefficients._obj ?? 0) + coefficients[rawPartSlug];
        }
      }
    }

    model.opType = "min";
  }

  const solution = solver.Solve(model) as SolveResult;

  if (!solution.feasible) return { feasible: false };

  const ratesBySlug = new Map<string, number>();
  for (const recipe of input.recipes) {
    ratesBySlug.set(
      recipe.slug,
      typeof solution[recipe.slug] === "number"
        ? (solution[recipe.slug] as number)
        : 0,
    );
  }

  return { feasible: true, ratesBySlug, model };
}
