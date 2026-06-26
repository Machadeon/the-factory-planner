"use client";

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LinkIcon from "@mui/icons-material/Link";
import TextField from "@mui/material/TextField";
import Image from "next/image";
import { type MouseEvent, useState } from "react";
import type Factory from "../models/factory";
import { recipeLookup } from "../models/library";
import type ProductionLine from "../models/production-line";
import type Recipe from "../models/recipe";
import { displayNum, getColorClassForProductionRate1 } from "../utils";
import AssemblyLine from "./AssemblyLineComponent";
import Clickable from "./Clickable";
import RecipeComponent from "./RecipeComponent";
import TextCalculatorField from "./TextCalculatorField";

interface ProductionLineComponentProps {
  productionLine: ProductionLine;
  factory: Factory;
  onDeleteClicked: () => void;
}

export default function ProductionLineComponent(
  props: ProductionLineComponentProps,
) {
  const [expanded, setExpanded] = useState(
    props.productionLine.assemblyLines.length !== 1 ||
      !props.productionLine.autoCreated,
  );
  const part = props.productionLine.part;
  const recipeList = recipeLookup[part.slug];

  function getProductionRateForRecipe(recipe: Recipe): number {
    const partRate = props.productionLine.rate - actualProductionRate;
    return partRate / recipe.productLookup[part.slug];
  }

  function updateProductionLine() {
    if (props.productionLine.assemblyLines.length === 1) {
      // if something changed and there is only one line, then set the line rate to the product rate
      const assemblyLine = props.productionLine.assemblyLines[0];
      assemblyLine.rate = props.productionLine.rate / assemblyLine.recipe.productLookup[part.slug];
    }

    props.factory.setPartRate(
      part,
      props.productionLine.rate,
    );
  }

  function updateProductionRate(newValue: number) {
    props.productionLine.rate = newValue;
    updateProductionLine();
  }

  const actualProductionRate = props.productionLine.assemblyLines.reduce(
    (acc, assemblyLine) => acc + assemblyLine.rate * assemblyLine.recipe.productLookup[part.slug],
    0,
  );

  function addAssemblyLine(recipe: Recipe) {
    props.productionLine.assemblyLines.push({
      part: part,
      recipe: recipe,
      rate: getProductionRateForRecipe(recipe),
    });
    updateProductionLine();
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

  const productionRateDiff = actualProductionRate - props.productionLine.rate;
  const actualProductionRateTextColorClass = getColorClassForProductionRate1(productionRateDiff);
  var productionRateDiffStr;
  if (actualProductionRateTextColorClass === "text-amber-500") {
    productionRateDiffStr = ` (+${displayNum(productionRateDiff)})`;
  } else if (actualProductionRateTextColorClass === "text-red-500") {
    productionRateDiffStr = ` (${displayNum(productionRateDiff)})`;
  } else {
    productionRateDiffStr = "";
  }

  return (
    <div className="flex flex-col gap-y-2 grow">
      <Clickable
        className="flex flex-row items-center gap-x-2 px-4 py-2"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
        <div className="flex flex-row items-center gap-2 w-sm flex-none">
          <Image
            src={part.iconSmall}
            alt={part.name}
            width={64}
            height={64}
          />
          <span className="text-xl">{part.name}</span>
        </div>
        <div className="flex flex-row items-center w-3xs flex-none justify-end">
          <Clickable onClick={toggleAutoCalculateRate} className="m-1 mr-2">
            {props.productionLine.autoCalculateRate ? (
              <EditIcon />
            ) : (
              <LinkIcon />
            )}
          </Clickable>
          {props.productionLine.autoCalculateRate ? (
            <TextField
              variant="outlined"
              size="small"
              label="Target"
              className="w-24"
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
              label="Target"
              className="w-24"
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
          /min
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
        <Clickable onClick={removeSelf}>
          <DeleteIcon />
        </Clickable>
      </Clickable>
      {expanded && (
        <div className="flex flex-col pl-16 pr-4">
          {props.productionLine.assemblyLines.map((assemblyLine) => (
            <div
              key={`${assemblyLine.recipe.slug}-${assemblyLine.rate}`}
              className="flex flex-row items-center"
            >
              <AssemblyLine
                assemblyLine={assemblyLine}
                factory={props.factory}
              />
              {recipeList.length !== 1 ? (
                <Clickable
                  onClick={() => removeAssemblyLine(assemblyLine.recipe)}
                >
                  <DeleteIcon />
                </Clickable>
              ) : (
                <div className="w-[1.5rem]"></div>
              )}
            </div>
          ))}
          {(props.productionLine.assemblyLines.length === 0 ||
            Math.abs(actualProductionRate - props.productionLine.rate) > 0.0001) &&
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
                  productionRate={
                    props.productionLine.rate - actualProductionRate
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
