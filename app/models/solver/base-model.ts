import type {
  ConstraintBound,
  ModelDefinition,
  VariableCoefficients,
} from "javascript-lp-solver";
import type { PartConstraint } from "../factory";
import { defaultResourceLimits, notAutomatable } from "../game-data";
import type { RecipeLike } from "../recipe-like";

export function mergeConstraint(
  constraints: Record<string, ConstraintBound>,
  slug: string,
  desired: ConstraintBound,
) {
  const existing = constraints[slug];
  if (existing === undefined) {
    constraints[slug] = desired;
    return;
  }

  if (
    existing.equal !== undefined &&
    desired.equal !== undefined &&
    existing.equal !== desired.equal
  ) {
    console.warn(
      `Tried to merge conflicting constraints for ${slug}: existing:`,
      existing,
      "desired:",
      desired,
    );
    return;
  }

  if (existing.equal !== undefined && desired.equal === undefined) return;
  if (desired.equal !== undefined) {
    constraints[slug] = desired;
    return;
  }

  if (
    desired.min !== undefined &&
    (existing.min === undefined || existing.min < desired.min)
  )
    existing.min = desired.min;
  if (
    desired.max !== undefined &&
    (existing.max === undefined || existing.max > desired.max)
  )
    existing.max = desired.max;
}

export function createBaseModel(
  recipes: RecipeLike[],
  factoryConstraints: PartConstraint[],
): ModelDefinition {
  const constraints: Record<string, ConstraintBound> = {};
  const variables: Record<string, VariableCoefficients> = {};

  for (const [resource, limit] of Object.entries(defaultResourceLimits)) {
    if (limit === 0) {
      // min: 0 means there cannot be a net consumption of these resources, and no recipe
      // produces them so this effectively locks these resources out of any automated solver
      constraints[resource] = { min: 0 };
      continue;
    }

    const rawSlug = `_raw_${resource}`;
    constraints[rawSlug] = { max: limit };
    constraints[resource] = { min: 0 };
    variables[rawSlug] = { [rawSlug]: 1, [resource]: 1 };
  }

  for (const slug of notAutomatable) {
    constraints[slug] = { min: 0 };
  }

  // Overlay factory constraints
  for (const { partSlug, ...desired } of factoryConstraints) {
    const rawSlug = `_raw_${partSlug}`;
    if (constraints[rawSlug]) {
      mergeConstraint(constraints, rawSlug, desired);
    } else {
      mergeConstraint(constraints, partSlug, desired);
    }
  }

  // fill recipes
  const recipeInputs = new Set<string>();
  const recipeOutputs = new Set<string>();
  // A factory-as-recipe represents whole copies of a physical sub-factory, so its
  // completions/min must be integer. Mark those variables for the MILP solver.
  const ints: Record<string, 1> = {};

  for (const recipe of recipes) {
    // TODO fix for factories as recipes
    const coefficients: VariableCoefficients = {};
    for (const ingredient of recipe.ingredients) {
      coefficients[ingredient.part.slug] =
        (coefficients[ingredient.part.slug] ?? 0) - ingredient.quantity;

      recipeInputs.add(ingredient.part.slug);
    }

    for (const product of recipe.products) {
      coefficients[product.part.slug] =
        (coefficients[product.part.slug] ?? 0) + product.quantity;

      recipeOutputs.add(product.part.slug);
    }

    variables[recipe.slug] = coefficients;
    if (recipe.isFactoryRecipe) ints[recipe.slug] = 1;
  }

  // set constraints on intermediate parts
  for (const slug of recipeInputs.intersection(recipeOutputs)) {
    if (constraints[slug] !== undefined) {
      if (constraints[slug].equal) continue;
      constraints[slug].min = 0;
    } else if (slug !== "water") {
      constraints[slug] = { min: 0 };
    }
  }

  // create model
  const model: ModelDefinition = {
    constraints,
    variables,
    optimize: "_obj",
  };

  if (Object.keys(ints).length > 0) {
    (model as ModelDefinition & { ints: Record<string, 1> }).ints = ints;
  }

  return model;
}
