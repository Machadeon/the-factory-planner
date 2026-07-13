"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import type Factory from "../../models/factory";
import type { SerializedFactory } from "../../models/factory-storage";
import type ProductionLine from "../../models/production-line";
import type Recipe from "../../models/recipe";
import type { AnyRecipe } from "../../models/recipe-like";
import ActionRow from "../ui/ActionRow";
import IconButton from "../ui/IconButton";
import AssemblyLine from "./AssemblyLine";
import FactoryPickerDialog from "./FactoryPickerDialog";
import RecipePicker from "./RecipePicker";
import RecipeRejectDialog, { type RejectChoice } from "./RecipeRejectDialog";
import SuggestedActions from "./SuggestedActions";

export type RejectTarget =
  | null
  | { kind: "line" }
  | { kind: "assembly"; recipe: AnyRecipe };

interface ProductionLineDetailsProps {
  productionLine: ProductionLine;
  recipeList: Recipe[];
  factoryCandidates: Array<{ sf: SerializedFactory; factory: Factory }>;
  isExpanded: boolean;
  showPicker: boolean;
  hasMoreRecipes: boolean;
  productionRateDiff: number;
  rejectTarget: RejectTarget;
  showFactoryPicker: boolean;
  showSupplyPicker: boolean;
  onRemoveAssemblyLine: (recipe: AnyRecipe) => void;
  onAcceptAssembly: (recipe: AnyRecipe) => void;
  onRejectAssembly: (recipe: AnyRecipe) => void;
  onSplitRecipes: () => void;
  onOpenFactoryPicker: () => void;
  onOpenSupplyPicker: () => void;
  onCloseFactoryPicker: () => void;
  onCloseSupplyPicker: () => void;
  onAddRecipe: (recipe: Recipe) => void;
  onAddFactoryRecipe: (id: string, name: string, factory: Factory) => void;
  onAddSupplier: (id: string, name: string, factory: Factory) => void;
  onRejectChoice: (choice: RejectChoice) => void;
  onCloseReject: () => void;
}

export default function ProductionLineDetails({
  productionLine,
  recipeList,
  factoryCandidates,
  isExpanded,
  showPicker,
  hasMoreRecipes,
  productionRateDiff,
  rejectTarget,
  showFactoryPicker,
  showSupplyPicker,
  onRemoveAssemblyLine,
  onAcceptAssembly,
  onRejectAssembly,
  onSplitRecipes,
  onOpenFactoryPicker,
  onOpenSupplyPicker,
  onCloseFactoryPicker,
  onCloseSupplyPicker,
  onAddRecipe,
  onAddFactoryRecipe,
  onAddSupplier,
  onRejectChoice,
  onCloseReject,
}: ProductionLineDetailsProps) {
  const part = productionLine.part;
  return (
    <div
      className="flex flex-col pl-12"
      style={{ display: isExpanded ? "flex" : "none" }}
    >
      {productionLine.assemblyLines.map((assemblyLine) => (
        <div
          key={assemblyLine.recipe.slug}
          className="flex flex-row items-stretch-x items-center pe-4"
        >
          <AssemblyLine
            assemblyLine={assemblyLine}
            mainPart={part}
            belowRecipeName={
              assemblyLine.autoCreated ? (
                <SuggestedActions
                  onAccept={() => onAcceptAssembly(assemblyLine.recipe)}
                  onReject={() => onRejectAssembly(assemblyLine.recipe)}
                />
              ) : undefined
            }
          />
          {recipeList.length !== 1 ||
          assemblyLine.recipe.isFactoryRecipe ||
          productionLine.assemblyLines.length > 1 ? (
            <IconButton
              aria-label="Remove recipe"
              onClick={() => onRemoveAssemblyLine(assemblyLine.recipe)}
              className="p-1"
            >
              <DeleteIcon />
            </IconButton>
          ) : (
            <div className="w-[1.5rem]"></div>
          )}
        </div>
      ))}
      {!showPicker && (
        <div className="flex flex-row items-center gap-x-2">
          {hasMoreRecipes && (
            <ActionRow
              onClick={onSplitRecipes}
              className="flex flex-row items-center p-1"
            >
              <AddIcon />
              Add Recipe
            </ActionRow>
          )}
          <ActionRow
            onClick={onOpenFactoryPicker}
            className="flex flex-row items-center p-1"
          >
            <AddIcon />
            Use Factory as Recipe
          </ActionRow>
          <ActionRow
            onClick={onOpenSupplyPicker}
            className="flex flex-row items-center p-1"
          >
            <AddIcon />
            Supply from Factory
          </ActionRow>
        </div>
      )}
      <RecipeRejectDialog
        open={rejectTarget !== null}
        recipeName={
          rejectTarget?.kind === "assembly"
            ? rejectTarget.recipe.name
            : part.name
        }
        onResolve={onRejectChoice}
        onClose={onCloseReject}
      />
      <FactoryPickerDialog
        open={showFactoryPicker}
        mode="recipe"
        targetPartSlug={part.slug}
        onPick={onAddFactoryRecipe}
        onClose={onCloseFactoryPicker}
      />
      <FactoryPickerDialog
        open={showSupplyPicker}
        mode="supplier"
        targetPartSlug={part.slug}
        onPick={onAddSupplier}
        onClose={onCloseSupplyPicker}
      />
      {showPicker && (
        <RecipePicker
          productionLine={productionLine}
          recipeList={recipeList}
          factoryCandidates={factoryCandidates}
          productionRateDiff={productionRateDiff}
          onAddRecipe={onAddRecipe}
          onAddFactory={onAddFactoryRecipe}
        />
      )}
    </div>
  );
}
