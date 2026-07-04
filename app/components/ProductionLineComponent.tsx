"use client";

import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LinkIcon from "@mui/icons-material/Link";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TextField from "@mui/material/TextField";
import { type MouseEvent, useEffect, useMemo, useState } from "react";
import { displayNum, rateUnit } from "@/app/lib/format";
import { rateStatusColor } from "@/app/lib/rate-status";
import AssemblyLineModel from "../models/assembly-line";
import type Factory from "../models/factory";
import FactoryRecipe from "../models/factory-recipe";
import type {
  SerializedFactory,
  StorageLibrary,
} from "../models/factory-storage";
import { recipeLookup } from "../models/library";
import type ProductionLine from "../models/production-line";
import type Recipe from "../models/recipe";
import type { RecipeLike } from "../models/recipe-like";
import AssemblyLine from "./AssemblyLineComponent";
import FactoryPickerDialog from "./FactoryPickerDialog";
import Icon from "./Icon";
import RecipeComponent from "./RecipeComponent";
import RecipeRejectDialog, { type RejectChoice } from "./RecipeRejectDialog";
import SuggestedActions from "./SuggestedActions";
import TextCalculatorField from "./TextCalculatorField";
import ActionRow from "./ui/ActionRow";
import IconButton from "./ui/IconButton";
import {
  type InteractiveVariant,
  rowVisualClasses,
} from "./ui/interactive-styles";

interface ProductionLineComponentProps {
  productionLine: ProductionLine;
  factory: Factory;
  library: StorageLibrary;
  currentFactoryId: string | null;
  candidateFactories: Array<{ sf: SerializedFactory; factory: Factory }>;
  onDeleteClicked: () => void;
  forceExpanded?: boolean | null;
  onToggle?: () => void;
  onNavigateToFactory?: (id: string) => void;
}

export default function ProductionLineComponent(
  props: ProductionLineComponentProps,
) {
  const [showFactoryPicker, setShowFactoryPicker] = useState<boolean>(false);
  const [showSupplyPicker, setShowSupplyPicker] = useState<boolean>(false);
  const [rejectTarget, setRejectTarget] = useState<
    null | { kind: "line" } | { kind: "assembly"; recipe: RecipeLike }
  >(null);
  const part = props.productionLine.part;
  const recipeList = recipeLookup[part.slug];
  const actualProductionRate = props.productionLine.assemblyLines.reduce(
    (acc, assemblyLine) => acc + assemblyLine.getPartProductionRate(part),
    0,
  );

  const productionRateDiff = actualProductionRate - props.productionLine.rate;
  const needMoreProduction =
    props.productionLine.assemblyLines.length === 0 ||
    Math.abs(productionRateDiff) > 0.0001;
  const hasMoreRecipes =
    props.productionLine.assemblyLines.length <
    recipeLookup[props.productionLine.part.slug].length;

  const factoryCandidates = useMemo(
    () =>
      props.candidateFactories.filter(
        ({ sf, factory: f }) =>
          f.allOutputs().some((p) => p.slug === part.slug) &&
          !props.productionLine.assemblyLines.some(
            (al) => al.recipe.slug === `factory:${sf.id}`,
          ),
      ),
    [props.candidateFactories, part.slug, props.productionLine.assemblyLines],
  );

  const [expanded, setExpanded] = useState<boolean>(false);

  const recipeIsSet = props.productionLine.assemblyLines.length > 0;
  const isExpanded =
    props.forceExpanded === true || !recipeIsSet ? true : expanded;
  const [showRecipes, setShowRecipes] = useState<boolean>(false);

  function getProductionRateForRecipe(recipe: Recipe): number {
    const partRate = props.productionLine.rate - actualProductionRate;
    return partRate / recipe.productLookup[part.slug];
  }

  function updateProductionLine() {
    if (props.productionLine.assemblyLines.length === 1) {
      // if something changed and there is only one line, then set the line rate to the product rate
      const assemblyLine = props.productionLine.assemblyLines[0];
      assemblyLine.setPartProductionRate(part, props.productionLine.rate);
    }

    props.factory.setPartRate(part, props.productionLine.rate);
  }

  function updateProductionRate(newValue: number) {
    props.productionLine.rate = newValue;
    updateProductionLine();
  }

  function updateOutputRate(newValue: number) {
    props.productionLine.outputRate = newValue;
    props.factory.autoCalculateRates();
  }

  function addAssemblyLine(recipe: Recipe) {
    props.productionLine.assemblyLines.push(
      new AssemblyLineModel(
        recipe,
        getProductionRateForRecipe(recipe),
        0,
        100,
        0,
        true,
      ),
    );
    updateProductionLine();
    setShowRecipes(false);
  }

  function removeAssemblyLine(recipe: RecipeLike) {
    const index = props.productionLine.assemblyLines
      .map((assemblyLine) => assemblyLine.recipe.slug)
      .indexOf(recipe.slug);
    props.productionLine.assemblyLines.splice(index, 1);
    updateProductionLine();
  }

  function addSupplierFactory(
    id: string,
    name: string,
    supplierFactory: Factory,
  ) {
    props.factory.addSupplier(new FactoryRecipe(id, name, supplierFactory));
    setShowSupplyPicker(false);
  }

  function addFactoryAssemblyLine(
    id: string,
    name: string,
    nestedFactory: Factory,
  ) {
    const fr = new FactoryRecipe(id, name, nestedFactory);
    const productionDeficit = props.productionLine.rate - actualProductionRate;
    const qty = fr.getProduct(part.slug)?.quantity ?? 1;
    props.productionLine.assemblyLines.push(
      new AssemblyLineModel(fr, productionDeficit / qty, 0, 100, 0, true),
    );
    setShowFactoryPicker(false);
    updateProductionLine();
  }

  function removeSelf(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    props.onDeleteClicked();
  }

  function lineRecipeSlugs(): string[] {
    return props.productionLine.assemblyLines
      .filter((al) => !al.recipe.isFactoryRecipe)
      .map((al) => al.recipe.slug);
  }

  function acceptLine(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    props.productionLine.autoCreated = false;
    for (const al of props.productionLine.assemblyLines) al.autoCreated = false;
    props.factory.update();
  }

  function rejectLine(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (props.factory.shouldPromptReject()) {
      setRejectTarget({ kind: "line" });
    } else {
      props.factory.applyRejectSilent(lineRecipeSlugs());
      props.onDeleteClicked();
    }
  }

  function acceptAssembly(recipe: RecipeLike) {
    const al = props.productionLine.assemblyLines.find(
      (a) => a.recipe.slug === recipe.slug,
    );
    if (al) al.autoCreated = false;
    props.factory.update();
  }

  function rejectAssembly(recipe: RecipeLike) {
    const slugs = recipe.isFactoryRecipe ? [] : [recipe.slug];
    if (props.factory.shouldPromptReject()) {
      setRejectTarget({ kind: "assembly", recipe });
    } else {
      props.factory.applyRejectSilent(slugs);
      removeAssemblyLine(recipe);
    }
  }

  function onRejectChoice(choice: RejectChoice) {
    if (!rejectTarget) return;
    if (rejectTarget.kind === "line") {
      props.factory.applyRejectChoice(lineRecipeSlugs(), choice);
      setRejectTarget(null);
      props.onDeleteClicked();
    } else {
      const recipe = rejectTarget.recipe;
      const slugs = recipe.isFactoryRecipe ? [] : [recipe.slug];
      props.factory.applyRejectChoice(slugs, choice);
      setRejectTarget(null);
      removeAssemblyLine(recipe);
    }
  }

  function toggleAutoCalculateRate(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    props.productionLine.autoCalculateRate =
      !props.productionLine.autoCalculateRate;

    if (props.productionLine.autoCalculateRate) {
      props.factory.autoSetPartRate(part);
    } else {
      props.factory.update();
    }
  }

  function toggleMaximizeOutput(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    props.productionLine.maximizeOutput = !props.productionLine.maximizeOutput;
    props.factory.autoCalculateRates();
  }

  function splitRecipes() {
    const currentRecipeCount = props.productionLine.assemblyLines.length;
    const ratio = currentRecipeCount / (currentRecipeCount + 1);
    for (const assemblyLine of props.productionLine.assemblyLines) {
      assemblyLine.rate *= ratio;
    }
    setShowRecipes(true);
  }

  const isSlooped = props.productionLine.assemblyLines.some((al) =>
    al.isSlooped(),
  );
  const baseProductionRateColorClass = rateStatusColor(productionRateDiff, {
    surplusIsGood: false,
  });
  const actualProductionRateTextColorClass =
    isSlooped && baseProductionRateColorClass === "text-green-500"
      ? "text-pink-600"
      : baseProductionRateColorClass;
  var productionRateDiffStr: string;
  if (actualProductionRateTextColorClass === "text-amber-500") {
    productionRateDiffStr = ` (+${displayNum(productionRateDiff)})`;
  } else if (actualProductionRateTextColorClass === "text-red-500") {
    productionRateDiffStr = ` (${displayNum(productionRateDiff)})`;
  } else {
    productionRateDiffStr = "";
  }

  var mainStyle: InteractiveVariant = "default";
  if (props.productionLine.assemblyLines.every((al) => al.rate < 0)) {
    mainStyle = "danger";
  } else if (!props.productionLine.assemblyLines.every((al) => al.rate > 0)) {
    mainStyle = "warning";
  }

  useEffect(() => {
    if (needMoreProduction) {
      setShowRecipes(true);
    } else {
      setShowRecipes(false);
    }
  }, [needMoreProduction]);

  useEffect(() => {
    if (props.forceExpanded != null) {
      setExpanded(props.forceExpanded);
    }
  }, [props.forceExpanded]);

  var outputRateDisplay: number;
  if (props.productionLine.maximizeOutput) {
    outputRateDisplay = props.productionLine.rate;
  } else {
    outputRateDisplay = props.productionLine.outputRate;
  }

  return (
    <div className="flex flex-col gap-y-2 grow">
      <div
        className={rowVisualClasses(
          mainStyle,
          "flex flex-row items-center gap-x-2 px-4 py-2",
        )}
      >
        <ActionRow
          bare
          aria-expanded={isExpanded}
          onClick={() => {
            setExpanded(!isExpanded);
            props.onToggle?.();
          }}
          className="flex flex-row items-center gap-x-2"
        >
          {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
          <div className="flex flex-row items-center gap-2 w-sm flex-none">
            <Icon src={part.iconSmall} label={part.name} size={64} />
            <span className="text-xl">{part.name}</span>
          </div>
        </ActionRow>
        {props.productionLine.autoCreated && (
          <SuggestedActions onAccept={acceptLine} onReject={rejectLine} />
        )}
        <div className="flex flex-row items-center w-sm flex-none gap-x-2">
          {props.productionLine.maximizeOutput ? (
            <TextField
              variant="outlined"
              size="small"
              label="Factory Output Rate"
              className="w-40"
              disabled
              value={outputRateDisplay}
              slotProps={{
                htmlInput: { className: "text-right" },
              }}
            />
          ) : (
            <TextCalculatorField
              variant="outlined"
              size="small"
              label="Factory Output Rate"
              className="w-40"
              value={outputRateDisplay}
              onCalculate={updateOutputRate}
              onClick={(e) => e.stopPropagation()}
              slotProps={{
                htmlInput: { className: "text-right" },
              }}
            />
          )}
          {props.productionLine.autoCalculateRate ? (
            <TextField
              variant="outlined"
              size="small"
              label="Production Rate"
              className="w-32"
              disabled
              value={props.productionLine.rate}
              slotProps={{
                htmlInput: {
                  sx: {
                    textAlign: "right",
                  },
                },
              }}
            />
          ) : (
            <TextCalculatorField
              variant="outlined"
              size="small"
              label="Production Rate"
              className="w-32"
              value={props.productionLine.rate}
              onCalculate={updateProductionRate}
              onClick={(e) => e.stopPropagation()}
              slotProps={{
                htmlInput: {
                  sx: {
                    textAlign: "right",
                  },
                },
              }}
            />
          )}
          <span>{part.slug === "power" ? <> MW</> : rateUnit(part)}</span>
          {props.productionLine.autoCalculateRate ? (
            <IconButton
              aria-label="Override rate"
              onClick={toggleAutoCalculateRate}
              className="p-1"
            >
              <EditIcon />
            </IconButton>
          ) : (
            <IconButton
              aria-label="Autocalculate rate"
              onClick={toggleAutoCalculateRate}
              className="p-1"
            >
              <LinkIcon />
            </IconButton>
          )}
          <IconButton
            aria-label={
              props.productionLine.maximizeOutput
                ? "Stop maximizing output"
                : "Maximize output (limited by constraints)"
            }
            onClick={toggleMaximizeOutput}
            className="p-1"
          >
            <TrendingUpIcon
              sx={{
                color: props.productionLine.maximizeOutput
                  ? "primary.main"
                  : "action.active",
              }}
            />
          </IconButton>
        </div>
        <p className="grow">
          Actual:{" "}
          <span className={`font-bold ${actualProductionRateTextColorClass}`}>
            {displayNum(actualProductionRate)}
          </span>
          {part.slug === "power" ? <> MW</> : rateUnit(part)}
          <span className={`font-bold ${actualProductionRateTextColorClass}`}>
            {productionRateDiffStr}
          </span>
        </p>
        <IconButton
          aria-label="Remove product"
          onClick={removeSelf}
          className="p-1"
        >
          <DeleteIcon />
        </IconButton>
      </div>
      <div
        className="flex flex-col pl-12"
        style={{ display: isExpanded ? "flex" : "none" }}
      >
        {props.productionLine.assemblyLines.map((assemblyLine) => {
          return (
            <div
              key={assemblyLine.recipe.slug}
              className="flex flex-row items-stretch-x items-center pe-4"
            >
              <AssemblyLine
                assemblyLine={assemblyLine}
                mainPart={part}
                factory={props.factory}
                onNavigateToFactory={props.onNavigateToFactory}
                belowRecipeName={
                  assemblyLine.autoCreated ? (
                    <SuggestedActions
                      onAccept={() => acceptAssembly(assemblyLine.recipe)}
                      onReject={() => rejectAssembly(assemblyLine.recipe)}
                    />
                  ) : undefined
                }
              />
              {recipeList.length !== 1 ||
              assemblyLine.recipe.isFactoryRecipe ||
              props.productionLine.assemblyLines.length > 1 ? (
                <IconButton
                  aria-label="Remove recipe"
                  onClick={() => removeAssemblyLine(assemblyLine.recipe)}
                  className="p-1"
                >
                  <DeleteIcon />
                </IconButton>
              ) : (
                <div className="w-[1.5rem]"></div>
              )}
            </div>
          );
        })}
        {hasMoreRecipes && !needMoreProduction && !showRecipes && (
          <div className="flex flex-row items-center gap-x-2">
            <ActionRow
              onClick={splitRecipes}
              className="flex flex-row items-center p-1"
            >
              <AddIcon />
              Add Recipe
            </ActionRow>
            <ActionRow
              onClick={() => setShowFactoryPicker(true)}
              className="flex flex-row items-center p-1"
            >
              <AddIcon />
              Use Factory as Recipe
            </ActionRow>
            <ActionRow
              onClick={() => setShowSupplyPicker(true)}
              className="flex flex-row items-center p-1"
            >
              <AddIcon />
              Supply from Factory
            </ActionRow>
          </div>
        )}
        {!hasMoreRecipes && !needMoreProduction && !showRecipes && (
          <div className="flex flex-row items-center gap-x-2">
            <ActionRow
              onClick={() => setShowFactoryPicker(true)}
              className="flex flex-row items-center p-1"
            >
              <AddIcon />
              Use Factory as Recipe
            </ActionRow>
            <ActionRow
              onClick={() => setShowSupplyPicker(true)}
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
          onClose={() => setRejectTarget(null)}
        />
        <FactoryPickerDialog
          open={showFactoryPicker}
          library={props.library}
          currentFactoryId={props.currentFactoryId}
          targetPartSlug={part.slug}
          onPick={addFactoryAssemblyLine}
          onClose={() => setShowFactoryPicker(false)}
        />
        <FactoryPickerDialog
          open={showSupplyPicker}
          library={props.library}
          currentFactoryId={props.currentFactoryId}
          targetPartSlug={part.slug}
          onPick={addSupplierFactory}
          onClose={() => setShowSupplyPicker(false)}
        />
        {(needMoreProduction || showRecipes) &&
          recipeList.map((recipe) => {
            if (
              props.productionLine.assemblyLines.find(
                (assemblyLine) => assemblyLine.recipe.slug === recipe.slug,
              )
            ) {
              return "";
            }

            return (
              <RecipeComponent
                recipe={recipe}
                rate={
                  -productionRateDiff /
                  (recipe.getProduct(props.productionLine.part)?.quantity ?? 1)
                }
                onClick={() => addAssemblyLine(recipe)}
                key={recipe.slug}
              />
            );
          })}
        {(needMoreProduction || showRecipes) &&
          factoryCandidates.map(({ sf, factory: f }) => {
            const fr = new FactoryRecipe(sf.id, sf.name, f);
            const qty = fr.getProduct(part.slug)?.quantity ?? 1;
            const instanceRate = -productionRateDiff / qty;
            return (
              <ActionRow
                key={sf.id}
                className="sp-recipe-component flex flex-row grow items-center gap-x-2 p-2"
                onClick={() => addFactoryAssemblyLine(sf.id, sf.name, f)}
              >
                {sf.icon ? (
                  <Icon src={sf.icon} label={sf.name} size={64} />
                ) : (
                  <div className="w-16 h-16 flex items-center justify-center text-gray-400 text-xs border border-gray-600 rounded">
                    Factory
                  </div>
                )}
                <span className="w-3xs font-medium">{sf.name}</span>
                <span className="text-sm text-gray-400">
                  {displayNum(instanceRate)} instance
                  {instanceRate !== 1 ? "s" : ""}
                </span>
                <span className="text-sm text-gray-400">
                  → {displayNum(qty * instanceRate)}/min
                </span>
              </ActionRow>
            );
          })}
      </div>
    </div>
  );
}
