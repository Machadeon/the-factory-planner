"use client";

import type AssemblyLine from "../models/assembly-line";
import type Factory from "../models/factory";
import { recipeLookup } from "../models/library";
import type { RecipePart } from "../models/recipe";
import RecipeComponent from "./RecipeComponent";

interface AssemblyLineComponentProps {
  assemblyLine: AssemblyLine;
  factory: Factory;
}

export default function AssemblyLineComponent(
  props: AssemblyLineComponentProps,
) {
  function adjustProductionRate(recipePart: RecipePart, newValue: number) {
    props.assemblyLine.rate = newValue / recipePart.quantity;
    props.factory.update();
  }

  const partsMade = props.factory.productionLines.map((pl) => pl.part.slug);
  const partsNeeded = props.assemblyLine.recipe.ingredients
    .map((ing) => ing.part.slug)
    .filter((part) => partsMade.indexOf(part) < 0);

  return (
    <RecipeComponent
      recipe={props.assemblyLine.recipe}
      rate={props.assemblyLine.rate}
      setPartRate={adjustProductionRate}
      partRateEditable={recipeLookup[props.assemblyLine.part.slug].length > 1}
      partsNeeded={partsNeeded}
      factory={props.factory}
    />
  );
}
