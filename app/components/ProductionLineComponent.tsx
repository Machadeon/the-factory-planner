"use client";

import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LinkIcon from "@mui/icons-material/Link";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Image from "next/image";
import { type MouseEvent, useEffect, useState } from "react";
import AssemblyLineModel from "../models/assembly-line";
import type Factory from "../models/factory";
import FactoryRecipe from "../models/factory-recipe";
import {
  deserializeFactory,
  type StorageLibrary,
} from "../models/factory-storage";
import { recipeLookup } from "../models/library";
import type ProductionLine from "../models/production-line";
import type Recipe from "../models/recipe";
import type { RecipeLike } from "../models/recipe-like";
import { displayNum, getColorClassForProductionRate1 } from "../utils";
import AssemblyLine from "./AssemblyLineComponent";
import Clickable, {
  type ClickableStyle,
  defaultClass as clickableClass,
  defaultHoverClass as clickableHoverClass,
} from "./Clickable";
import FactoryPickerDialog from "./FactoryPickerDialog";
import RecipeComponent from "./RecipeComponent";
import TextCalculatorField from "./TextCalculatorField";

interface ProductionLineComponentProps {
  productionLine: ProductionLine;
  factory: Factory;
  library: StorageLibrary;
  currentFactoryId: string | null;
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

  const factoryCandidates = props.library.factories.flatMap((sf) => {
    if (sf.id === props.currentFactoryId) return [];
    const f = deserializeFactory(sf, props.library);
    if (!f) return [];
    if (!f.allOutputs().some((p) => p.slug === part.slug)) return [];
    if (
      props.productionLine.assemblyLines.some(
        (al) => al.recipe.slug === `factory:${sf.id}`,
      )
    ) {
      return [];
    }
    return [{ sf, factory: f }];
  });

  const [expanded, setExpanded] = useState<boolean>(
    props.productionLine.assemblyLines.length !== 1 ||
      !props.productionLine.autoCreated,
  );

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

  function removeSelf(e: MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    props.onDeleteClicked();
  }

  function toggleAutoCalculateRate(e: MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    props.productionLine.autoCalculateRate =
      !props.productionLine.autoCalculateRate;

    if (props.productionLine.autoCalculateRate) {
      props.factory.autoSetPartRate(part);
    } else {
      props.factory.update();
    }
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
  const baseProductionRateColorClass =
    getColorClassForProductionRate1(productionRateDiff);
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

  var mainStyle: ClickableStyle = "default";
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

  return (
    <div className="flex flex-col gap-y-2 grow">
      <Clickable
        className="flex flex-row items-center gap-x-2 px-4 py-2"
        style={mainStyle}
        onClick={() => {
          setExpanded(!isExpanded);
          props.onToggle?.();
        }}
      >
        {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
        <div className="flex flex-row items-center gap-2 w-sm flex-none">
          <Image src={part.iconSmall} alt={part.name} width={64} height={64} />
          <span className="text-xl">{part.name}</span>
        </div>
        <div className="flex flex-row items-center w-sm flex-none gap-x-2">
          <TextCalculatorField
            variant="outlined"
            size="small"
            label="Factory Output Rate"
            className="w-40"
            value={props.productionLine.outputRate}
            onCalculate={updateOutputRate}
            onClick={(e) => e.stopPropagation()}
            slotProps={{
              htmlInput: { className: "text-right" },
            }}
          />
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
          <span>/min</span>
          {props.productionLine.autoCalculateRate ? (
            <Tooltip title="Override rate">
              <span>
                <Clickable onClick={toggleAutoCalculateRate} className="p-1">
                  <EditIcon />
                </Clickable>
              </span>
            </Tooltip>
          ) : (
            <Tooltip title="Autocalculate rate">
              <span>
                <Clickable onClick={toggleAutoCalculateRate} className="p-1">
                  <LinkIcon />
                </Clickable>
              </span>
            </Tooltip>
          )}
        </div>
        <p className="grow">
          Actual:{" "}
          <span className={`font-bold ${actualProductionRateTextColorClass}`}>
            {displayNum(actualProductionRate)}
          </span>
          /min
          <span className={`font-bold ${actualProductionRateTextColorClass}`}>
            {productionRateDiffStr}
          </span>
        </p>
        <Tooltip title="Remove product">
          <span>
            <Clickable onClick={removeSelf} className="p-1">
              <DeleteIcon />
            </Clickable>
          </span>
        </Tooltip>
      </Clickable>
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
              />
              {recipeList.length !== 1 ||
              assemblyLine.recipe.isFactoryRecipe ||
              props.productionLine.assemblyLines.length > 1 ? (
                <Tooltip title="Remove recipe">
                  <span>
                    <Clickable
                      onClick={() => removeAssemblyLine(assemblyLine.recipe)}
                      className="p-1"
                    >
                      <DeleteIcon />
                    </Clickable>
                  </span>
                </Tooltip>
              ) : (
                <div className="w-[1.5rem]"></div>
              )}
            </div>
          );
        })}
        {hasMoreRecipes && !needMoreProduction && !showRecipes && (
          <div className="flex flex-row items-center gap-x-2">
            <Clickable
              onClick={splitRecipes}
              className="flex flex-row items-center p-1"
            >
              <AddIcon />
              Add Recipe
            </Clickable>
            <Clickable
              onClick={() => setShowFactoryPicker(true)}
              className="flex flex-row items-center p-1"
            >
              <AddIcon />
              Use Factory as Recipe
            </Clickable>
            <Clickable
              onClick={() => setShowSupplyPicker(true)}
              className="flex flex-row items-center p-1"
            >
              <AddIcon />
              Supply from Factory
            </Clickable>
          </div>
        )}
        {!hasMoreRecipes && !needMoreProduction && !showRecipes && (
          <div className="flex flex-row items-center gap-x-2">
            <Clickable
              onClick={() => setShowFactoryPicker(true)}
              className="flex flex-row items-center p-1"
            >
              <AddIcon />
              Use Factory as Recipe
            </Clickable>
            <Clickable
              onClick={() => setShowSupplyPicker(true)}
              className="flex flex-row items-center p-1"
            >
              <AddIcon />
              Supply from Factory
            </Clickable>
          </div>
        )}
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
              <div
                key={sf.id}
                className={`sp-recipe-component flex flex-row grow items-center gap-x-2 p-2 ${clickableClass}${clickableHoverClass}`}
                onClick={() => addFactoryAssemblyLine(sf.id, sf.name, f)}
              >
                {sf.icon ? (
                  <Image src={sf.icon} alt={sf.name} width={64} height={64} />
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
              </div>
            );
          })}
      </div>
    </div>
  );
}
