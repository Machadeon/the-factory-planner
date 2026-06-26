"use client";

import type AssemblyLine from "../models/assembly-line";
import type Factory from "../models/factory";
import { recipeLookup } from "../models/library";
import type Part from "../models/part";
import type Recipe from "../models/recipe";
import type { RecipePart } from "../models/recipe";
import AssemblyLineControls from "./AssemblyLineControls";
import NestedFactoryRow from "./NestedFactoryRow";
import RecipeComponent from "./RecipeComponent";

interface AssemblyLineComponentProps {
  assemblyLine: AssemblyLine;
  mainPart: Part;
  factory: Factory;
  onNavigateToFactory?: (id: string) => void;
}

export default function AssemblyLineComponent(
  props: AssemblyLineComponentProps,
) {
  if (props.assemblyLine.recipe.isFactoryRecipe) {
    return (
      <NestedFactoryRow
        assemblyLine={props.assemblyLine}
        factory={props.factory}
        onNavigateToFactory={props.onNavigateToFactory}
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

  return (
    <div className="flex flex-row items-stretch grow">
      <RecipeComponent
        recipe={recipe}
        rate={props.assemblyLine.rate}
        sloopMultiplier={props.assemblyLine.getSloopMultiplier()}
        setPartRate={adjustProductionRate}
        partRateEditable={recipeLookup[props.mainPart.slug].length > 1}
        partsNeeded={partsNeeded}
        factory={props.factory}
      />
      <AssemblyLineControls
        assemblyLine={props.assemblyLine}
        factory={props.factory}
      />
    </div>
  );
}
