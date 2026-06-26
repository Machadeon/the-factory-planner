"use client";

import AddIcon from "@mui/icons-material/Add";
import EastIcon from "@mui/icons-material/East";
import EditIcon from "@mui/icons-material/Edit";
import Image from "next/image";
import { type MouseEventHandler, useState } from "react";
import type Factory from "../models/factory";
import type Part from "../models/part";
import type Recipe from "../models/recipe";
import type { RecipePart } from "../models/recipe";
import { displayNum } from "../utils";
import Clickable, { defaultClass as clickableClass, defaultHoverClass as clickableHoverClass } from "./Clickable";
import TextCalculatorField from "./TextCalculatorField";

interface RecipeComponentProps {
  recipe: Recipe;
  rate: number;
  factory?: Factory;
  onClick?: MouseEventHandler<HTMLDivElement>;
  partRateEditable?: boolean;
  setPartRate?: (recipePart: RecipePart, newValue: number) => void;
  partsNeeded?: string[];
}

export default function RecipeComponent({
  recipe,
  rate,
  factory,
  onClick,
  partRateEditable,
  setPartRate,
  partsNeeded,
}: RecipeComponentProps) {
  const [manualRatePart, setManualRatePart] = useState<string | undefined>();

  var className =
    "sp-recipe-component flex flex-row grow items-center gap-x-2 p-2";
  if (onClick) className += ` ${clickableClass}${clickableHoverClass}`;

  function setPartRateInternal(recipePart: RecipePart, newValue: number) {
    if (partRateEditable && setPartRate) setPartRate(recipePart, newValue);
    setManualRatePart(undefined);
  }

  function addProductionLine(part: Part) {
    if (factory) factory.addProductionLine(part);
  }

  const rateClassName = rate < 0 ? "font-bold text-amber-500" : "";

  return (
    <div className={className} onClick={onClick}>
      <Image
        src={recipe.building.iconLarge}
        alt={recipe.building.name}
        width={64}
        height={64}
      />
      <span className="w-3xs">{recipe.name}</span>
      <div className="w-2xs grid grid-cols-[40px_40px_auto_max-content] gap-x-1 items-center">
        {recipe.ingredients.flatMap((ing) => [
          <span className="text-right" key={`ing-${ing.part.slug}-quantity`}>
            {ing.quantity}x
          </span>,
          <Image
            src={ing.part.iconSmall}
            alt={ing.part.name}
            width={32}
            height={32}
            key={`ing-${ing.part.slug}-image`}
            className="m-1"
          />,
          <div
            className="grow text-right"
            key={`ing-${ing.part.slug}-controls`}
          >
            {partsNeeded && partsNeeded.indexOf(ing.part.slug) >= 0 && (
              <Clickable
                onClick={() => addProductionLine(ing.part)}
                className="sp-recipe-ingredient-edit-btn inline p-1 mr-1"
              >
                <AddIcon />
              </Clickable>
            )}
            {partRateEditable && (
              <Clickable
                onClick={() => setManualRatePart(`ing-${ing.part.slug}`)}
                className="sp-recipe-ingredient-edit-btn inline p-1 mr-1"
              >
                <EditIcon />
              </Clickable>
            )}
          </div>,
          manualRatePart === `ing-${ing.part.slug}` && partRateEditable ? (
            <div
              className="flex items-center justify-end"
              key={`ing-${ing.part.slug}-rate`}
            >
              <TextCalculatorField
                variant="outlined"
                size="small"
                className="w-24"
                autoFocus
                value={ing.quantity * rate}
                onCalculate={(newValue) => setPartRateInternal(ing, newValue)}
              />
              /min
            </div>
          ) : (
            <div className={`text-right ${rateClassName}`} key={`ing-${ing.part.slug}-rate`}>
              {displayNum(ing.quantity * rate)}/min
            </div>
          ),
        ])}
      </div>
      <EastIcon />
      <div className="w-3xs grid grid-cols-[40px_40px_auto_max-content] gap-x-1 items-center">
        {recipe.products.flatMap((prod) => [
          <span className="text-right" key={`prod-${prod.part.slug}-quantity`}>
            {prod.quantity}x
          </span>,
          <Image
            src={prod.part.iconSmall}
            alt={prod.part.name}
            width={32}
            height={32}
            key={`prod-${prod.part.slug}-image`}
          />,
          <div
            className="grow text-right"
            key={`prod-${prod.part.slug}-controls`}
          >
            {partRateEditable && (
              <Clickable
                onClick={() => setManualRatePart(`prod-${prod.part.slug}`)}
                className="sp-recipe-ingredient-edit-btn inline p-1 mr-1"
              >
                <EditIcon />
              </Clickable>
            )}
          </div>,
          manualRatePart === `prod-${prod.part.slug}` && partRateEditable ? (
            <div
              className="flex items-center justify-end"
              key={`prod-${prod.part.slug}-rate`}
            >
              <TextCalculatorField
                variant="outlined"
                size="small"
                className="w-24"
                autoFocus
                value={prod.quantity * rate}
                slotProps={{
                  htmlInput: {
                    sx: {
                      textAlign: "right",
                    },
                  },
                }}
                onCalculate={(newValue) => setPartRateInternal(prod, newValue)}
              />
              /min
            </div>
          ) : (
            <div className={`text-right ${rateClassName}`} key={`prod-${prod.part.slug}-rate`}>
              {displayNum(prod.quantity * rate)}/min
            </div>
          ),
        ])}
      </div>
    </div>
  );
}
