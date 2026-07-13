/** Tolerance for all rate comparisons and threshold checks (items- or m³-per-minute scale). */
export const RATE_EPSILON = 1e-4;

/**
 * Scaling factor applied to LP equal-constraints to absorb floating-point
 * precision errors. Not a comparison tolerance — do not merge with RATE_EPSILON.
 */
export const SOLVER_EQUALITY_FUDGE = 1e-8;

export const rawResources = [
  "water",
  "iron-ore",
  "limestone",
  "coal",
  "copper-ore",
  "caterium-ore",
  "raw-quartz",
  "crude-oil",
  "bauxite",
  "nitrogen-gas",
  "sulfur",
  "sam",
  "uranium",
  "leaves",
  "wood",
  "mycelia",
  "hog-remains",
  "spitter-remains",
  "stinger-remains",
  "hatcher-remains",
  "blue-power-slug",
  "yellow-power-slug",
  "purple-power-slug",
];

export const defaultResourceLimits: Record<string, number> = {
  "iron-ore": 92100,
  limestone: 69900,
  coal: 42300,
  "copper-ore": 36900,
  "caterium-ore": 15000,
  "raw-quartz": 13500,
  "crude-oil": 12600,
  bauxite: 12300,
  "nitrogen-gas": 12000,
  sulfur: 10800,
  sam: 10200,
  uranium: 2100,
};

export const notAutomatable = new Set<string>([
  "wood",
  "leaves",
  "mycelia",
  "hog-remains",
  "spitter-remains",
  "stinger-remains",
  "hatcher-remains",
  "alien-protein",
  "biomass",
  "solid-biofuel",
  "liquid-biofuel",
  "packaged-liquid-biofuel",
  "blue-power-slug",
  "yellow-power-slug",
  "purple-power-slug",
]);
