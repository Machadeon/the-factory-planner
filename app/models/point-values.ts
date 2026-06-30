import { defaultResourceLimits, recipes } from "./library";
import type Recipe from "./recipe";

export const POINT_RATE_CONSTANT = Math.max(
  ...Object.values(defaultResourceLimits),
);

export interface PossibleValue {
  slug: string;
  value: number;
  recipe: Recipe;
}

export type Combiner = (possibleValues: PossibleValue[]) => number;
export type ValueFilter = (possibleValues: PossibleValue[]) => PossibleValue[];

export const combiners = {
  min: (pvs: PossibleValue[]) => Math.min(...pvs.map((pv) => pv.value)),
  max: (pvs: PossibleValue[]) => Math.max(...pvs.map((pv) => pv.value)),
  average: (pvs: PossibleValue[]) =>
    pvs.reduce((s, pv) => s + pv.value, 0) / pvs.length,
};

export const filters = {
  any: (pvs: PossibleValue[]) => pvs,
  onlyDefault: (pvs: PossibleValue[]) =>
    pvs.filter((pv) => !pv.recipe.alternate),
  onlyAlternate: (pvs: PossibleValue[]) =>
    pvs.filter((pv) => !pv.recipe.alternate),
};

function computeProductValue(
  recipe: Recipe,
  unknownSlug: string,
  unknownQty: number,
  values: Record<string, number>,
): number {
  const sign = recipe.ingredientLookup[unknownSlug] ? -1 : 1;
  const knownIngredientTotal = recipe.ingredients
    .filter((ing) => ing.part.slug !== unknownSlug)
    .reduce((sum, ing) => sum + ing.quantity * values[ing.part.slug], 0);
  const knownProductTotal = recipe.products
    .filter((p) => p.part.slug !== unknownSlug)
    .reduce((sum, p) => sum + p.quantity * values[p.part.slug], 0);

  return (sign * (knownIngredientTotal - knownProductTotal)) / unknownQty;
}

function iterativeCompute(
  values: Record<string, number>,
  combiner: Combiner,
  filter: ValueFilter,
): void {
  let progress = true;
  while (progress) {
    progress = false;
    const pending: { [slug: string]: PossibleValue[] } = {};

    for (const recipe of recipes) {
      if (recipe.slug.indexOf("burn-") === 0) continue; // don't use power recipes here
      if (recipe.isOreConversionRecipe()) continue;

      const unknowns = [...recipe.ingredients, ...recipe.products].filter(
        (p) => values[p.part.slug] === undefined,
      );
      if (unknowns.length !== 1) continue;

      const unknown = unknowns[0];
      const slug = unknown.part.slug;
      const value = computeProductValue(recipe, slug, unknown.quantity, values);
      if (value < 0) continue;

      if (!pending[slug]) pending[slug] = [];
      pending[slug].push({ slug, value, recipe });
    }

    for (const [slug, pvs] of Object.entries(pending)) {
      const filteredPvs = filter(pvs);
      if (filteredPvs.length === 0) continue;

      values[slug] = combiner(filteredPvs);
      progress = true;
    }
  }
}

export function computeDefaultPointValues(
  combiner: Combiner = combiners.min,
  filter: ValueFilter = filters.onlyDefault,
): Record<string, number> {
  const values: Record<string, number> = {};

  for (const [slug, limit] of Object.entries(defaultResourceLimits)) {
    values[slug] = POINT_RATE_CONSTANT / limit;
  }
  values.water = 0.1;

  iterativeCompute(values, combiner, filter);

  return values;
}

// After changing a set of slugs in `values`, recompute all parts whose default
// recipe transitively depends on any of those slugs.
function recomputeDownstream(
  values: Record<string, number>,
  changedSlugs: string[],
  combiner: Combiner = combiners.min,
  filter: ValueFilter = filters.onlyDefault,
): void {
  const ingredientToRecipes: { [slug: string]: Recipe[] } = {};
  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const slug = ingredient.part.slug;
      if (!ingredientToRecipes[slug]) ingredientToRecipes[slug] = [];
      ingredientToRecipes[slug].push(recipe);
    }
  }

  const changedSet = new Set(changedSlugs);
  const affected = new Set<string>();
  const queue = [...changedSlugs];
  while (queue.length > 0) {
    // biome-ignore lint/style/noNonNullAssertion: queue is guaranteed to be non-empty
    const slug = queue.shift()!;
    for (const recipe of ingredientToRecipes[slug] ?? []) {
      for (const product of recipe.products) {
        const productSlug = product.part.slug;
        if (!changedSet.has(productSlug) && !affected.has(productSlug)) {
          affected.add(productSlug);
          queue.push(productSlug);
        }
      }
    }
  }

  for (const slug of affected) {
    delete values[slug];
  }

  iterativeCompute(values, combiner, filter);
}

export function resolveEffectivePointValues(
  globalOverrides: Record<string, number>,
  factoryOverrides: Record<string, number>,
): Record<string, number> {
  const values = computeDefaultPointValues();

  if (Object.keys(globalOverrides).length > 0) {
    for (const [slug, v] of Object.entries(globalOverrides)) values[slug] = v;
    recomputeDownstream(values, Object.keys(globalOverrides));
    // Re-pin overridden slugs after downstream recompute.
    for (const [slug, v] of Object.entries(globalOverrides)) values[slug] = v;
  }

  if (Object.keys(factoryOverrides).length > 0) {
    for (const [slug, v] of Object.entries(factoryOverrides)) values[slug] = v;
    recomputeDownstream(values, Object.keys(factoryOverrides));
    for (const [slug, v] of Object.entries(factoryOverrides)) values[slug] = v;
  }

  return values;
}
