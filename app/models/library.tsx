import type Building from "./building";
import data from "./data.json";
import type Part from "./part";
import type Recipe from "./recipe";
import type { RecipePart } from "./recipe";

export const parts: Part[] = [];
export const partLookup: { [className: string]: Part } = {};
export const buildings: Building[] = [];
export const buildingLookup: { [className: string]: Building } = {};
export const recipes: Recipe[] = [];
export const recipeLookup: { [partSlug: string]: Recipe[] } = {};

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
  };

  parts.push(part);
  partLookup[part.className] = part;
}

for (const buildingData of Object.values(data.buildings)) {
  if (buildingData.metadata.manufacturingSpeed === 0) continue;

  const building: Building = {
    name: buildingData.name,
    className: buildingData.className,
    description: buildingData.description,
    slug: buildingData.slug,
    iconSmall: `/images/items/${buildingData.icon}_64.png`,
    iconLarge: `/images/items/${buildingData.icon}_256.png`,
    basePowerUsage: buildingData.metadata.powerConsumption,
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

for (const recipeData of Object.values(data.recipes)) {
  if (!recipeData.inMachine) continue;

  const recipe: Recipe = {
    name: recipeData.name,
    className: recipeData.className,
    slug: recipeData.slug,
    ingredients: recipeData.ingredients.map<RecipePart>(ingredientToRecipePart),
    products: recipeData.products.map<RecipePart>(ingredientToRecipePart),
    building: buildingLookup[recipeData.producedIn[0]],
    processingTime: recipeData.time,
    customPowerUsage: recipeData.isVariablePower,
  };

  if (recipeData.isVariablePower) {
    recipe.minPowerUsage = recipeData.minPower;
    recipe.maxPowerUsage = recipeData.maxPower;
  }

  recipes.push(recipe);

  for (const product of recipe.products) {
    const slug = product.part.slug;
    if (recipeLookup[slug]) {
      recipeLookup[slug] = [...recipeLookup[slug], recipe];
    } else {
      recipeLookup[slug] = [recipe];
    }
  }
}
