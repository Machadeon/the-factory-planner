"use client";

import { type MouseEvent, useEffect, useMemo, useState } from "react";
import { useFactory } from "@/app/contexts/FactoryContext";
import type Factory from "../../models/factory";
import FactoryRecipe, { factoryRecipeSlug } from "../../models/factory-recipe";
import type { SerializedFactory } from "../../models/factory-storage";
import { RATE_EPSILON, recipeLookup } from "../../models/game-data";
import type ProductionLineModel from "../../models/production-line";
import type Recipe from "../../models/recipe";
import type { AnyRecipe } from "../../models/recipe-like";
import { shouldPromptReject } from "../../models/suggestions";
import ProductionLineDetails, {
  type RejectTarget,
} from "./ProductionLineDetails";
import ProductionLineRow from "./ProductionLineRow";
import type { RejectChoice } from "./RecipeRejectDialog";

interface ProductionLineProps {
  productionLine: ProductionLineModel;
  candidateFactories: Array<{ sf: SerializedFactory; factory: Factory }>;
  onDeleteClicked: () => void;
  forceExpanded?: boolean | null;
  onToggle?: () => void;
}

export default function ProductionLine(props: ProductionLineProps) {
  const factory = useFactory();
  const productionLine = props.productionLine;
  const [showFactoryPicker, setShowFactoryPicker] = useState<boolean>(false);
  const [showSupplyPicker, setShowSupplyPicker] = useState<boolean>(false);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget>(null);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [pickerManuallyOpened, setPickerManuallyOpened] =
    useState<boolean>(false);

  const part = productionLine.part;
  const recipeList = recipeLookup[part.slug];
  const actualProductionRate = productionLine.assemblyLines.reduce(
    (acc, assemblyLine) => acc + assemblyLine.getPartProductionRate(part),
    0,
  );

  const productionRateDiff = actualProductionRate - productionLine.rate;
  const needMoreProduction =
    productionLine.assemblyLines.length === 0 ||
    Math.abs(productionRateDiff) > RATE_EPSILON;
  const hasMoreRecipes =
    productionLine.assemblyLines.length < recipeList.length;
  const showPicker = needMoreProduction || pickerManuallyOpened;

  const factoryCandidates = useMemo(
    () =>
      props.candidateFactories.filter(
        ({ sf, factory: f }) =>
          f.allOutputs().some((p) => p.slug === part.slug) &&
          !productionLine.assemblyLines.some(
            (al) => al.recipe.slug === factoryRecipeSlug(sf.id),
          ),
      ),
    [props.candidateFactories, part.slug, productionLine.assemblyLines],
  );

  const recipeIsSet = productionLine.assemblyLines.length > 0;
  const isExpanded =
    props.forceExpanded === true || !recipeIsSet ? true : expanded;

  function updateProductionRate(newValue: number) {
    setPickerManuallyOpened(false);
    factory.setProductionLineRate(productionLine, newValue);
  }

  function updateOutputRate(newValue: number) {
    setPickerManuallyOpened(false);
    factory.setOutputRate(productionLine, newValue);
  }

  function addAssemblyLine(recipe: Recipe) {
    factory.addAssemblyLine(productionLine, recipe);
    setPickerManuallyOpened(false);
  }

  function removeAssemblyLine(recipe: AnyRecipe) {
    factory.removeAssemblyLine(productionLine, recipe);
    setPickerManuallyOpened(false);
  }

  function addSupplierFactory(
    id: string,
    name: string,
    supplierFactory: Factory,
  ) {
    factory.addSupplier(new FactoryRecipe(id, name, supplierFactory));
    setShowSupplyPicker(false);
  }

  function addFactoryAssemblyLine(
    id: string,
    name: string,
    nestedFactory: Factory,
  ) {
    const fr = new FactoryRecipe(id, name, nestedFactory);
    factory.addFactoryAssemblyLine(productionLine, fr, actualProductionRate);
    setShowFactoryPicker(false);
    setPickerManuallyOpened(false);
  }

  function removeSelf(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    props.onDeleteClicked();
  }

  function acceptLine(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    factory.acceptLine(productionLine);
  }

  function rejectLine(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (shouldPromptReject(factory.optimizer)) {
      setRejectTarget({ kind: "line" });
    } else {
      factory.rejectLine(productionLine);
      props.onDeleteClicked();
    }
  }

  function acceptAssembly(recipe: AnyRecipe) {
    factory.acceptAssembly(productionLine, recipe);
  }

  function rejectAssembly(recipe: AnyRecipe) {
    if (shouldPromptReject(factory.optimizer)) {
      setRejectTarget({ kind: "assembly", recipe });
    } else {
      factory.rejectAssembly(recipe);
      removeAssemblyLine(recipe);
    }
  }

  function onRejectChoice(choice: RejectChoice) {
    if (!rejectTarget) return;
    if (rejectTarget.kind === "line") {
      factory.rejectLineChoice(productionLine, choice);
      setRejectTarget(null);
      props.onDeleteClicked();
    } else {
      const recipe = rejectTarget.recipe;
      factory.rejectAssemblyChoice(recipe, choice);
      setRejectTarget(null);
      removeAssemblyLine(recipe);
    }
  }

  function toggleAutoCalculateRate(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setPickerManuallyOpened(false);
    factory.setAutoCalculateRate(
      productionLine,
      !productionLine.autoCalculateRate,
    );
  }

  function toggleMaximizeOutput(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setPickerManuallyOpened(false);
    factory.setMaximizeOutput(productionLine, !productionLine.maximizeOutput);
  }

  function splitRecipes() {
    factory.splitRecipeRates(productionLine);
    setPickerManuallyOpened(true);
  }

  useEffect(() => {
    if (props.forceExpanded != null) {
      setExpanded(props.forceExpanded);
    }
  }, [props.forceExpanded]);

  const outputRateDisplay = productionLine.maximizeOutput
    ? productionLine.rate
    : productionLine.outputRate;

  return (
    <div className="flex flex-col gap-y-2 grow">
      <ProductionLineRow
        productionLine={productionLine}
        part={part}
        isExpanded={isExpanded}
        productionRateDiff={productionRateDiff}
        outputRateDisplay={outputRateDisplay}
        actualProductionRate={actualProductionRate}
        onToggleExpand={() => {
          setExpanded(!isExpanded);
          props.onToggle?.();
        }}
        onUpdateOutputRate={updateOutputRate}
        onUpdateProductionRate={updateProductionRate}
        onToggleAutoCalculateRate={toggleAutoCalculateRate}
        onToggleMaximizeOutput={toggleMaximizeOutput}
        onAcceptLine={acceptLine}
        onRejectLine={rejectLine}
        onRemoveSelf={removeSelf}
      />
      <ProductionLineDetails
        productionLine={productionLine}
        recipeList={recipeList}
        factoryCandidates={factoryCandidates}
        isExpanded={isExpanded}
        showPicker={showPicker}
        hasMoreRecipes={hasMoreRecipes}
        productionRateDiff={productionRateDiff}
        rejectTarget={rejectTarget}
        showFactoryPicker={showFactoryPicker}
        showSupplyPicker={showSupplyPicker}
        onRemoveAssemblyLine={removeAssemblyLine}
        onAcceptAssembly={acceptAssembly}
        onRejectAssembly={rejectAssembly}
        onSplitRecipes={splitRecipes}
        onOpenFactoryPicker={() => setShowFactoryPicker(true)}
        onOpenSupplyPicker={() => setShowSupplyPicker(true)}
        onCloseFactoryPicker={() => setShowFactoryPicker(false)}
        onCloseSupplyPicker={() => setShowSupplyPicker(false)}
        onAddRecipe={addAssemblyLine}
        onAddFactoryRecipe={addFactoryAssemblyLine}
        onAddSupplier={addSupplierFactory}
        onRejectChoice={onRejectChoice}
        onCloseReject={() => setRejectTarget(null)}
      />
    </div>
  );
}
