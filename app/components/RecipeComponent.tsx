"use client";

import AddIcon from "@mui/icons-material/Add";
import EastIcon from "@mui/icons-material/East";
import EditIcon from "@mui/icons-material/Edit";
import { pink } from "@mui/material/colors";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { alpha, styled } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import Image from "next/image";
import { type MouseEventHandler, useState } from "react";
import type Factory from "../models/factory";
import type Part from "../models/part";
import type Recipe from "../models/recipe";
import type { RecipePart } from "../models/recipe";
import { displayNum } from "../utils";
import Clickable, {
  defaultClass as clickableClass,
  defaultHoverClass as clickableHoverClass,
} from "./Clickable";
import TextCalculatorField from "./TextCalculatorField";

const PinkSwitch = styled(Switch)(({ theme }) => ({
  "& .MuiSwitch-switchBase.Mui-checked": {
    color: pink[600],
    "&:hover": {
      backgroundColor: alpha(pink[600], theme.palette.action.hoverOpacity),
    },
  },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
    backgroundColor: pink[600],
  },
}));

interface RecipeComponentProps {
  recipe: Recipe;
  rate: number;
  factory?: Factory;
  onClick?: MouseEventHandler<HTMLDivElement>;
  partRateEditable?: boolean;
  setPartRate?: (
    recipePart: RecipePart,
    isProduct: boolean,
    newValue: number,
  ) => void;
  partsNeeded?: string[];
  slooped?: boolean;
  onSloopChange?: (shouldSloop: boolean) => void;
}

export default function RecipeComponent({
  recipe,
  rate,
  factory,
  onClick,
  partRateEditable,
  setPartRate,
  partsNeeded,
  slooped,
  onSloopChange,
}: RecipeComponentProps) {
  const [manualRatePart, setManualRatePart] = useState<string | undefined>();

  var className =
    "sp-recipe-component flex flex-row grow items-center gap-x-2 p-2";
  if (onClick) className += ` ${clickableClass}${clickableHoverClass}`;

  function setPartRateInternal(
    recipePart: RecipePart,
    isProduct: boolean,
    newValue: number,
  ) {
    if (partRateEditable && setPartRate)
      setPartRate(recipePart, isProduct, newValue);
    setManualRatePart(undefined);
  }

  function addProductionLine(part: Part) {
    if (factory) factory.addProductionLine(part);
  }

  const rateClassName = rate <= 0 ? "font-bold text-amber-500" : "";
  const outputRateClassName =
    rate <= 0 ? rateClassName : slooped ? "font-bold text-pink-600" : "";

  function toggleSlooping(shouldSloop: boolean) {
    if (onSloopChange) onSloopChange(shouldSloop);
  }

  return (
    <div className={className} onClick={onClick}>
      <Tooltip enterDelay={500} title={recipe.building.name}>
        <Image
          src={recipe.building.iconLarge}
          alt={recipe.building.name}
          width={64}
          height={64}
        />
      </Tooltip>
      <span className="w-3xs">{recipe.name}</span>
      <div className="w-2xs grid grid-cols-[40px_40px_auto_max-content] gap-x-1 items-center">
        {recipe.ingredients.flatMap((ing) => [
          <span className="text-right" key={`ing-${ing.part.slug}-quantity`}>
            {ing.quantity}x
          </span>,
          <Tooltip
            enterDelay={500}
            title={ing.part.name}
            key={`ing-${ing.part.slug}-image`}
          >
            <Image
              src={ing.part.iconSmall}
              alt={ing.part.name}
              width={32}
              height={32}
              className="m-1"
            />
          </Tooltip>,
          <div
            className="grow text-right"
            key={`ing-${ing.part.slug}-controls`}
          >
            {partsNeeded && partsNeeded.indexOf(ing.part.slug) >= 0 && (
              <Tooltip enterDelay={500} title="Add production line">
                <span>
                  <Clickable
                    onClick={() => addProductionLine(ing.part)}
                    className="sp-recipe-ingredient-edit-btn inline p-1 mr-1"
                  >
                    <AddIcon />
                  </Clickable>
                </span>
              </Tooltip>
            )}
            {partRateEditable && (
              <Tooltip enterDelay={500} title="Override rate">
                <span>
                  <Clickable
                    onClick={() => setManualRatePart(`ing-${ing.part.slug}`)}
                    className="sp-recipe-ingredient-edit-btn inline p-1 mr-1"
                  >
                    <EditIcon />
                  </Clickable>
                </span>
              </Tooltip>
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
                onCalculate={(newValue) =>
                  setPartRateInternal(ing, false, newValue)
                }
              />
              /min
            </div>
          ) : (
            <div
              className={`text-right ${rateClassName}`}
              key={`ing-${ing.part.slug}-rate`}
            >
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
          <Tooltip
            enterDelay={500}
            title={prod.part.name}
            key={`prod-${prod.part.slug}-image`}
          >
            <Image
              src={prod.part.iconSmall}
              alt={prod.part.name}
              width={32}
              height={32}
            />
          </Tooltip>,
          <div
            className="grow text-right"
            key={`prod-${prod.part.slug}-controls`}
          >
            {partRateEditable && (
              <Tooltip enterDelay={500} title="Override rate">
                <span>
                  <Clickable
                    onClick={() => setManualRatePart(`prod-${prod.part.slug}`)}
                    className="sp-recipe-ingredient-edit-btn inline p-1 mr-1"
                  >
                    <EditIcon />
                  </Clickable>
                </span>
              </Tooltip>
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
                value={prod.quantity * rate * (slooped ? 2 : 1)}
                slotProps={{
                  htmlInput: { className: "text-right" },
                }}
                onCalculate={(newValue) =>
                  setPartRateInternal(prod, true, newValue)
                }
              />
              /min
            </div>
          ) : (
            <div
              className={`text-right ${outputRateClassName}`}
              key={`prod-${prod.part.slug}-rate`}
            >
              {displayNum(prod.quantity * rate * (slooped ? 2 : 1))}/min
            </div>
          ),
        ])}
      </div>
      {onSloopChange && (
        <div className="ms-4">
          <Tooltip enterDelay={500} title="Boost production with Somersloops">
            <FormControlLabel
              control={
                <PinkSwitch
                  checked={slooped}
                  onChange={(e) => toggleSlooping(e.target.checked)}
                />
              }
              label={
                <Image
                  src="/images/items/research-alien-productionbooster-c_64.png"
                  alt="somersloop"
                  width={48}
                  height={48}
                />
              }
              labelPlacement="start"
            />
          </Tooltip>
        </div>
      )}
    </div>
  );
}
