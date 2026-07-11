"use client";

import type Factory from "../../models/factory";
import FactoryRecipe from "../../models/factory-recipe";
import type { SerializedFactory } from "../../models/factory-storage";
import type ProductionLine from "../../models/production-line";
import type Recipe from "../../models/recipe";
import RecipeComponent from "../RecipeComponent";
import FactoryRecipeCard from "./FactoryRecipeCard";

interface RecipePickerProps {
  productionLine: ProductionLine;
  recipeList: Recipe[];
  factoryCandidates: Array<{ sf: SerializedFactory; factory: Factory }>;
  productionRateDiff: number;
  onAddRecipe: (recipe: Recipe) => void;
  onAddFactory: (id: string, name: string, factory: Factory) => void;
}

export default function RecipePicker({
  productionLine,
  recipeList,
  factoryCandidates,
  productionRateDiff,
  onAddRecipe,
  onAddFactory,
}: RecipePickerProps) {
  const part = productionLine.part;
  return (
    <>
      {recipeList.map((recipe) => {
        if (
          productionLine.assemblyLines.find(
            (assemblyLine) => assemblyLine.recipe.slug === recipe.slug,
          )
        ) {
          return null;
        }
        return (
          <RecipeComponent
            recipe={recipe}
            rate={productionLine.recipeInstanceRate(recipe)}
            onClick={() => onAddRecipe(recipe)}
            key={recipe.slug}
          />
        );
      })}
      {factoryCandidates.map(({ sf, factory: f }) => {
        const fr = new FactoryRecipe(sf.id, sf.name, f);
        const qty = fr.getProduct(part.slug)?.quantity ?? 1;
        const instanceRate = -productionRateDiff / qty;
        return (
          <FactoryRecipeCard
            key={sf.id}
            sf={sf}
            instanceRate={instanceRate}
            qty={qty}
            onClick={() => onAddFactory(sf.id, sf.name, f)}
          />
        );
      })}
    </>
  );
}
