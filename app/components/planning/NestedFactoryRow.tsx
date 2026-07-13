"use client";

import EastIcon from "@mui/icons-material/East";
import { useFactory } from "@/app/contexts/FactoryContext";
import { useNavigation } from "@/app/contexts/NavigationContext";
import { displayNum } from "@/app/lib/format";
import type AssemblyLine from "../../models/assembly-line";
import { factoryRecipeId } from "../../models/factory-recipe";
import Icon from "../ui/Icon";
import TextCalculatorField from "../ui/TextCalculatorField";

interface NestedFactoryRowProps {
  assemblyLine: AssemblyLine;
}

export default function NestedFactoryRow({
  assemblyLine,
}: NestedFactoryRowProps) {
  const factory = useFactory();
  const { navigateToFactory } = useNavigation();
  const recipe = assemblyLine.recipe;
  const rate = assemblyLine.rate;
  const factoryId = factoryRecipeId(recipe.slug);

  function updateRate(newRate: number) {
    // A factory-as-recipe represents whole copies of a physical sub-factory.
    factory.setNestedFactoryRate(assemblyLine, newRate);
  }

  return (
    <div className="sp-recipe-component flex flex-row grow items-center gap-x-2 p-2">
      <button
        type="button"
        className="w-3xs font-medium text-left underline cursor-pointer hover:opacity-70"
        onClick={() => navigateToFactory(factoryId)}
      >
        {recipe.name}
      </button>
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
