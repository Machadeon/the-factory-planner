"use client";

import type { ReactNode } from "react";
import { useFactory } from "@/app/contexts/FactoryContext";
import type AssemblyLine from "../models/assembly-line";
import { recipeLookup } from "../models/game-data";
import type Part from "../models/part";
import type Recipe from "../models/recipe";
import type { RecipePart } from "../models/recipe";
import AssemblyLineControls from "./AssemblyLineControls";
import NestedFactoryRow from "./NestedFactoryRow";
import RecipeComponent from "./RecipeComponent";

interface AssemblyLineComponentProps {
  assemblyLine: AssemblyLine;
  mainPart: Part;
  belowRecipeName?: ReactNode;
}

function AssemblyLineComponent(props: AssemblyLineComponentProps) {
  const factory = useFactory();

  if (props.assemblyLine.recipe.isFactoryRecipe) {
    return <NestedFactoryRow assemblyLine={props.assemblyLine} />;
  }

  const recipe = props.assemblyLine.recipe as Recipe;

  function adjustProductionRate(
    recipePart: RecipePart,
    isProduct: boolean,
    newValue: number,
  ) {
    factory.setAssemblyLinePartRate(
      props.assemblyLine,
      recipePart.part,
      newValue,
      isProduct,
    );
  }

  const allOutputs = factory.recipeOutputs().map((part) => part.slug);
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
        factory={factory}
        belowRecipeName={props.belowRecipeName}
      />
      <AssemblyLineControls
        assemblyLine={props.assemblyLine}
        factory={factory}
      />
    </div>
  );
}

export default AssemblyLineComponent;
