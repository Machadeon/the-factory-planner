import type Building from "./building";
import type { BuildingCategory } from "./building";
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
  // organic resources are not automatable so set the global limit to 0
  wood: 0,
  leaves: 0,
  mycelia: 0,
  "hog-remains": 0,
  "spitter-remains": 0,
  "stinger-remains": 0,
  "hatcher-remains": 0,
  "blue-power-slug": 0,
  "yellow-power-slug": 0,
  "purple-power-slug": 0,
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
    fuelValue: partData.energyValue,
  };

  parts.push(part);
  partLookup[part.className] = part;
  partSlugLookup[part.slug] = part;
}

const powerPart: Part = {
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

interface Generator {
  className: string;
  fuel: string[];
  powerProduction: number;
  powerProductionExponent: number;
  waterToPowerRatio: number;
}

const generatorLookup: { [className: string]: Generator } = {};
for (const generator of Object.values(data.generators)) {
  for (const fuel of generator.fuel) {
    generatorLookup[fuel] = generator;
  }
}

for (const fuel of parts.filter((p) => p.fuelValue > 0)) {
  const generator = generatorLookup[fuel.className];
  if (!generator) continue;

  const recipeTime = fuel.fuelValue / generator.powerProduction;
  const recipesPerMinute = 60 / recipeTime;
  const ingredients = [
    {
      part: fuel,
      quantity: recipesPerMinute,
    },
  ];

  if (generator.waterToPowerRatio > 0) {
    const waterNeeds = generator.powerProduction * generator.waterToPowerRatio;

    ingredients.push({
      part: partSlugLookup.water,
      quantity: waterNeeds,
    });
  }

  const ingredientsLookup: RecipePartLookup = {};
  for (const ingredient of ingredients) {
    ingredientsLookup[ingredient.part.slug] = ingredient.quantity;
  }

  const products = [
    {
      part: powerPart,
      quantity: generator.powerProduction,
    },
  ];

  if (fuel.slug === "uranium-fuel-rod") {
    products.push({
      part: partSlugLookup["uranium-waste"],
      quantity: 10, // per minute
    });
  } else if (fuel.slug === "plutonium-fuel-rod") {
    products.push({
      part: partSlugLookup["plutonium-waste"],
      quantity: 1, // per minute
    });
  }

  const productsLookup: RecipePartLookup = {};
  for (const product of products) {
    productsLookup[product.part.slug] = product.quantity;
  }

  const building = buildingLookup[generator.className];

  const recipe = new Recipe(
    `Burn ${fuel.name}`,
    `Burn_${fuel.className}`,
    `burn-${fuel.slug}`,
    ingredients,
    ingredientsLookup,
    products,
    productsLookup,
    building,
    recipeTime,
    false,
    false,
    building.unlockPhase, // TODO base on fuel's unlock phase instead of building's
  );

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
