export interface ConstraintViolation {
  partSlug: string;
  bound: "min" | "max" | "equal";
  limit: number;
  /** Solved net rate (raw, unformatted — the view layer formats for display). */
  actual: number;
}

export type SolverError =
  | {
      kind: "conflicting-goals";
      partSlug: string;
      targetRate: number;
      lineRate: number;
    }
  | { kind: "nothing-to-optimize" }
  | {
      kind: "infeasible-recipes";
      targets: { partSlug: string; rate?: number; maximize?: boolean }[];
    }
  | { kind: "infeasible-rates" }
  | { kind: "constraint-violations"; violations: ConstraintViolation[] };
