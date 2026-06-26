"use client";

import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LinkIcon from "@mui/icons-material/Link";
import TextField from "@mui/material/TextField";
import Image from "next/image";
import { type MouseEvent, useState, useEffect } from "react";
import type Factory from "../models/factory";
import { recipeLookup } from "../models/library";
import type ProductionLine from "../models/production-line";
import type Recipe from "../models/recipe";
import { displayNum, getColorClassForProductionRate1 } from "../utils";
import AssemblyLine from "./AssemblyLineComponent";
import Clickable, { ClickableStyle } from "./Clickable";
import RecipeComponent from "./RecipeComponent";
import TextCalculatorField from "./TextCalculatorField";
import Tooltip from "@mui/material/Tooltip";

interface ProductionLineComponentProps {
  productionLine: ProductionLine;
  factory: Factory;
  onDeleteClicked: () => void;
}

export default function ProductionLineComponent(
  props: ProductionLineComponentProps,
) {
  const part = props.productionLine.part;
  const recipeList = recipeLookup[part.slug];
  const actualProductionRate = props.productionLine.assemblyLines.reduce(
    (acc, assemblyLine) =>
      acc + assemblyLine.rate * assemblyLine.recipe.productLookup[part.slug],
    0,
  );

  const productionRateDiff = actualProductionRate - props.productionLine.rate;
  const needMoreProduction =
    props.productionLine.assemblyLines.length === 0 ||
    Math.abs(productionRateDiff) > 0.0001;
  const hasMoreRecipes =
    props.productionLine.assemblyLines.length <
    recipeLookup[props.productionLine.part.slug].length;

  const [expanded, setExpanded] = useState<boolean>(
    props.productionLine.assemblyLines.length !== 1 ||
      !props.productionLine.autoCreated,
  );
  const [showRecipes, setShowRecipes] = useState<boolean>(false);

  function getProductionRateForRecipe(recipe: Recipe): number {
    const partRate = props.productionLine.rate - actualProductionRate;
    return partRate / recipe.productLookup[part.slug];
  }

  function updateProductionLine() {
    if (props.productionLine.assemblyLines.length === 1) {
      // if something changed and there is only one line, then set the line rate to the product rate
      const assemblyLine = props.productionLine.assemblyLines[0];
      assemblyLine.rate =
        props.productionLine.rate /
        assemblyLine.recipe.productLookup[part.slug];
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
    props.productionLine.assemblyLines.push({
      part: part,
      recipe: recipe,
      rate: getProductionRateForRecipe(recipe),
    });
    updateProductionLine();
    setShowRecipes(false);
  }

  function removeAssemblyLine(recipe: Recipe) {
    const index = props.productionLine.assemblyLines
      .map((assemblyLine) => assemblyLine.recipe.slug)
      .indexOf(recipe.slug);
    props.productionLine.assemblyLines.splice(index, 1);
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
    for (const assemblyLine of props.productionLine.assemblyLines) {
      assemblyLine.rate *= currentRecipeCount / (currentRecipeCount + 1);
    }
    setShowRecipes(true);
  }

  const actualProductionRateTextColorClass =
    getColorClassForProductionRate1(productionRateDiff);
  var productionRateDiffStr;
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
  }, [needMoreProduction, setShowRecipes]);

  return (
    <div className="flex flex-col gap-y-2 grow">
      <Clickable
        className="flex flex-row items-center gap-x-2 px-4 py-2"
        style={mainStyle}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
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
              htmlInput: {
                sx: {
                  textAlign: "right",
                },
              },
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
      {expanded && (
        <div className="flex flex-col pl-12">
          {props.productionLine.assemblyLines.map((assemblyLine) => {
            return (
              <div
                key={`${assemblyLine.recipe.slug}-${assemblyLine.rate}`}
                className="flex flex-row items-center pe-4"
              >
                <AssemblyLine
                  assemblyLine={assemblyLine}
                  factory={props.factory}
                />
                {recipeList.length !== 1 ? (
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
            <div>
              <Clickable onClick={splitRecipes} className="flex flex-row items-center">
                <AddIcon />
                Add Recipe
              </Clickable>
            </div>
          )}
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
                    (recipe.getProduct(props.productionLine.part)?.quantity ??
                      1)
                  }
                  onClick={() => addAssemblyLine(recipe)}
                  key={recipe.slug}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}
