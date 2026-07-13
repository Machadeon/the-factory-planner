import type Building from "../building";
import type { BuildingCategory } from "../building";
import data from "../data.json";
import type Part from "../part";
import type { RecipePart, RecipePartLookup } from "../recipe";
import Recipe from "../recipe";
import { rawResources } from "./constants";

export const parts: Part[] = [];
/** @public game-data barrel export, spec-pinned (game-data R2) — kept despite no current consumer. */
export const partLookup: { [className: string]: Part } = {};
export const partSlugLookup: { [partSlug: string]: Part } = {};
export const buildings: Building[] = [];
/** @public game-data barrel export, spec-pinned (game-data R2) — kept despite no current consumer. */
export const buildingLookup: { [className: string]: Building } = {};
export const recipes: Recipe[] = [];
export const recipeLookup: { [partSlug: string]: Recipe[] } = {};
export const recipeSlugLookup: { [recipeSlug: string]: Recipe } = {};

export function registerRecipe(recipe: Recipe): void {
  recipes.push(recipe);
  for (const product of recipe.products) {
    const slug = product.part.slug;
    if (recipeLookup[slug]) {
      recipeLookup[slug] = [...recipeLookup[slug], recipe];
    } else {
      recipeLookup[slug] = [recipe];
    }
  }
  recipeSlugLookup[recipe.slug] = recipe;
}

for (const partData of Object.values(data.items)) {
  const part: Part = {
    name: partData.name,
    className: partData.className,
    slug: partData.slug,
    iconSmall: `/images/items/${partData.icon}_64.png`,
    iconLarge: `/images/items/${partData.icon}_256.png`,
    fluid: partData.liquid,
    gas: false,
    description: partData.description,
    stackSize: partData.stackSize,
    sinkPoints: partData.sinkPoints,
    sinkable: partData.sinkPoints > 0,
    color: `rgba(${partData.fluidColor.r}, ${partData.fluidColor.g}, ${partData.fluidColor.b}, ${partData.fluidColor.a})`,
    isRawResource: rawResources.indexOf(partData.slug) >= 0,
    fuelValue: partData.energyValue,
  };

  parts.push(part);
  partLookup[part.className] = part;
  partSlugLookup[part.slug] = part;
}

export const powerPart: Part = {
  name: "Power",
  className: "Power",
  slug: "power",
  iconSmall: "/images/items/power_192.png",
  iconLarge: "/images/items/power_192.png",
  fluid: false,
  gas: false,
  description: "Power (MW)",
  stackSize: 100,
  sinkPoints: 0,
  sinkable: false,
  color: `rgba(255,255,255,0)`,
  isRawResource: false,
  fuelValue: 0,
};
parts.push(powerPart);
partLookup.Power = powerPart;
partSlugLookup.power = powerPart;

parts.sort((a, b) => a.name.localeCompare(b.name));

for (const buildingData of Object.values(data.buildings)) {
  const building: Building = {
    name: buildingData.name,
    className: buildingData.className,
    description: buildingData.description,
    slug: buildingData.slug,
    iconSmall: `/images/items/${buildingData.icon}_64.png`,
    iconLarge: `/images/items/${buildingData.icon}_256.png`,
    basePowerUsage: buildingData.metadata.powerConsumption,
    somersloopSlots: buildingData.somersloopSlots,
    unlockPhase: buildingData.unlockPhase,
    menuGroup: buildingData.menuGroup as BuildingCategory,
    menuGroupIndex: buildingData.menuGroupIndex,
    size: buildingData.size,
  };

  buildings.push(building);
  buildingLookup[building.className] = building;
}

function ingredientToRecipePart(ingredient: {
  item: string;
  amount: number;
}): RecipePart {
  return {
    part: partLookup[ingredient.item],
    quantity: ingredient.amount,
  };
}

function ingredientsToRecipePartLookup(
  ingredients: { item: string; amount: number }[],
): RecipePartLookup {
  const lookup: RecipePartLookup = {};
  for (const ingredient of ingredients) {
    const part = partLookup[ingredient.item];
    lookup[part.slug] = ingredient.amount;
  }

  return lookup;
}

for (const recipeData of Object.values(data.recipes)) {
  const recipe = new Recipe(
    recipeData.name,
    recipeData.className,
    recipeData.slug,
    recipeData.ingredients.map<RecipePart>(ingredientToRecipePart),
    ingredientsToRecipePartLookup(recipeData.ingredients),
    recipeData.products.map<RecipePart>(ingredientToRecipePart),
    ingredientsToRecipePartLookup(recipeData.products),
    buildingLookup[recipeData.producedIn[0]],
    recipeData.time,
    recipeData.isVariablePower,
    recipeData.alternate,
    recipeData.unlockPhase,
  );

  if (recipeData.isVariablePower) {
    recipe.minPowerUsage = recipeData.minPower;
    recipe.maxPowerUsage = recipeData.maxPower;
  }

  registerRecipe(recipe);
}
