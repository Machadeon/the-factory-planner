"use client";

import EastIcon from "@mui/icons-material/East";
import Image from "next/image";
import type AssemblyLine from "../models/assembly-line";
import type Factory from "../models/factory";
import { recipeLookup } from "../models/library";
import type Part from "../models/part";
import type Recipe from "../models/recipe";
import type { RecipePart } from "../models/recipe";
import { displayNum } from "../utils";
import RecipeComponent from "./RecipeComponent";
import TextCalculatorField from "./TextCalculatorField";

interface AssemblyLineComponentProps {
  assemblyLine: AssemblyLine;
  mainPart: Part;
  factory: Factory;
}

function NestedFactoryRow({
  assemblyLine,
  factory,
}: {
  assemblyLine: AssemblyLine;
  factory: Factory;
}) {
  const recipe = assemblyLine.recipe;
  const rate = assemblyLine.rate;

  function updateRate(newRate: number) {
    assemblyLine.rate = newRate;
    factory.update();
  }

  return (
    <div className="sp-recipe-component flex flex-row grow items-center gap-x-2 p-2">
      <span className="w-3xs font-medium">{recipe.name}</span>
      <div className="flex items-center gap-x-1">
        <TextCalculatorField
          variant="outlined"
          size="small"
          label="Instances"
          className="w-28"
          value={rate}
          onCalculate={updateRate}
          slotProps={{ htmlInput: { className: "text-right" } }}
        />
      </div>
      <div className="w-2xs flex flex-row flex-wrap gap-x-2 items-center">
        {recipe.ingredients.map((ing) => (
          <span key={ing.part.slug} className="flex items-center gap-x-1">
            <Image
              src={ing.part.iconSmall}
              alt={ing.part.name}
              width={24}
              height={24}
            />
            {displayNum(ing.quantity * rate)}/min
          </span>
        ))}
      </div>
      <EastIcon />
      <div className="w-2xs flex flex-row flex-wrap gap-x-2 items-center">
        {recipe.products.map((prod) => (
          <span key={prod.part.slug} className="flex items-center gap-x-1">
            <Image
              src={prod.part.iconSmall}
              alt={prod.part.name}
              width={24}
              height={24}
            />
            {displayNum(prod.quantity * rate)}/min
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AssemblyLineComponent(
  props: AssemblyLineComponentProps,
) {
  if (props.assemblyLine.recipe.isFactoryRecipe) {
    return (
      <NestedFactoryRow
        assemblyLine={props.assemblyLine}
        factory={props.factory}
      />
    );
  }

  const recipe = props.assemblyLine.recipe as Recipe;

  function adjustProductionRate(
    recipePart: RecipePart,
    isProduct: boolean,
    newValue: number,
  ) {
    if (isProduct)
      props.assemblyLine.setPartProductionRate(recipePart.part, newValue);
    else props.assemblyLine.setPartConsumptionRate(recipePart.part, newValue);
    props.factory.update();
  }

  const allOutputs = props.factory.recipeOutputs().map((part) => part.slug);
  const partsNeeded = recipe.ingredients
    .map((ing) => ing.part.slug)
    .filter(
      (partSlug) =>
        allOutputs.indexOf(partSlug) < 0 &&
        Object.hasOwn(recipeLookup, partSlug),
    );

  function setSlooped(slooped: boolean) {
    props.assemblyLine.setSlooped(slooped);
    props.factory.update();
  }

  return (
    <RecipeComponent
      recipe={recipe}
      rate={props.assemblyLine.rate}
      slooped={props.assemblyLine.isSlooped()}
      setPartRate={adjustProductionRate}
      partRateEditable={recipeLookup[props.mainPart.slug].length > 1}
      partsNeeded={partsNeeded}
      factory={props.factory}
      onSloopChange={setSlooped}
    />
  );
}
