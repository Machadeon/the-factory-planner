"use client";

import type AssemblyLine from "../models/assembly-line";
import type Factory from "../models/factory";
import { recipeLookup } from "../models/library";
import type { RecipePart } from "../models/recipe";
import RecipeComponent from "./RecipeComponent";
import type Part from "../models/part";

interface AssemblyLineComponentProps {
  assemblyLine: AssemblyLine;
  mainPart: Part;
  factory: Factory;
}

export default function AssemblyLineComponent(
  props: AssemblyLineComponentProps,
) {
  function adjustProductionRate(recipePart: RecipePart, isProduct: boolean, newValue: number) {
    if (isProduct) props.assemblyLine.setPartProductionRate(recipePart.part, newValue);
    else props.assemblyLine.setPartConsumptionRate(recipePart.part, newValue);
    props.factory.update();
  }

  const allOutputs = props.factory.recipeOutputs().map((part) => part.slug);
  const partsNeeded = props.assemblyLine.recipe.ingredients
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
      recipe={props.assemblyLine.recipe}
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
