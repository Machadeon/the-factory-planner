"use client";

import AddIcon from "@mui/icons-material/Add";
import EastIcon from "@mui/icons-material/East";
import EditIcon from "@mui/icons-material/Edit";
import type { ReactNode } from "react";
import { type MouseEventHandler, useState } from "react";
import { displayNum, formatRate } from "@/app/lib/format";
import type Factory from "../../models/factory";
import type Part from "../../models/part";
import type RecipeModel from "../../models/recipe";
import type { RecipePart } from "../../models/recipe";
import ActionRow from "../ui/ActionRow";
import Icon from "../ui/Icon";
import IconButton from "../ui/IconButton";
import TextCalculatorField from "../ui/TextCalculatorField";

interface RecipeProps {
  recipe: RecipeModel;
  rate: number;
  factory?: Factory;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  partRateEditable?: boolean;
  setPartRate?: (
    recipePart: RecipePart,
    isProduct: boolean,
    newValue: number,
  ) => void;
  partsNeeded?: string[];
  sloopMultiplier?: number;
  belowRecipeName?: ReactNode;
}

export default function Recipe({
  recipe,
  rate,
  factory,
  onClick,
  partRateEditable,
  setPartRate,
  partsNeeded,
  sloopMultiplier,
  belowRecipeName,
}: RecipeProps) {
  const [manualRatePart, setManualRatePart] = useState<string | undefined>();

  const className =
    "sp-recipe-component flex flex-row grow items-center gap-x-2 p-2";

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

  const mult = sloopMultiplier ?? 1;
  const isSlooped = mult > 1;
  const rateClassName = rate <= 0 ? "font-bold text-amber-500" : "";
  const outputRateClassName =
    rate <= 0 ? rateClassName : isSlooped ? "font-bold text-pink-600" : "";

  const content = (
    <>
      <Icon
        src={recipe.building.iconLarge}
        label={recipe.building.name}
        size={64}
      />
      <div className="w-3xs flex flex-col gap-y-1">
        <span>{recipe.name}</span>
        {belowRecipeName}
      </div>
      <div className="w-2xs grid grid-cols-[40px_40px_auto_max-content] gap-x-1 items-center">
        {recipe.ingredients.flatMap((ing) => [
          <span className="text-right" key={`ing-${ing.part.slug}-quantity`}>
            {displayNum(ing.quantity)}x
          </span>,
          <Icon
            src={ing.part.iconSmall}
            label={ing.part.name}
            size={32}
            className="m-1"
            key={`ing-${ing.part.slug}-image`}
          />,
          <div
            className="grow text-right"
            key={`ing-${ing.part.slug}-controls`}
          >
            {partsNeeded && partsNeeded.indexOf(ing.part.slug) >= 0 && (
              <IconButton
                aria-label="Add production line"
                tooltipEnterDelay={500}
                onClick={() => addProductionLine(ing.part)}
                className="sp-recipe-ingredient-edit-btn inline p-1 mr-1"
              >
                <AddIcon />
              </IconButton>
            )}
            {partRateEditable && (
              <IconButton
                aria-label="Override rate"
                tooltipEnterDelay={500}
                onClick={() => setManualRatePart(`ing-${ing.part.slug}`)}
                className="sp-recipe-ingredient-edit-btn inline p-1 mr-1"
              >
                <EditIcon />
              </IconButton>
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
          <span
            className="text-right whitespace-nowrap"
            key={`prod-${prod.part.slug}-quantity`}
          >
            {prod.part.slug === "power"
              ? `${displayNum(prod.quantity)} MW`
              : `${displayNum(prod.quantity)}x`}
          </span>,
          <Icon
            src={prod.part.iconSmall}
            label={prod.part.name}
            size={32}
            key={`prod-${prod.part.slug}-image`}
          />,
          <div
            className="grow text-right"
            key={`prod-${prod.part.slug}-controls`}
          >
            {partRateEditable && (
              <IconButton
                aria-label="Override rate"
                tooltipEnterDelay={500}
                onClick={() => setManualRatePart(`prod-${prod.part.slug}`)}
                className="sp-recipe-ingredient-edit-btn inline p-1 mr-1"
              >
                <EditIcon />
              </IconButton>
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
                value={prod.quantity * rate * mult}
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
              {formatRate(prod.part, prod.quantity * rate * mult)}
            </div>
          ),
        ])}
      </div>
    </>
  );

  return onClick ? (
    <ActionRow className={className} onClick={onClick}>
      {content}
    </ActionRow>
  ) : (
    <div className={className}>{content}</div>
  );
}
