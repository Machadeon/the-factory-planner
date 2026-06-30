import { defaultResourceLimits, parts, recipeLookup } from "./library";
import type Recipe from "./recipe";

export const POINT_RATE_CONSTANT = Math.max(
  ...Object.values(defaultResourceLimits),
);

function defaultRecipeFor(slug: string): Recipe | undefined {
  const options = recipeLookup[slug];
  if (!options || options.length === 0) return undefined;
  return options.find((r) => !r.alternate) ?? options[0];
}

// Recursive DFS: compute point value for a part slug.
// inProgress guards against cycles (returns 0 for cyclic parts).
function getValue(
  slug: string,
  computed: Record<string, number>,
  inProgress: Set<string>,
): number {
  if (slug in computed) return computed[slug];
  if (inProgress.has(slug)) return 0;

  inProgress.add(slug);

  const recipe = defaultRecipeFor(slug);
  if (!recipe) {
    computed[slug] = 0;
  } else {
    let totalInput = 0;
    for (const ing of recipe.ingredients) {
      totalInput +=
        ing.quantity * getValue(ing.part.slug, computed, inProgress);
    }
    const totalOutput = recipe.products.reduce((s, p) => s + p.quantity, 0);
    const perUnit = totalOutput > 0 ? totalInput / totalOutput : 0;
    // Write perUnit to all products of this recipe. A co-product with its own
    // primary recipe may overwrite this later in the outer loop.
    for (const prod of recipe.products) {
      computed[prod.part.slug] = perUnit;
    }
  }

  inProgress.delete(slug);
  return computed[slug] ?? 0;
}

export function computeDefaultPointValues(): Record<string, number> {
  const values: Record<string, number> = {};

  // Seed raw resources.
  for (const [slug, limit] of Object.entries(defaultResourceLimits)) {
    values[slug] = POINT_RATE_CONSTANT / limit;
  }

  // Seed water to always be 0.1.
  values.water = 0.1;

  // Propagate through recipe graph via DFS.
  const inProgress = new Set<string>();
  for (const part of parts) {
    getValue(part.slug, values, inProgress);
  }

  return values;
}

// After changing a set of slugs in `values`, recompute all parts whose default
// recipe transitively depends on any of those slugs.
function recomputeDownstream(
  values: Record<string, number>,
  changedSlugs: string[],
): void {
  // Build reverse map: ingredient slug → set of part slugs that use it as input.
  const dependents: Record<string, Set<string>> = {};
  for (const part of parts) {
    const recipe = defaultRecipeFor(part.slug);
    if (!recipe) continue;
    for (const ing of recipe.ingredients) {
      if (!dependents[ing.part.slug]) dependents[ing.part.slug] = new Set();
      dependents[ing.part.slug].add(part.slug);
    }
  }

  // BFS from changed slugs through dependents.
  const queue = [...changedSlugs];
  const queued = new Set(changedSlugs);
  while (queue.length > 0) {
    // biome-ignore lint/style/noNonNullAssertion: queue.length > 0 guard above
    const slug = queue.shift()!;
    for (const dep of dependents[slug] ?? []) {
      const recipe = defaultRecipeFor(dep);
      if (recipe) {
        let totalInput = 0;
        let totalOutput = 0;
        for (const ing of recipe.ingredients)
          totalInput += ing.quantity * (values[ing.part.slug] ?? 0);
        for (const prod of recipe.products) totalOutput += prod.quantity;
        const perUnit = totalOutput > 0 ? totalInput / totalOutput : 0;
        for (const prod of recipe.products) {
          values[prod.part.slug] = perUnit;
          // Co-products with their own primary recipe are not in dependents[slug]
          // and would miss downstream propagation — enqueue them explicitly.
          if (prod.part.slug !== dep && !queued.has(prod.part.slug)) {
            queued.add(prod.part.slug);
            queue.push(prod.part.slug);
          }
        }
      }
      if (!queued.has(dep)) {
        queued.add(dep);
        queue.push(dep);
      }
    }
  }
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
