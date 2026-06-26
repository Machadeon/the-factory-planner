"use client";

import { displayNum } from "../utils";
import { recipeLookup } from "../models/library";
import { useState } from "react";
import AssemblyLine from "./AssemblyLineComponent";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Clickable from "./Clickable";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Image from "next/image";
import RecipeComponent from "./RecipeComponent";
import TextField from "@mui/material/TextField";
import type Factory from "../models/factory";
import type ProductLine from "../models/product-line";
import type Recipe from "../models/recipe";

interface ProductLineComponentProps {
  productLine: ProductLine;
  factory: Factory;
}

export default function ProductLineComponent(props: ProductLineComponentProps) {
  const [productLine, setProductLine] = useState<ProductLine>(
    props.productLine,
  );
  const [expanded, setExpanded] = useState(true);

  function updateProductLine() {
    if (props.productLine.assemblyLines.length === 1) {
      // if something changed and there is only one line, then set the line rate to the product rate
      const assemblyLine = props.productLine.assemblyLines[0];
      props.productLine.assemblyLines[0] = {
        part: assemblyLine.part,
        recipe: assemblyLine.recipe,
        productionRate: props.productLine.productionRate
      }
    }

    setProductLine({
      productionRate: props.productLine.productionRate,
      part: props.productLine.part,
      isFactoryOutput: props.productLine.isFactoryOutput,
      assemblyLines: props.productLine.assemblyLines,
    });
  }

  function updateProductionRate(e: React.ChangeEvent<HTMLInputElement>) {
    props.productLine.productionRate = Number(e.target.value);
    updateProductLine();
  }

  const actualProductionRate = productLine.assemblyLines.reduce(
    (acc, assemblyLine) => acc + assemblyLine.productionRate,
    0,
  );

  function addAssemblyLine(recipe: Recipe) {
    props.productLine.assemblyLines.push({
      part: productLine.part,
      recipe: recipe,
      productionRate: productLine.productionRate - actualProductionRate,
    });
    updateProductLine();
  }

  function removeAssemblyLine(recipe: Recipe) {
    const index = productLine.assemblyLines
      .map((al) => al.recipe.slug)
      .indexOf(recipe.slug);
    props.productLine.assemblyLines.splice(index, 1);
    updateProductLine();
  }

  var actualProductionRateTextColorClass;
  if (actualProductionRate === productLine.productionRate) {
    actualProductionRateTextColorClass = "text-green-500";
  } else if (actualProductionRate > productLine.productionRate) {
    actualProductionRateTextColorClass = "text-amber-500";
  } else if (actualProductionRate < productLine.productionRate) {
    actualProductionRateTextColorClass = "text-red-500";
  }

  return (
    <div className="flex flex-col gap-y-2">
      <Clickable
        className="flex flex-row items-center gap-x-2 px-4 py-2"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
        <div className="flex flex-row items-center gap-2 w-sm flex-none">
          <Image
            src={productLine.part.iconSmall}
            alt={productLine.part.name}
            width={64}
            height={64}
          />
          <span className="text-xl">{productLine.part.name}</span>
        </div>
        <div className="flex flex-row items-center w-xs flex-none justify-end">
          <TextField
            variant="outlined"
            size="small"
            label="Target"
            className="w-24"
            value={productLine.productionRate}
            onChange={updateProductionRate}
            onClick={(e) => e.stopPropagation()}
            slotProps={{
              htmlInput: {
                sx: {
                  textAlign: "right",
                },
              },
            }}
          />
          /min
        </div>
        <p>
          Actual:{" "}
          <span className={`font-bold ${actualProductionRateTextColorClass}`}>
            {displayNum(actualProductionRate)}
          </span>
          /min
        </p>
      </Clickable>
      {expanded && (
        <div className="flex flex-col pl-16">
          {productLine.assemblyLines.map((assemblyLine) => (
            <div
              key={`${assemblyLine.recipe.slug}-${assemblyLine.productionRate}`}
              className="flex flex-row items-center"
            >
              <AssemblyLine
                assemblyLine={assemblyLine}
                factory={props.factory}
              />
              <Clickable
                onClick={() => removeAssemblyLine(assemblyLine.recipe)}
              >
                <DeleteIcon />
              </Clickable>
            </div>
          ))}
          {(productLine.assemblyLines.length === 0 ||
            actualProductionRate < productLine.productionRate) &&
            recipeLookup[productLine.part.slug].map((recipe) => {
              if (
                productLine.assemblyLines.find(
                  (assemblyLine) => assemblyLine.recipe.slug === recipe.slug,
                )
              ) {
                return "";
              }

              return (
                <RecipeComponent
                  recipe={recipe}
                  productionRate={
                    productLine.productionRate - actualProductionRate
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
