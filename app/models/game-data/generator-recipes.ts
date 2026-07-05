import data from "../data.json";
import type { RecipePartLookup } from "../recipe";
import Recipe from "../recipe";
import {
  buildingLookup,
  partSlugLookup,
  parts,
  powerPart,
  registerRecipe,
} from "./load";

interface Generator {
  className: string;
  fuel: string[];
  powerProduction: number;
  powerProductionExponent: number;
  waterPerMinute: number;
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

  const powerPerMinute = generator.powerProduction * 60; // MJ/min
  const fuelPerMinute = powerPerMinute / fuel.fuelValue; // fuel/min = MJ/min / MJ/fuel

  const recipeTime = 60 / fuelPerMinute; // sec/fuel
  const ingredients = [
    {
      part: fuel,
      quantity: 1,
    },
  ];

  if (generator.waterPerMinute > 0) {
    const waterNeeds = generator.waterPerMinute / fuelPerMinute;

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
      quantity: fuel.fuelValue / 60, // convert from MJ/min to MW
    },
  ];

  if (fuel.slug === "uranium-fuel-rod") {
    products.push({
      part: partSlugLookup["uranium-waste"],
      quantity: 50,
    });
  } else if (fuel.slug === "plutonium-fuel-rod") {
    products.push({
      part: partSlugLookup["plutonium-waste"],
      quantity: 5,
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

  registerRecipe(recipe);
}
