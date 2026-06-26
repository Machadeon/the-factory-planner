"use client";

import { useState } from "react";
import type AssemblyLine from "../models/assembly-line";
import type Factory from "../models/factory";
import type { RecipePart } from "../models/recipe";
import RecipeComponent from "./RecipeComponent";

interface AssemblyLineComponentProps {
  assemblyLine: AssemblyLine;
  factory: Factory;
}

export default function AssemblyLineComponent(
  props: AssemblyLineComponentProps,
) {
  const [assemblyLine, setAssemblyLine] = useState<AssemblyLine>(
    props.assemblyLine,
  );

  function updateAssemblyLine() {
    setAssemblyLine({
      productionRate: props.assemblyLine.productionRate,
      part: props.assemblyLine.part,
      recipe: props.assemblyLine.recipe,
    });
  }

  function adjustProductionRate(recipePart: RecipePart, newValue: number) {
    props.assemblyLine.productionRate =
      (newValue / recipePart.quantity) *
      props.assemblyLine.recipe.products[0].quantity;
    updateAssemblyLine();

    props.factory.recalculate(
      recipePart.part,
      props.assemblyLine.recipe,
      props.assemblyLine.productionRate,
    );
  }

  return (
    <RecipeComponent
      recipe={assemblyLine.recipe}
      productionRate={assemblyLine.productionRate}
      setPartRate={adjustProductionRate}
    />
  );
}
