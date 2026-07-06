import { displayNum } from "@/app/lib/format";
import { partSlugLookup } from "@/app/models/game-data";
import type {
  ConstraintViolation,
  SolverError,
} from "@/app/models/solver/errors";

function partName(slug: string): string {
  return partSlugLookup[slug]?.name ?? slug;
}

/** Render a structured solver error into the display text the Alert shows. */
export function formatSolverError(error: SolverError): string {
  switch (error.kind) {
    case "conflicting-goals":
      return `Conflicting goals for ${partName(error.partSlug)}: production target requires ${displayNum(error.targetRate)} but production line requires ${displayNum(error.lineRate)}`;
    case "nothing-to-optimize":
      return "Nothing to optimize";
    case "infeasible-recipes": {
      const names = error.targets.map((t) =>
        t.maximize
          ? `${partName(t.partSlug)} (maximize)`
          : `${partName(t.partSlug)} (${displayNum(t.rate ?? 0)}/min)`,
      );
      return `No feasible recipe selection for ${names.join(", ")} with the enabled recipes and available inputs.`;
    }
    case "infeasible-rates":
      return "No feasible solution";
    case "constraint-violations": {
      const phrasing: Record<ConstraintViolation["bound"], string> = {
        min: "be {limit}/min or greater",
        max: "be {limit}/min or less",
        equal: "be exactly {limit}/min",
      };
      const messages = error.violations.map(
        (v) =>
          `${partName(v.partSlug)} must ${phrasing[v.bound].replace("{limit}", displayNum(v.limit))}, but is ${displayNum(v.actual)}/min`,
      );
      return `No feasible solution! One or more constraints could not be satisified: ${messages.join("; ")}.`;
    }
  }
}
