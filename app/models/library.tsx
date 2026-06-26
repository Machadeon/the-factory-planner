import type Building from "./building";
import data from "./data.json";
import type Part from "./part";
import type { RecipePart, RecipePartLookup } from "./recipe";
import Recipe from "./recipe";

export const parts: Part[] = [];
export const partLookup: { [className: string]: Part } = {};
export const partSlugLookup: { [partSlug: string]: Part } = {};
export const buildings: Building[] = [];
export const buildingLookup: { [className: string]: Building } = {};
export const recipes: Recipe[] = [];
export const recipeLookup: { [partSlug: string]: Recipe[] } = {};

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
  };

  parts.push(part);
  partLookup[part.className] = part;
  partSlugLookup[part.slug] = part;
}

parts.sort((a, b) => a.name.localeCompare(b.name));

// somersloop slot counts per building slug.
const somersloopSlots: Record<string, number> = {
  constructor: 1,
  assembler: 2,
  manufacturer: 4,
  "quantum-encoder": 4,
  converter: 2,
  refinery: 2,
  foundry: 2,
  packager: 0,
  "particle-accelerator": 4,
  blender: 4,
  smelter: 1,
};

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
    maxSomersloops: somersloopSlots[buildingData.slug] ?? 0,
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
  if (!recipeData.inMachine) continue;

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
  );

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
