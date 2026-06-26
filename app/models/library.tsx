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

const extraBuildingMetadata: Record<
  string,
  {
    somersloopSlots: number;
    unlockPhase: number;
    menuGroup: BuildingCategory;
    menuGroupIndex: number;
    size: { width: number; length: number; height: number };
  }
> = {
  constructor: {
    somersloopSlots: 1,
    unlockPhase: 1,
    menuGroup: "factory" as const,
    menuGroupIndex: 1,
    size: {
      width: 8,
      length: 10,
      height: 8,
    },
  },
  assembler: {
    somersloopSlots: 2,
    unlockPhase: 1,
    menuGroup: "factory" as const,
    menuGroupIndex: 2,
    size: {
      width: 9,
      length: 16,
      height: 11,
    },
  },
  manufacturer: {
    somersloopSlots: 4,
    unlockPhase: 3,
    menuGroup: "factory" as const,
    menuGroupIndex: 3,
    size: {
      width: 18,
      length: 20,
      height: 12,
    },
  },
  "quantum-encoder": {
    somersloopSlots: 4,
    unlockPhase: 5,
    menuGroup: "factory" as const,
    menuGroupIndex: 6,
    size: {
      width: 22,
      length: 50,
      height: 18,
    },
  },
  converter: {
    somersloopSlots: 2,
    unlockPhase: 5,
    menuGroup: "factory" as const,
    menuGroupIndex: 4,
    size: {
      width: 16,
      length: 16,
      height: 18,
    },
  },
  refinery: {
    somersloopSlots: 2,
    unlockPhase: 3,
    menuGroup: "refinery" as const,
    menuGroupIndex: 1,
    size: {
      width: 10,
      length: 22,
      height: 30,
    },
  },
  foundry: {
    somersloopSlots: 2,
    unlockPhase: 2,
    menuGroup: "smelter" as const,
    menuGroupIndex: 2,
    size: {
      width: 10,
      length: 9,
      height: 9,
    },
  },
  packager: {
    somersloopSlots: 0,
    unlockPhase: 3,
    menuGroup: "refinery" as const,
    menuGroupIndex: 3,
    size: {
      width: 8,
      length: 8,
      height: 12,
    },
  },
  "particle-accelerator": {
    somersloopSlots: 4,
    unlockPhase: 4,
    menuGroup: "factory" as const,
    menuGroupIndex: 5,
    size: {
      // We swapped width and length here compared to the wiki because our convention
      // is that inputs and outputs extend the effective length of the machine
      width: 38,
      length: 24,
      height: 32,
    },
  },
  blender: {
    somersloopSlots: 4,
    unlockPhase: 4,
    menuGroup: "refinery" as const,
    menuGroupIndex: 2,
    size: {
      width: 18,
      length: 16,
      height: 15,
    },
  },
  smelter: {
    somersloopSlots: 1,
    unlockPhase: 1,
    menuGroup: "smelter" as const,
    menuGroupIndex: 1,
    size: {
      width: 5,
      length: 10,
      height: 8.5,
    },
  },
  "coal-powered-generator": {
    somersloopSlots: 0,
    unlockPhase: 2,
    menuGroup: "generator" as const,
    menuGroupIndex: 2,
    size: {
      width: 10,
      length: 26,
      height: 36,
    },
  },
  "nuclear-power-plant": {
    somersloopSlots: 0,
    unlockPhase: 4,
    menuGroup: "generator" as const,
    menuGroupIndex: 4,
    size: {
      width: 36,
      length: 43,
      height: 39,
    },
  },
  "fuel-powered-generator": {
    somersloopSlots: 0,
    unlockPhase: 3,
    menuGroup: "generator" as const,
    menuGroupIndex: 3,
    size: {
      width: 20,
      length: 20,
      height: 27,
    },
  },
  "geothermal-generator": {
    somersloopSlots: 0,
    unlockPhase: 3,
    menuGroup: "generator" as const,
    menuGroupIndex: 5,
    size: {
      width: 19,
      length: 20,
      height: 34,
    },
  },
  "biomass-burner": {
    somersloopSlots: 0,
    unlockPhase: 1,
    menuGroup: "generator" as const,
    menuGroupIndex: 1,
    size: {
      width: 8,
      length: 8,
      height: 10,
    },
  },
};

for (const buildingData of Object.values(data.buildings)) {
  if (
    buildingData.metadata.manufacturingSpeed === 0 &&
    buildingData.className.indexOf("Desc_Generator") !== 0
  )
    continue;

  const building: Building = {
    name: buildingData.name,
    className: buildingData.className,
    description: buildingData.description,
    slug: buildingData.slug,
    iconSmall: `/images/items/${buildingData.icon}_64.png`,
    iconLarge: `/images/items/${buildingData.icon}_256.png`,
    basePowerUsage: buildingData.metadata.powerConsumption,
    ...extraBuildingMetadata[buildingData.slug],
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

const extraRecipeMetadata: Record<string, { unlockPhase: number }> = {
  "recipe-alternate-adheredironplate-c": { unlockPhase: 3 },
  "recipe-alternate-alcladcasing-c": { unlockPhase: 4 },
  "recipe-alternate-steelbeam-aluminum-c": { unlockPhase: 4 },
  "recipe-alternate-aluminumrod-c": { unlockPhase: 4 },
  "recipe-alternate-automatedminer-c": { unlockPhase: 2 },
  "recipe-alternate-highspeedwiring-c": { unlockPhase: 2 },
  "recipe-alternate-ironingot-basic-c": { unlockPhase: 2 },
  "recipe-alternate-boltedframe-c": { unlockPhase: 1 },
  "recipe-alternate-reinforcedironplate-1-c": { unlockPhase: 1 },
  "recipe-alternate-screw-c": { unlockPhase: 1 },
  "recipe-alternate-circuitboard-2-c": { unlockPhase: 3 },
  "recipe-alternate-computer-1-c": { unlockPhase: 3 },
  "recipe-alternate-wire-2-c": { unlockPhase: 1 },
  "recipe-alternate-silica-c": { unlockPhase: 1 },
  "recipe-alternate-classicbattery-c": { unlockPhase: 4 },
  "recipe-alternate-diamond-cloudy-c": { unlockPhase: 5 },
  "recipe-alternate-coatedcable-c": { unlockPhase: 3 },
  "recipe-alternate-coatedironcanister-c": { unlockPhase: 3 },
  "recipe-alternate-coatedironplate-c": { unlockPhase: 3 },
  "recipe-alternate-cokesteelingot-c": { unlockPhase: 3 },
  "recipe-alternate-ingotsteel-2-c": { unlockPhase: 2 },
  "recipe-alternate-coolingdevice-c": { unlockPhase: 4 },
  "recipe-alternate-copperalloyingot-c": { unlockPhase: 2 },
  "recipe-alternate-copperrotor-c": { unlockPhase: 1 },
  "recipe-alternate-computer-2-c": { unlockPhase: 3 },
  "recipe-alternate-darkmatter-crystallization-c": { unlockPhase: 5 },
  "recipe-alternate-darkmatter-trap-c": { unlockPhase: 5 },
  "recipe-alternate-ionizedfuel-dark-c": { unlockPhase: 5 },
  "recipe-alternate-dilutedfuel-c": { unlockPhase: 4 },
  "recipe-alternate-dilutedpackagedfuel-c": { unlockPhase: 3 },
  "recipe-alternate-silica-distilled-c": { unlockPhase: 4 },
  "recipe-alternate-electricmotor-c": { unlockPhase: 4 },
  "recipe-alternate-electroaluminumscrap-c": { unlockPhase: 4 },
  "recipe-alternate-electrodecircuitboard-c": { unlockPhase: 3 },
  "recipe-alternate-electromagneticcontrolrod-1-c": { unlockPhase: 4 },
  "recipe-alternate-encasedindustrialbeam-c": { unlockPhase: 2 },
  "recipe-alternate-fertileuranium-c": { unlockPhase: 4 },
  "recipe-alternate-gunpowder-1-c": { unlockPhase: 1 },
  "recipe-alternate-concrete-c": { unlockPhase: 1 },
  "recipe-alternate-flexibleframework-c": { unlockPhase: 3 },
  "recipe-alternate-quartz-fused-c": { unlockPhase: 2 },
  "recipe-alternate-quickwire-c": { unlockPhase: 1 },
  "recipe-alternate-fusedwire-c": { unlockPhase: 1 },
  "recipe-alternate-heatsink-1-c": { unlockPhase: 4 },
  "recipe-alternate-heatfusedframe-c": { unlockPhase: 4 },
  "recipe-alternate-modularframeheavy-c": { unlockPhase: 3 },
  "recipe-alternate-heavyflexibleframe-c": { unlockPhase: 3 },
  "recipe-alternate-heavyoilresidue-c": { unlockPhase: 3 },
  "recipe-alternate-uraniumcell-1-c": { unlockPhase: 4 },
  "recipe-alternate-instantplutoniumcell-c": { unlockPhase: 4 },
  "recipe-alternate-instantscrap-c": { unlockPhase: 4 },
  "recipe-alternate-cable-1-c": { unlockPhase: 3 },
  "recipe-alternate-crystaloscillator-c": { unlockPhase: 3 },
  "recipe-alternate-ingotiron-c": { unlockPhase: 2 },
  "recipe-alternate-steelpipe-iron-c": { unlockPhase: 2 },
  "recipe-alternate-wire-1-c": { unlockPhase: 1 },
  "recipe-alternate-cateriumingot-leached-c": { unlockPhase: 4 },
  "recipe-alternate-copperingot-leached-c": { unlockPhase: 4 },
  "recipe-alternate-ironingot-leached-c": { unlockPhase: 4 },
  "recipe-alternate-steelbeam-molded-c": { unlockPhase: 2 },
  "recipe-alternate-steelpipe-molded-c": { unlockPhase: 2 },
  "recipe-alternate-rocketfuel-nitro-c": { unlockPhase: 4 },
  "recipe-alternate-ocsupercomputer-c": { unlockPhase: 4 },
  "recipe-alternate-diamond-oilbased-c": { unlockPhase: 5 },
  "recipe-alternate-diamond-petroleum-c": { unlockPhase: 5 },
  "recipe-alternate-diamond-pink-c": { unlockPhase: 5 },
  "recipe-alternate-ailimiter-plastic-c": { unlockPhase: 3 },
  "recipe-alternate-plasticsmartplating-c": { unlockPhase: 3 },
  "recipe-alternate-plutoniumfuelunit-c": { unlockPhase: 4 },
  "recipe-alternate-polymerresin-c": { unlockPhase: 3 },
  "recipe-purealuminumingot-c": { unlockPhase: 4 },
  "recipe-alternate-purecateriumingot-c": { unlockPhase: 3 },
  "recipe-alternate-purecopperingot-c": { unlockPhase: 3 },
  "recipe-alternate-pureironingot-c": { unlockPhase: 3 },
  "recipe-alternate-purequartzcrystal-c": { unlockPhase: 3 },
  "recipe-alternate-quartz-purified-c": { unlockPhase: 4 },
  "recipe-alternate-cable-2-c": { unlockPhase: 3 },
  "recipe-alternate-stator-c": { unlockPhase: 2 },
  "recipe-alternate-radiocontrolunit-1-c": { unlockPhase: 4 },
  "recipe-alternate-radiocontrolsystem-c": { unlockPhase: 4 },
  "recipe-alternate-plastic-1-c": { unlockPhase: 3 },
  "recipe-alternate-recycledrubber-c": { unlockPhase: 3 },
  "recipe-alternate-motor-1-c": { unlockPhase: 2 },
  "recipe-alternate-rubberconcrete-c": { unlockPhase: 3 },
  "recipe-alternate-circuitboard-1-c": { unlockPhase: 3 },
  "recipe-alternate-highspeedconnector-c": { unlockPhase: 3 },
  "recipe-alternate-sloppyalumina-c": { unlockPhase: 4 },
  "recipe-alternate-ingotsteel-1-c": { unlockPhase: 2 },
  "recipe-alternate-steamedcoppersheet-c": { unlockPhase: 2 },
  "recipe-alternate-steelcanister-c": { unlockPhase: 3 },
  "recipe-alternate-steelcastedplate-c": { unlockPhase: 2 },
  "recipe-alternate-steelrod-c": { unlockPhase: 2 },
  "recipe-alternate-rotor-c": { unlockPhase: 2 },
  "recipe-alternate-screw-2-c": { unlockPhase: 2 },
  "recipe-alternate-modularframe-c": { unlockPhase: 2 },
  "recipe-alternate-reinforcedironplate-2-c": { unlockPhase: 1 },
  "recipe-alternate-superstatecomputer-c": { unlockPhase: 4 },
  "recipe-alternate-cateriumingot-tempered-c": { unlockPhase: 3 },
  "recipe-alternate-copperingot-tempered-c": { unlockPhase: 3 },
  "recipe-alternate-turboblendfuel-c": { unlockPhase: 4 },
  "recipe-alternate-diamond-turbo-c": { unlockPhase: 5 },
  "recipe-alternate-turbomotor-1-c": { unlockPhase: 4 },
  "recipe-alternate-turboheavyfuel-c": { unlockPhase: 3 },
  "recipe-alternate-turbopressuremotor-c": { unlockPhase: 4 },
  "recipe-alternate-nuclearfuelrod-1-c": { unlockPhase: 4 },
  "recipe-alternate-wetconcrete-c": { unlockPhase: 2 },
  "recipe-ingotiron-c": { unlockPhase: 1 },
  "recipe-ironplate-c": { unlockPhase: 1 },
  "recipe-ironrod-c": { unlockPhase: 1 },
  "recipe-ingotcopper-c": { unlockPhase: 1 },
  "recipe-wire-c": { unlockPhase: 1 },
  "recipe-cable-c": { unlockPhase: 1 },
  "recipe-concrete-c": { unlockPhase: 1 },
  "recipe-screw-c": { unlockPhase: 1 },
  "recipe-ironplatereinforced-c": { unlockPhase: 1 },
  "recipe-biomass-leaves-c": { unlockPhase: 1 },
  "recipe-coppersheet-c": { unlockPhase: 1 },
  "recipe-rotor-c": { unlockPhase: 1 },
  "recipe-modularframe-c": { unlockPhase: 1 },
  "recipe-spaceelevatorpart-1-c": { unlockPhase: 1 },
  "recipe-biofuel-c": { unlockPhase: 1 },
  "recipe-ingotsteel-c": { unlockPhase: 2 },
  "recipe-steelbeam-c": { unlockPhase: 2 },
  "recipe-steelpipe-c": { unlockPhase: 2 },
  "recipe-spaceelevatorpart-2-c": { unlockPhase: 2 },
  "recipe-encasedindustrialbeam-c": { unlockPhase: 2 },
  "recipe-stator-c": { unlockPhase: 2 },
  "recipe-motor-c": { unlockPhase: 2 },
  "recipe-spaceelevatorpart-3-c": { unlockPhase: 2 },
  "recipe-plastic-c": { unlockPhase: 3 },
  "recipe-rubber-c": { unlockPhase: 3 },
  "recipe-liquidfuel-c": { unlockPhase: 3 },
  "recipe-petroleumcoke-c": { unlockPhase: 3 },
  "recipe-circuitboard-c": { unlockPhase: 3 },
  "recipe-fluidcanister-c": { unlockPhase: 3 },
  "recipe-packagedwater-c": { unlockPhase: 3 },
  "recipe-packagedcrudeoil-c": { unlockPhase: 3 },
  "recipe-fuel-c": { unlockPhase: 3 },
  "recipe-packagedoilresidue-c": { unlockPhase: 3 },
  "recipe-packagedbiofuel-c": { unlockPhase: 3 },
  "recipe-liquidbiofuel-c": { unlockPhase: 3 },
  "recipe-computer-c": { unlockPhase: 3 },
  "recipe-modularframeheavy-c": { unlockPhase: 3 },
  "recipe-spaceelevatorpart-4-c": { unlockPhase: 3 },
  "recipe-spaceelevatorpart-5-c": { unlockPhase: 3 },
  "recipe-aluminasolution-c": { unlockPhase: 4 },
  "recipe-packagedalumina-c": { unlockPhase: 4 },
  "recipe-aluminumscrap-c": { unlockPhase: 4 },
  "recipe-ingotaluminum-c": { unlockPhase: 4 },
  "recipe-aluminumsheet-c": { unlockPhase: 4 },
  "recipe-aluminumcasing-c": { unlockPhase: 4 },
  "recipe-filterhazmat-c": { unlockPhase: 4 },
  "recipe-sulfuricacid-c": { unlockPhase: 4 },
  "recipe-packagedsulfuricacid-c": { unlockPhase: 4 },
  "recipe-battery-c": { unlockPhase: 4 },
  "recipe-radiocontrolunit-c": { unlockPhase: 4 },
  "recipe-computersuper-c": { unlockPhase: 4 },
  "recipe-spaceelevatorpart-7-c": { unlockPhase: 4 },
  "recipe-uraniumcell-c": { unlockPhase: 4 },
  "recipe-electromagneticcontrolrod-c": { unlockPhase: 4 },
  "recipe-nuclearfuelrod-c": { unlockPhase: 4 },
  "recipe-spaceelevatorpart-6-c": { unlockPhase: 4 },
  "recipe-gastank-c": { unlockPhase: 4 },
  "recipe-packagednitrogen-c": { unlockPhase: 4 },
  "recipe-heatsink-c": { unlockPhase: 4 },
  "recipe-coolingsystem-c": { unlockPhase: 4 },
  "recipe-fusedmodularframe-c": { unlockPhase: 4 },
  "recipe-motorturbo-c": { unlockPhase: 4 },
  "recipe-spaceelevatorpart-8-c": { unlockPhase: 4 },
  "recipe-nitricacid-c": { unlockPhase: 4 },
  "recipe-packagednitricacid-c": { unlockPhase: 4 },
  "recipe-nonfissileuranium-c": { unlockPhase: 4 },
  "recipe-plutonium-c": { unlockPhase: 4 },
  "recipe-plutoniumcell-c": { unlockPhase: 4 },
  "recipe-plutoniumfuelrod-c": { unlockPhase: 4 },
  "recipe-copperdust-c": { unlockPhase: 4 },
  "recipe-pressureconversioncube-c": { unlockPhase: 4 },
  "recipe-spaceelevatorpart-9-c": { unlockPhase: 4 },
  "recipe-diamond-c": { unlockPhase: 5 },
  "recipe-timecrystal-c": { unlockPhase: 5 },
  "recipe-ficsiteingot-iron-c": { unlockPhase: 5 },
  "recipe-ficsitemesh-c": { unlockPhase: 5 },
  "recipe-ingotsam-c": { unlockPhase: 5 },
  "recipe-samfluctuator-c": { unlockPhase: 5 },
  "recipe-spaceelevatorpart-10-c": { unlockPhase: 5 },
  "recipe-quantumenergy-c": { unlockPhase: 5 },
  "recipe-darkenergy-c": { unlockPhase: 5 },
  "recipe-darkmatter-c": { unlockPhase: 5 },
  "recipe-superpositionoscillator-c": { unlockPhase: 5 },
  "recipe-temporalprocessor-c": { unlockPhase: 5 },
  "recipe-spaceelevatorpart-12-c": { unlockPhase: 5 },
  "recipe-singularitycell-c": { unlockPhase: 5 },
  "recipe-spaceelevatorpart-11-c": { unlockPhase: 5 },
  "recipe-ficsonium-c": { unlockPhase: 5 },
  "recipe-ficsoniumfuelrod-c": { unlockPhase: 5 },
};

for (const recipeData of Object.values(data.recipes)) {
  if (!recipeData.inMachine) continue;

  const additionalData = extraRecipeMetadata[recipeData.slug];

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
    additionalData.unlockPhase,
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

  const building = buildingLookup[generator.className];

  const recipe = new Recipe(
    `Burn ${fuel.name}`,
    `Burn_${fuel.className}`,
    `burn-${fuel.slug}`,
    ingredients,
    ingredientsLookup,
    [
      {
        part: powerPart,
        quantity: generator.powerProduction,
      },
    ],
    { [powerPart.slug]: fuel.fuelValue },
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
