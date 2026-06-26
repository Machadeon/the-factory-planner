"use client";

import EastIcon from "@mui/icons-material/East";
import type AssemblyLine from "../models/assembly-line";
import type Factory from "../models/factory";
import { displayNum } from "../utils";
import Icon from "./Icon";
import TextCalculatorField from "./TextCalculatorField";

interface NestedFactoryRowProps {
  assemblyLine: AssemblyLine;
  factory: Factory;
  onNavigateToFactory?: (id: string) => void;
}

export default function NestedFactoryRow({
  assemblyLine,
  factory,
  onNavigateToFactory,
}: NestedFactoryRowProps) {
  const recipe = assemblyLine.recipe;
  const rate = assemblyLine.rate;
  const factoryId = recipe.slug.replace("factory:", "");

  function updateRate(newRate: number) {
    assemblyLine.rate = newRate;
    factory.update();
  }

  return (
    <div className="sp-recipe-component flex flex-row grow items-center gap-x-2 p-2">
      {onNavigateToFactory ? (
        <button
          type="button"
          className="w-3xs font-medium text-left underline cursor-pointer hover:opacity-70"
          onClick={() => onNavigateToFactory(factoryId)}
        >
          {recipe.name}
        </button>
      ) : (
        <span className="w-3xs font-medium">{recipe.name}</span>
      )}
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
            <Icon src={ing.part.iconSmall} label={ing.part.name} size={24} />
            {displayNum(ing.quantity * rate)}/min
          </span>
        ))}
      </div>
      <EastIcon />
      <div className="w-2xs flex flex-row flex-wrap gap-x-2 items-center">
        {recipe.products.map((prod) => (
          <span key={prod.part.slug} className="flex items-center gap-x-1">
            <Icon src={prod.part.iconSmall} label={prod.part.name} size={24} />
            {displayNum(prod.quantity * rate)}/min
          </span>
        ))}
      </div>
    </div>
  );
}
